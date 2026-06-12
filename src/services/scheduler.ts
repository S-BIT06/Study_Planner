import type {
  DayAvailability,
  DayName,
  EnergyLevel,
  FeasibilityResult,
  StudyPlan,
  StudyTask,
  SyllabusTopic,
  TimeBlockCategory,
  UserProfile
} from '../types';
import { blockDuration, isStudyCategory, sortBlocks, timeToMinutes } from '../utils/timeMap';

const DAY_NAMES: DayName[] = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

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
}

function dateOnly(date: Date): string {
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

function availabilityForDate(profile: UserProfile, date: Date): DayAvailability | undefined {
  const dayName = DAY_NAMES[date.getDay()];
  return profile.availability.find((item) => item.day === dayName);
}

function categoryRank(category: TimeBlockCategory): number {
  switch (category) {
    case 'PREFERRED_STUDY': return 4;
    case 'AVAILABLE': return 3;
    case 'LIGHT_STUDY': return 2;
    case 'FLEXIBLE': return 1;
    default: return 0;
  }
}

function energyRank(energy: EnergyLevel): number {
  return energy === 'HIGH' ? 3 : energy === 'NORMAL' ? 2 : 1;
}

function buildSlots(profile: UserProfile, startDate: string, examDate: string): SlotBucket[] {
  const start = parseDate(startDate);
  const end = parseDate(examDate);
  const slots: SlotBucket[] = [];

  if (end < start) return slots;

  for (let current = start; current <= end; current = addDays(current, 1)) {
    const availability = availabilityForDate(profile, current);
    if (!availability) continue;

    let remainingDaily = Math.max(0, profile.maxDailyMinutes);
    const studyBlocks = sortBlocks(availability.blocks)
      .filter((block) => isStudyCategory(block.category) && blockDuration(block) >= 15)
      .sort((a, b) => {
        const preference = categoryRank(b.category) - categoryRank(a.category);
        if (preference !== 0) return preference;
        const energy = energyRank(b.energyLevel) - energyRank(a.energyLevel);
        if (energy !== 0) return energy;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });

    for (const block of studyBlocks) {
      if (remainingDaily < 15) break;
      const usable = Math.min(blockDuration(block), remainingDaily);
      if (usable < 15) continue;

      slots.push({
        date: dateOnly(current),
        startTime: block.startTime,
        startMinutes: timeToMinutes(block.startTime),
        capacityMinutes: usable,
        cursorMinutes: 0,
        category: block.category,
        energyLevel: block.energyLevel,
        locked: block.locked
      });
      remainingDaily -= usable;
    }
  }

  return slots;
}

function topicPriority(topic: SyllabusTopic): number {
  const importance = topic.importance === 'Core' ? 9 : topic.importance === 'Important' ? 6 : 3;
  const difficulty = topic.difficulty === 'High' ? 6 : topic.difficulty === 'Medium' ? 4 : 2;
  const typeBonus = topic.type === 'Clinical' || topic.type === 'Practical' ? 2 : 0;
  return importance + difficulty + typeBonus;
}

function topicEnergyNeed(topic: SyllabusTopic): EnergyLevel {
  if (topic.type === 'Journal' || topic.type === 'Activity') return 'LOW';
  if (topic.difficulty === 'High' || topic.importance === 'Core') return 'HIGH';
  return 'NORMAL';
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
      energyNeed: topicEnergyNeed(topic)
    });
    remaining -= minutes;
    part += 1;
  }

  return items;
}

function buildWorkItems(topics: SyllabusTopic[], profile: UserProfile): WorkItem[] {
  const learning = topics
    .flatMap((topic) => splitTopic(topic, profile.sessionMinutes))
    .sort((a, b) => b.priority - a.priority);

  const revisions: WorkItem[] = topics.map((topic) => ({
    id: `${topic.id}-revision`,
    topicId: topic.id,
    title: `Recall and revise: ${topic.title}`,
    subject: topic.subject,
    taskType: 'Revision',
    minutes: Math.max(25, Math.min(45, Math.round(topic.estimatedMinutes * 0.3))),
    priority: topicPriority(topic) + 1,
    energyNeed: 'LOW'
  }));

  const mock: WorkItem = {
    id: 'plan-mock-test',
    title: 'Timed mixed-syllabus self assessment',
    subject: 'All selected subjects',
    taskType: 'Mock Test',
    minutes: 90,
    priority: 20,
    energyNeed: 'HIGH'
  };

  return [...learning, ...revisions, mock];
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
        : `${minutesLabel(shortage)} of work cannot fit inside the current 24-hour timetable.`;

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
  return true;
}

function slotScore(slot: SlotBucket, item: WorkItem): number {
  let categoryScore = categoryRank(slot.category) * 10;
  if (item.energyNeed === 'LOW' && slot.category === 'LIGHT_STUDY') categoryScore += 22;
  if (item.energyNeed === 'LOW' && slot.category === 'PREFERRED_STUDY') categoryScore -= 10;
  if (item.energyNeed === 'HIGH' && slot.category === 'PREFERRED_STUDY') categoryScore += 16;

  const exactEnergy = slot.energyLevel === item.energyNeed ? 18 : 0;
  const usefulExtraFocus = item.energyNeed !== 'LOW' && slot.energyLevel === 'HIGH' ? 9 : 0;
  const gentleWindow = item.energyNeed === 'LOW' && slot.energyLevel === 'LOW' ? 8 : 0;
  const mismatchPenalty = item.energyNeed === 'HIGH' && slot.energyLevel === 'LOW' ? -20 : 0;
  const lockBonus = slot.locked ? 2 : 0;
  return categoryScore + exactEnergy + usefulExtraFocus + gentleWindow + mismatchPenalty + lockBonus;
}

