import { SCHEDULER_DEFAULTS } from '../config/schedulerDefaults';
import type {
  DateException,
  DayAvailability,
  DayName,
  EnergyLevel,
  TimeBlock,
  TimeBlockCategory,
  UserProfile
} from '../types';

export const DAYS: DayName[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const STUDY_CATEGORIES: TimeBlockCategory[] = [
  'PREFERRED_STUDY', 'AVAILABLE', 'LIGHT_STUDY', 'FLEXIBLE'
];

export const CATEGORY_LABELS: Record<TimeBlockCategory, string> = {
  PREFERRED_STUDY: 'Preferred study',
  AVAILABLE: 'Available for study',
  LIGHT_STUDY: 'Light study only',
  FLEXIBLE: 'Flexible / emergency',
  SLEEP: 'Sleep',
  COLLEGE: 'College / clinical',
  TRAVEL: 'Travel',
  MEAL: 'Meal',
  REST: 'Rest / personal time',
  UNAVAILABLE: 'Unavailable'
};

export const ENERGY_LABELS: Record<EnergyLevel, string> = {
  HIGH: 'High focus',
  NORMAL: 'Normal focus',
  LOW: 'Low focus'
};

let sequence = 0;
export function createTimeBlockId(prefix = 'block'): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

export function timeToMinutes(value: string): number {
  if (value === '24:00') return 1440;
  const [hours, minutes] = value.split(':').map(Number);
  return Math.max(0, Math.min(1440, (hours || 0) * 60 + (minutes || 0)));
}

export function minutesToClock(total: number, allowEndOfDay = false): string {
  const bounded = Math.max(0, Math.min(1440, total));
  if (allowEndOfDay && bounded === 1440) return '24:00';
  const normalized = bounded % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function blockDuration(block: Pick<TimeBlock, 'startTime' | 'endTime'>): number {
  return Math.max(0, timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
}

export function isStudyCategory(category: TimeBlockCategory): boolean {
  return STUDY_CATEGORIES.includes(category);
}

export function createBlock(
  startTime: string,
  endTime: string,
  category: TimeBlockCategory,
  energyLevel: EnergyLevel = 'NORMAL',
  label = '',
  locked = true
): TimeBlock {
  return {
    id: createTimeBlockId(category.toLowerCase()),
    startTime,
    endTime,
    category,
    energyLevel,
    locked,
    label
  };
}

function weekdayBlocks(): TimeBlock[] {
  return [
    createBlock('00:00', '06:00', 'SLEEP', 'LOW', 'Sleep'),
    createBlock('06:00', '07:00', 'PREFERRED_STUDY', 'HIGH', 'Morning focus', false),
    createBlock('08:30', '16:30', 'COLLEGE', 'NORMAL', 'College / clinical'),
    createBlock('16:30', '17:30', 'TRAVEL', 'LOW', 'Travel and reset'),
    createBlock('18:00', '20:00', 'AVAILABLE', 'NORMAL', 'Evening study', false),
    createBlock('20:00', '20:45', 'MEAL', 'LOW', 'Dinner'),
    createBlock('20:45', '21:45', 'LIGHT_STUDY', 'LOW', 'Revision window', false),
    createBlock('22:30', '24:00', 'SLEEP', 'LOW', 'Sleep')
  ];
}

function weekendBlocks(day: DayName): TimeBlock[] {
  return [
    createBlock('00:00', '07:00', 'SLEEP', 'LOW', 'Sleep'),
    createBlock('09:00', '12:00', 'PREFERRED_STUDY', 'HIGH', 'Deep study', false),
    createBlock('12:00', '13:00', 'MEAL', 'LOW', 'Lunch'),
    createBlock('15:00', '17:00', day === 'Saturday' ? 'AVAILABLE' : 'FLEXIBLE', 'NORMAL', 'Open study window', false),
    createBlock('19:30', '20:30', 'LIGHT_STUDY', 'LOW', 'Review', false),
    createBlock('23:00', '24:00', 'SLEEP', 'LOW', 'Sleep')
  ];
}

export function defaultAvailability(): DayAvailability[] {
  return DAYS.map((day) => ({
    day,
    blocks: day === 'Saturday' || day === 'Sunday' ? weekendBlocks(day) : weekdayBlocks()
  }));
}

export function sortBlocks(blocks: TimeBlock[]): TimeBlock[] {
  return [...blocks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function blocksOverlap(a: Pick<TimeBlock, 'startTime' | 'endTime'>, b: Pick<TimeBlock, 'startTime' | 'endTime'>): boolean {
  return timeToMinutes(a.startTime) < timeToMinutes(b.endTime)
    && timeToMinutes(a.endTime) > timeToMinutes(b.startTime);
}

export function dayStudyMinutes(day: DayAvailability, maxDailyMinutes = 1440): number {
  const minutes = day.blocks
    .filter((block) => isStudyCategory(block.category))
    .reduce((sum, block) => sum + blockDuration(block), 0);
  return Math.min(minutes, maxDailyMinutes);
}

export function weeklyStudyMinutes(availability: DayAvailability[], maxDailyMinutes = 1440): number {
  return availability.reduce((sum, day) => sum + dayStudyMinutes(day, maxDailyMinutes), 0);
}

export function studyBlockCount(availability: DayAvailability[]): number {
  return availability.reduce(
    (sum, day) => sum + day.blocks.filter((block) => isStudyCategory(block.category)).length,
    0
  );
}

function oldAvailabilityToDay(raw: Record<string, unknown>, day: DayName): DayAvailability {
  const enabled = Boolean(raw.enabled);
  if (!enabled) return { day, blocks: [] };

  const startTime = typeof raw.startTime === 'string' ? raw.startTime : '18:00';
  const minutes = typeof raw.minutes === 'number' ? raw.minutes : 120;
  const start = timeToMinutes(startTime);
  const end = Math.min(1440, start + Math.max(15, minutes));

  return {
    day,
    blocks: [createBlock(startTime, minutesToClock(end, true), 'AVAILABLE', 'NORMAL', 'Imported study window', false)]
  };
}

export function normalizeAvailability(raw: unknown): DayAvailability[] {
  if (!Array.isArray(raw)) return defaultAvailability();

  return DAYS.map((day) => {
    const candidate = raw.find((item) => item && typeof item === 'object' && (item as { day?: unknown }).day === day) as Record<string, unknown> | undefined;
    if (!candidate) return { day, blocks: [] };

    if (!Array.isArray(candidate.blocks)) return oldAvailabilityToDay(candidate, day);

    const blocks = candidate.blocks
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const block = item as Partial<TimeBlock>;
        const category = block.category && CATEGORY_LABELS[block.category] ? block.category : 'UNAVAILABLE';
        const energyLevel = block.energyLevel && ENERGY_LABELS[block.energyLevel] ? block.energyLevel : 'NORMAL';
        return {
          id: block.id || createTimeBlockId('migrated'),
          startTime: block.startTime || '00:00',
          endTime: block.endTime || '01:00',
          category,
          energyLevel,
          locked: block.locked ?? !isStudyCategory(category),
          label: block.label || ''
        } satisfies TimeBlock;
      })
      .filter((block) => blockDuration(block) > 0);

    return { day, blocks: sortBlocks(blocks) };
  });
}

export function normalizeDateExceptions(raw: unknown): DateException[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const candidate = item as Partial<DateException>;
      return {
        id: candidate.id || createTimeBlockId('exception'),
        date: candidate.date || new Date().toISOString().slice(0, 10),
        label: candidate.label || 'Special timetable',
        blocks: normalizeAvailability([{ day: 'Monday', blocks: candidate.blocks ?? [] }])[0].blocks,
        createdAt: candidate.createdAt || new Date().toISOString(),
        updatedAt: candidate.updatedAt || new Date().toISOString()
      } satisfies DateException;
    });
}

export function normalizeUserProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    sessionMinutes: Number.isFinite(profile.sessionMinutes)
      ? profile.sessionMinutes
      : SCHEDULER_DEFAULTS.sessionMinutes,
    breakMinutes: Number.isFinite(profile.breakMinutes)
      ? profile.breakMinutes
      : SCHEDULER_DEFAULTS.breakMinutes,
    maxDailyMinutes: Number.isFinite(profile.maxDailyMinutes)
      ? profile.maxDailyMinutes
      : SCHEDULER_DEFAULTS.maxDailyMinutes,
    focusPeriod: profile.focusPeriod ?? SCHEDULER_DEFAULTS.focusPeriod,
    notificationsEnabled: profile.notificationsEnabled ?? SCHEDULER_DEFAULTS.notificationsEnabled,
    reminderMinutes: Number.isFinite(profile.reminderMinutes)
      ? profile.reminderMinutes
      : SCHEDULER_DEFAULTS.reminderMinutes,
    availability: normalizeAvailability(profile.availability),
    dateExceptions: normalizeDateExceptions(profile.dateExceptions)
  };
}

export function timeOptions(includeEndOfDay = false): string[] {
  const values: string[] = [];
  for (let minute = 0; minute < 1440; minute += 1) values.push(minutesToClock(minute));
  if (includeEndOfDay) values.push('24:00');
  return values;
}
