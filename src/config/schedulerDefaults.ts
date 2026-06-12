import type { FocusPeriod, UserProfile } from '../types';

export interface SchedulerDefaults {
  sessionMinutes: number;
  breakMinutes: number;
  maxDailyMinutes: number;
  focusPeriod: FocusPeriod;
  notificationsEnabled: boolean;
  reminderMinutes: number;
}

export const SCHEDULER_DEFAULTS: Readonly<SchedulerDefaults> = Object.freeze({
  sessionMinutes: 50,
  breakMinutes: 10,
  maxDailyMinutes: 180,
  focusPeriod: 'Evening',
  notificationsEnabled: true,
  reminderMinutes: 15
});

export type SchedulerSettingKey = keyof SchedulerDefaults;

export function applySchedulerDefaults(profile: UserProfile): UserProfile {
  return {
    ...profile,
    ...SCHEDULER_DEFAULTS
  };
}

export function resetSchedulerSetting(
  profile: UserProfile,
  key: SchedulerSettingKey
): UserProfile {
  return {
    ...profile,
    [key]: SCHEDULER_DEFAULTS[key]
  };
}

export function isSchedulerSettingDefault(
  profile: UserProfile,
  key: SchedulerSettingKey
): boolean {
  return profile[key] === SCHEDULER_DEFAULTS[key];
}
