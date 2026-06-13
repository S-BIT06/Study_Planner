import type {
  DayAvailability,
  DayName,
  EnergyLevel,
  FeasibilityResult,
  FocusPeriod,
  RescheduleChange,
  RescheduleResult,
  StudyPlan,
  StudyTask,
  SyllabusTopic,
  TimeBlock,
  TimeBlockCategory,
  UserProfile
} from '../types';
import { blockDuration, blocksOverlap, isStudyCategory, sortBlocks, timeToMinutes } from '../utils/timeMap';

const DAY_NAMES: DayName[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MINIMUM_SEGMENT_MINUTES = 15;
const FLEXIBLE_RESERVE_RATIO = 0.35;

interface SlotBucket {
  date: string;
  startTime: string;
  startMinutes: number;
  capacityMinutes: number;
  cursorMinutes: number;
  category: TimeBlockCategory;
  energyLevel: EnergyLevel;
  locked: boolean;
}

interface WorkItem {
  id: string;
  topicId?: string;
  title: string;
  subject: string;
  taskType: StudyTask['taskType'];
  minutes: number;
  priority: number;
  energyNeed: EnergyLevel;
  generatedKind: StudyTask['generatedKind'];
  sourceTaskId?: string;
  locked?: boolean;
}

export function dateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function minutesToTime(startTime: string, offset: number): string {
  const total = timeToMinutes(startTime) + offset;
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function dateIsBefore(a: string, b: string): boolean {
  return a < b;
}

function availabilityForDate(profile: UserProfile, date: Date): DayAvailability | undefined {
  const iso = dateOnly(date);
  const exception = profile.dateExceptions?.find((item) => item.date === iso);
  if (exception) return { day: DAY_NAMES[date.getDay()], blocks: exception.blocks };
  const dayName = DAY_NAMES[date.getDay()];
  return profile.availability.find((item) => item.day === dayName);
}

function categoryRank(category: TimeBlockCategory): number {
  switch (category) {
    case 'PREFERRED_STUDY': return 5;
    case 'AVAILABLE': return 4;
    case 'LIGHT_STUDY': return 3;
    case 'FLEXIBLE': return 1;
    default: return 0;
  }
}

function energyRank(energy: EnergyLevel): number {
  return energy === 'HIGH' ? 3 : energy === 'NORMAL' ? 2 : 1;
}

function focusPeriodForMinutes(minutes: number): FocusPeriod {
  if (minutes < 12 * 60) return 'Morning';
  if (minutes < 17 * 60) return 'Afternoon';
  return 'Evening';
}

function focusPeriodBonus(profileFocus: FocusPeriod, startMinutes: number, item: WorkItem): number {
  if (profileFocus === 'Flexible') return 0;
  const blockPeriod = focusPeriodForMinutes(startMinutes);
  if (blockPeriod !== profileFocus) return item.energyNeed === 'HIGH' ? -6 : -2;
  return item.energyNeed === 'HIGH' ? 14 : 6;
}

function rawStudyBlocksForDate(profile: UserProfile, date: Date): TimeBlock[] {
  const availability = availabilityForDate(profile, date);
  if (!availability) return [];
  return sortBlocks(availability.blocks)
    .filter((block) => isStudyCategory(block.category) && blockDuration(block) >= MINIMUM_SEGMENT_MINUTES);
}

function buildSlots(profile: UserProfile, startDate: string, examDate: string, includeExamDate = false): SlotBucket[] {
  const start = parseDate(startDate);
  const end = parseDate(examDate);
  const slots: SlotBucket[] = [];

  if (end < start) return slots;

  const lastDate = includeExamDate ? end : addDays(end, -1);
  for (let current = start; current <= lastDate; current = addDays(current, 1)) {
    let remainingDaily = Math.max(0, profile.maxDailyMinutes);
    if (remainingDaily < MINIMUM_SEGMENT_MINUTES) continue;

    const allStudyBlocks = rawStudyBlocksForDate(profile, current);
    const normalBlocks = allStudyBlocks
      .filter((block) => block.category !== 'FLEXIBLE')
      .sort((a, b) => {
        const preference = categoryRank(b.category) - categoryRank(a.category);
        if (preference !== 0) return preference;
        const energy = energyRank(b.energyLevel) - energyRank(a.energyLevel);
        if (energy !== 0) return energy;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });
    const flexibleBlocks = allStudyBlocks.filter((block) => block.category === 'FLEXIBLE');

    for (const block of normalBlocks) {
      if (remainingDaily < MINIMUM_SEGMENT_MINUTES) break;
      const usable = Math.min(blockDuration(block), remainingDaily);
      if (usable < MINIMUM_SEGMENT_MINUTES) continue;
      slots.push(makeSlot(current, block, usable));
      remainingDaily -= usable;
    }

    // Emergency/flexible windows are intentionally kept until normal capacity is consumed.
    for (const block of flexibleBlocks) {
      if (remainingDaily < MINIMUM_SEGMENT_MINUTES) break;
      const reservedUsable = Math.floor(blockDuration(block) * FLEXIBLE_RESERVE_RATIO);
      const usable = Math.min(blockDuration(block), Math.max(MINIMUM_SEGMENT_MINUTES, reservedUsable), remainingDaily);
      if (usable < MINIMUM_SEGMENT_MINUTES) continue;
      slots.push(makeSlot(current, block, usable));
      remainingDaily -= usable;
    }
  }

  return slots;
}

function makeSlot(date: Date, block: TimeBlock, usable: number): SlotBucket {
  return {
    date: dateOnly(date),
    startTime: block.startTime,
    startMinutes: timeToMinutes(block.startTime),
    capacityMinutes: usable,
    cursorMinutes: 0,
    category: block.category,
    energyLevel: block.energyLevel,
    locked: block.locked
  };
}

function topicPriority(topic: SyllabusTopic): number {
  const importance = topic.importance === 'Core' ? 9 : topic.importance === 'Important' ? 6 : 3;
  const difficulty = topic.difficulty === 'High' ? 6 : topic.difficulty === 'Medium' ? 4 : 2;
  const typeBonus = topic.type === 'Clinical' || topic.type === 'Practical' ? 2 : 0;
  const prerequisiteBonus = (topic.prerequisites?.length ?? 0) * 2;
  return importance + difficulty + typeBonus + prerequisiteBonus;
}

function topicEnergyNeed(topic: SyllabusTopic): EnergyLevel {
  if (topic.type === 'Journal' || topic.type === 'Activity') return 'LOW';
  if (topic.difficulty === 'High' || topic.importance === 'Core') return 'HIGH';
  return 'NORMAL';
}

function orderTopicsWithPrerequisites(topics: SyllabusTopic[]): SyllabusTopic[] {
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: SyllabusTopic[] = [];

  function visit(topic: SyllabusTopic) {
    if (visited.has(topic.id) || visiting.has(topic.id)) return;
    visiting.add(topic.id);
    topic.prerequisites?.forEach((id) => {
      const prerequisite = topicMap.get(id);
      if (prerequisite) visit(prerequisite);
    });
    visiting.delete(topic.id);
    visited.add(topic.id);
    ordered.push(topic);
  }

  [...topics].sort((a, b) => topicPriority(b) - topicPriority(a)).forEach(visit);
  return ordered;
}

function splitTopic(topic: SyllabusTopic, sessionMinutes: number): WorkItem[] {
  const items: WorkItem[] = [];
  let remaining = topic.estimatedMinutes;
  let part = 1;

  while (remaining > 0) {
    const minutes = Math.min(sessionMinutes, remaining);
    const suffix = topic.estimatedMinutes > sessionMinutes ? ` · Part ${part}` : '';
    items.push({
      id: `${topic.id}-study-${part}`,
      topicId: topic.id,
      title: `${topic.title}${suffix}`,
      subject: topic.subject,
      taskType: topic.type,
      minutes,
      priority: topicPriority(topic),
      energyNeed: topicEnergyNeed(topic),
      generatedKind: 'LEARNING'
    });
    remaining -= minutes;
    part += 1;
  }

  return items;
}

function revisionOffsetsForTopic(topic: SyllabusTopic): number[] {
  if (topic.importance === 'Core' || topic.difficulty === 'High') return [1, 3, 7, 14];
  if (topic.importance === 'Important') return [2, 7, 14];
  return [4, 14];
}

function buildRevisionItems(topics: SyllabusTopic[]): WorkItem[] {
  return topics.flatMap((topic) => revisionOffsetsForTopic(topic).map((offset, index) => ({
    id: `${topic.id}-revision-${index + 1}`,
    topicId: topic.id,
    title: `Revision ${index + 1}: ${topic.title}`,
    subject: topic.subject,
    taskType: 'Revision' as const,
    minutes: Math.max(20, Math.min(45, Math.round(topic.estimatedMinutes * 0.22))),
    priority: topicPriority(topic) + 2 - index,
    energyNeed: 'LOW' as const,
    generatedKind: 'REVISION' as const
  })));
}

function buildWorkItems(topics: SyllabusTopic[], profile: UserProfile): WorkItem[] {
  const orderedTopics = orderTopicsWithPrerequisites(topics);
  const learning = orderedTopics.flatMap((topic) => splitTopic(topic, profile.sessionMinutes));
  const revisions = buildRevisionItems(orderedTopics);

  const mock: WorkItem = {
    id: 'plan-mock-test',
    title: 'Timed mixed-syllabus self assessment',
    subject: 'All selected subjects',
    taskType: 'Mock Test',
    minutes: 90,
    priority: 20,
    energyNeed: 'HIGH',
    generatedKind: 'MOCK'
  };

  return [...learning, ...revisions, mock].sort((a, b) => {
    if (a.generatedKind !== b.generatedKind) {
      const order = { LEARNING: 0, REVISION: 1, MOCK: 2, RESCHEDULED: 1, MANUAL: 1 } as const;
      return order[a.generatedKind ?? 'LEARNING'] - order[b.generatedKind ?? 'LEARNING'];
    }
    return b.priority - a.priority;
  });
}

function createFeasibility(required: number, available: number, unscheduled: number): FeasibilityResult {
  const shortage = Math.max(0, required - available, unscheduled);
  const ratio = available === 0 ? Number.POSITIVE_INFINITY : required / available;
  const health = unscheduled > 0 || ratio > 1 ? 'IMPOSSIBLE' : ratio <= 0.82 ? 'FEASIBLE' : 'TIGHT';

  const message = health === 'FEASIBLE'
    ? 'The plan fits inside your marked study windows with breathing room.'
    : health === 'TIGHT'
      ? 'The plan fits, but little protected buffer remains.'
      : available === 0
        ? 'No usable study windows exist before the target date.'
        : `${minutesLabel(shortage)} of work cannot fit inside the current timetable.`;

  return {
    health,
    requiredMinutes: required,
    availableMinutes: available,
    shortageMinutes: shortage,
    unscheduledMinutes: unscheduled,
    message
  };
}

function slotSupports(slot: SlotBucket, item: WorkItem): boolean {
  if (slot.category === 'LIGHT_STUDY') return item.energyNeed === 'LOW';
  if (slot.category === 'FLEXIBLE') return item.priority >= 12 || item.generatedKind === 'RESCHEDULED';
  return true;
}

function slotScore(slot: SlotBucket, item: WorkItem, profile: UserProfile): number {
  let categoryScore = categoryRank(slot.category) * 10;
  if (item.energyNeed === 'LOW' && slot.category === 'LIGHT_STUDY') categoryScore += 22;
  if (item.energyNeed === 'LOW' && slot.category === 'PREFERRED_STUDY') categoryScore -= 10;
  if (item.energyNeed === 'HIGH' && slot.category === 'PREFERRED_STUDY') categoryScore += 22;
  if (slot.category === 'FLEXIBLE' && item.generatedKind !== 'RESCHEDULED') categoryScore -= 12;

  const exactEnergy = slot.energyLevel === item.energyNeed ? 18 : 0;
  const usefulExtraFocus = item.energyNeed !== 'LOW' && slot.energyLevel === 'HIGH' ? 9 : 0;
  const gentleWindow = item.energyNeed === 'LOW' && slot.energyLevel === 'LOW' ? 8 : 0;
  const mismatchPenalty = item.energyNeed === 'HIGH' && slot.energyLevel === 'LOW' ? -24 : 0;
  const lockBonus = slot.locked ? 3 : 0;
  const generalFocus = focusPeriodBonus(profile.focusPeriod, slot.startMinutes, item);
  return categoryScore + exactEnergy + usefulExtraFocus + gentleWindow + mismatchPenalty + lockBonus + generalFocus;
}

function availableInSlot(slot: SlotBucket, breakMinutes: number): number {
  const breakBefore = slot.cursorMinutes > 0 ? breakMinutes : 0;
  return Math.max(0, slot.capacityMinutes - slot.cursorMinutes - breakBefore);
}

function placeItems(
  planId: string,
  items: WorkItem[],
  slots: SlotBucket[],
  profile: UserProfile
): { tasks: StudyTask[]; unscheduledMinutes: number } {
  const tasks: StudyTask[] = [];
  let unscheduledMinutes = 0;

  for (const item of items) {
    let remaining = item.minutes;
    let segment = 1;

    while (remaining > 0) {
      const minimumChunk = Math.min(MINIMUM_SEGMENT_MINUTES, remaining);
      const candidates = slots.filter((slot) =>
        slotSupports(slot, item) && availableInSlot(slot, profile.breakMinutes) >= minimumChunk
      );

      if (candidates.length === 0) {
        unscheduledMinutes += remaining;
        break;
      }

      const earliestDate = candidates.reduce((earliest, slot) => slot.date < earliest ? slot.date : earliest, candidates[0].date);
      const sameDay = candidates
        .filter((slot) => slot.date === earliestDate)
        .sort((a, b) => {
          const score = slotScore(b, item, profile) - slotScore(a, item, profile);
          if (score !== 0) return score;
          return a.startMinutes - b.startMinutes;
        });
      const slot = sameDay[0];
      const breakBefore = slot.cursorMinutes > 0 ? profile.breakMinutes : 0;
      const available = availableInSlot(slot, profile.breakMinutes);
      const duration = Math.min(remaining, available);
      const split = item.minutes !== duration || segment > 1;
      const createdAt = new Date().toISOString();

      tasks.push({
        id: `${planId}-${item.id}-${slot.date}-${slot.startTime}-${segment}-${tasks.length}`,
        planId,
        topicId: item.topicId,
        title: split ? `${item.title} · Segment ${segment}` : item.title,
        subject: item.subject,
        taskType: item.taskType,
        date: slot.date,
        startTime: minutesToTime(slot.startTime, slot.cursorMinutes + breakBefore),
        durationMinutes: duration,
        status: 'PENDING',
        actualMinutes: 0,
        remainingMinutes: duration,
        completionPercent: 0,
        locked: Boolean(item.locked),
        generatedKind: item.generatedKind,
        attemptIds: [],
        sourceTaskId: item.sourceTaskId,
        createdAt,
        updatedAt: createdAt
      });

      slot.cursorMinutes += breakBefore + duration;
      remaining -= duration;
      segment += 1;
    }
  }

  return { tasks, unscheduledMinutes };
}

function subtractReservedTasks(slots: SlotBucket[], tasks: StudyTask[]): SlotBucket[] {
  let currentSlots = slots;

  for (const task of tasks) {
    const taskStart = timeToMinutes(task.startTime);
    const taskEnd = taskStart + task.durationMinutes;
    const nextSlots: SlotBucket[] = [];

    for (const slot of currentSlots) {
      if (slot.date !== task.date) {
        nextSlots.push(slot);
        continue;
      }

      const slotStart = slot.startMinutes;
      const slotEnd = slot.startMinutes + slot.capacityMinutes;
      const overlapStart = Math.max(slotStart, taskStart);
      const overlapEnd = Math.min(slotEnd, taskEnd);

      if (overlapEnd <= overlapStart) {
        nextSlots.push(slot);
        continue;
      }

      const before = overlapStart - slotStart;
      const after = slotEnd - overlapEnd;
      if (before >= MINIMUM_SEGMENT_MINUTES) nextSlots.push({ ...slot, capacityMinutes: before, cursorMinutes: 0 });
      if (after >= MINIMUM_SEGMENT_MINUTES) nextSlots.push({ ...slot, startTime: minutesToTime('00:00', overlapEnd), startMinutes: overlapEnd, capacityMinutes: after, cursorMinutes: 0 });
    }

    currentSlots = nextSlots;
  }

  return currentSlots;
}

function taskToWorkItem(task: StudyTask, index: number): WorkItem {
  return {
    id: `move-${index}-${task.topicId ?? task.taskType}`,
    topicId: task.topicId,
    title: task.title.replace(/ · Segment \d+$/, ''),
    subject: task.subject,
    taskType: task.taskType,
    minutes: Math.max(MINIMUM_SEGMENT_MINUTES, task.remainingMinutes ?? task.durationMinutes),
    priority: task.status === 'OVERDUE' ? 24 : task.taskType === 'Revision' ? 14 : task.taskType === 'Mock Test' ? 20 : 10,
    energyNeed: task.taskType === 'Revision' || task.taskType === 'Journal' || task.taskType === 'Activity'
      ? 'LOW'
      : task.taskType === 'Mock Test' ? 'HIGH' : 'NORMAL',
    generatedKind: 'RESCHEDULED',
    sourceTaskId: task.id,
    locked: task.locked
  };
}

export function generateStudyPlan(profile: UserProfile, topics: SyllabusTopic[], name: string, examDate: string): StudyPlan {
  const now = new Date();
  const startDate = dateOnly(now);
  const planId = `plan-${Date.now()}`;
  const slots = buildSlots(profile, startDate, examDate, false);
  const totalAvailable = slots.reduce((sum, slot) => sum + slot.capacityMinutes, 0);
  const workItems = buildWorkItems(topics, profile);
  const required = workItems.reduce((sum, item) => sum + item.minutes, 0);
  const placement = placeItems(planId, workItems, slots, profile);

  return {
    id: planId,
    name,
    examDate,
    startDate,
    topicIds: topics.map((topic) => topic.id),
    tasks: placement.tasks.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    feasibility: createFeasibility(required, totalAvailable, placement.unscheduledMinutes),
    createdAt: new Date().toISOString(),
    archived: false,
    paused: false,
    priority: 'NORMAL',
    history: [{ id: `event-${Date.now()}`, at: new Date().toISOString(), label: 'Plan created', detail: `${topics.length} syllabus topic(s) scheduled.` }]
  };
}

export function reschedulePlanWithChanges(profile: UserProfile, plan: StudyPlan): RescheduleResult {
  const today = dateOnly(new Date());
  const preserved = plan.tasks.filter((task) =>
    task.status === 'COMPLETED' || task.status === 'SKIPPED' || task.date < today || Boolean(task.locked)
  );
  const movable = plan.tasks.filter((task) =>
    task.status !== 'COMPLETED' && task.status !== 'SKIPPED' && task.date >= today && !task.locked
  );
  const preservedFuture = preserved.filter((task) => task.date >= today);

  const baseSlots = buildSlots(profile, today, plan.examDate, false);
  const slots = subtractReservedTasks(baseSlots, preservedFuture);
  const totalAvailable = slots.reduce((sum, slot) => sum + slot.capacityMinutes, 0);
  const items = movable.map(taskToWorkItem).sort((a, b) => b.priority - a.priority);
  const placement = placeItems(plan.id, items, slots, profile);
  const required = items.reduce((sum, item) => sum + item.minutes, 0);

  const bySource = new Map<string, StudyTask>();
  placement.tasks.forEach((task) => {
    if (task.sourceTaskId && !bySource.has(task.sourceTaskId)) bySource.set(task.sourceTaskId, task);
  });

  const changes: RescheduleChange[] = movable.flatMap((oldTask) => {
    const newTask = bySource.get(oldTask.id);
    if (!newTask) return [];
    if (newTask.date === oldTask.date && newTask.startTime === oldTask.startTime) return [];
    return [{
      taskId: oldTask.id,
      title: oldTask.title,
      oldDate: oldTask.date,
      oldStartTime: oldTask.startTime,
      newDate: newTask.date,
      newStartTime: newTask.startTime,
      reason: oldTask.status === 'OVERDUE' ? 'Overdue recovery' : 'Timetable or scheduler setting change'
    }];
  });

  const history = [
    ...(plan.history ?? []),
    { id: `event-${Date.now()}`, at: new Date().toISOString(), label: 'Plan rescheduled', detail: `${changes.length} session(s) moved. Locked/completed history preserved.` }
  ];

  return {
    plan: {
      ...plan,
      tasks: [...preserved, ...placement.tasks].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
      feasibility: createFeasibility(required, totalAvailable, placement.unscheduledMinutes),
      history
    },
    changes
  };
}

export function reschedulePlan(profile: UserProfile, plan: StudyPlan): StudyPlan {
  return reschedulePlanWithChanges(profile, plan).plan;
}

export function updateOverdueTasks(plan: StudyPlan): StudyPlan {
  const today = dateOnly(new Date());
  return {
    ...plan,
    tasks: plan.tasks.map((task) => task.date < today && task.status === 'PENDING'
      ? { ...task, status: 'OVERDUE' as const, updatedAt: new Date().toISOString() }
      : task
    )
  };
}

export function buildAdaptiveRevisionTask(planId: string, sourceTask: StudyTask, confidence: number): StudyTask | null {
  if (!sourceTask.topicId || confidence >= 5) return null;
  const days = confidence <= 1 ? 1 : confidence === 2 ? 2 : confidence === 3 ? 4 : 8;
  const scheduled = addDays(new Date(), days);
  const date = dateOnly(scheduled);
  const createdAt = new Date().toISOString();
  return {
    id: `${planId}-confidence-revision-${sourceTask.id}-${Date.now()}`,
    planId,
    topicId: sourceTask.topicId,
    title: `Confidence recovery: ${sourceTask.title.replace(/ · Segment \d+$/, '')}`,
    subject: sourceTask.subject,
    taskType: 'Revision',
    date,
    startTime: '21:00',
    durationMinutes: Math.max(20, Math.min(45, Math.round(sourceTask.durationMinutes * 0.5))),
    status: 'PENDING',
    confidence: confidence as StudyTask['confidence'],
    actualMinutes: 0,
    remainingMinutes: Math.max(20, Math.min(45, Math.round(sourceTask.durationMinutes * 0.5))),
    completionPercent: 0,
    locked: false,
    generatedKind: 'REVISION',
    attemptIds: [],
    sourceTaskId: sourceTask.id,
    createdAt,
    updatedAt: createdAt
  };
}

export function minutesLabel(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export function taskDateTime(task: StudyTask): string {
  return `${task.date} ${task.startTime}`;
}