function availableInSlot(slot: SlotBucket, breakMinutes: number): number {
  const breakBefore = slot.cursorMinutes > 0 ? breakMinutes : 0;
  return Math.max(0, slot.capacityMinutes - slot.cursorMinutes - breakBefore);
}

function placeItems(
  planId: string,
  items: WorkItem[],
  slots: SlotBucket[],
  breakMinutes: number
): { tasks: StudyTask[]; unscheduledMinutes: number } {
  const tasks: StudyTask[] = [];
  let unscheduledMinutes = 0;

  for (const item of items) {
    let remaining = item.minutes;
    let segment = 1;

    while (remaining > 0) {
      const minimumChunk = Math.min(15, remaining);
      const candidates = slots.filter((slot) =>
        slotSupports(slot, item) && availableInSlot(slot, breakMinutes) >= minimumChunk
      );

      if (candidates.length === 0) {
        unscheduledMinutes += remaining;
        break;
      }

      const earliestDate = candidates.reduce(
        (earliest, slot) => slot.date < earliest ? slot.date : earliest,
        candidates[0].date
      );
      const sameDay = candidates
        .filter((slot) => slot.date === earliestDate)
        .sort((a, b) => {
          const score = slotScore(b, item) - slotScore(a, item);
          if (score !== 0) return score;
          return a.startMinutes - b.startMinutes;
        });
      const slot = sameDay[0];
      const breakBefore = slot.cursorMinutes > 0 ? breakMinutes : 0;
      const available = availableInSlot(slot, breakMinutes);
      const duration = Math.min(remaining, available);
      const split = item.minutes !== duration || segment > 1;

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
        status: 'PENDING'
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

      if (before >= 15) nextSlots.push({ ...slot, capacityMinutes: before, cursorMinutes: 0 });
      if (after >= 15) {
        nextSlots.push({
          ...slot,
          startTime: minutesToTime('00:00', overlapEnd),
          startMinutes: overlapEnd,
          capacityMinutes: after,
          cursorMinutes: 0
        });
      }
    }

    currentSlots = nextSlots;
  }

  return currentSlots;
}

export function generateStudyPlan(
  profile: UserProfile,
  topics: SyllabusTopic[],
  name: string,
  examDate: string
): StudyPlan {
  const now = new Date();
  const startDate = dateOnly(now);
  const planId = `plan-${Date.now()}`;
  const slots = buildSlots(profile, startDate, examDate);
  const totalAvailable = slots.reduce((sum, slot) => sum + slot.capacityMinutes, 0);
  const workItems = buildWorkItems(topics, profile);
  const required = workItems.reduce((sum, item) => sum + item.minutes, 0);
  const placement = placeItems(planId, workItems, slots, profile.breakMinutes);

  return {
    id: planId,
    name,
    examDate,
    startDate,
    topicIds: topics.map((topic) => topic.id),
    tasks: placement.tasks.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    feasibility: createFeasibility(required, totalAvailable, placement.unscheduledMinutes),
    createdAt: new Date().toISOString(),
    archived: false
  };
}

export function reschedulePlan(profile: UserProfile, plan: StudyPlan): StudyPlan {
  const today = dateOnly(new Date());
  const preserved = plan.tasks.filter(
    (task) => task.status === 'COMPLETED' || task.status === 'SKIPPED' || task.date < today
  );
  const movable = plan.tasks.filter(
    (task) => task.status !== 'COMPLETED' && task.status !== 'SKIPPED' && task.date >= today
  );
  const preservedFuture = preserved.filter((task) => task.date >= today);

  const baseSlots = buildSlots(profile, today, plan.examDate);
  const slots = subtractReservedTasks(baseSlots, preservedFuture);
  const totalAvailable = slots.reduce((sum, slot) => sum + slot.capacityMinutes, 0);
  const items: WorkItem[] = movable.map((task, index) => ({
    id: `move-${index}-${task.topicId ?? task.taskType}`,
    topicId: task.topicId,
    title: task.title.replace(/ · Segment \d+$/, ''),
    subject: task.subject,
    taskType: task.taskType,
    minutes: task.durationMinutes,
    priority: task.status === 'OVERDUE' ? 20 : task.taskType === 'Revision' ? 12 : 10,
    energyNeed: task.taskType === 'Revision' || task.taskType === 'Journal' || task.taskType === 'Activity'
      ? 'LOW'
      : task.taskType === 'Mock Test' ? 'HIGH' : 'NORMAL'
  }));

  const placement = placeItems(plan.id, items, slots, profile.breakMinutes);
  const required = items.reduce((sum, item) => sum + item.minutes, 0);

  return {
    ...plan,
    tasks: [...preserved, ...placement.tasks].sort((a, b) =>
      `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
    ),
    feasibility: createFeasibility(required, totalAvailable, placement.unscheduledMinutes)
  };
}

export function updateOverdueTasks(plan: StudyPlan): StudyPlan {
  const today = dateOnly(new Date());
  return {
    ...plan,
    tasks: plan.tasks.map((task) =>
      task.date < today && task.status === 'PENDING'
        ? { ...task, status: 'OVERDUE' as const }
        : task
    )
  };
}

export function minutesLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}
