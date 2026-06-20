import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { StudyTask, UserProfile } from '../types';

function numericId(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return (hash % 2_000_000_000) + 1;
}

function toScheduleDate(task: StudyTask, reminderMinutes: number): Date {
  const date = new Date(`${task.date}T${task.startTime}:00`);
  date.setMinutes(date.getMinutes() - reminderMinutes);
  return date;
}


export async function clearTaskNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length === 0) return;

  await LocalNotifications.cancel({
    notifications: pending.notifications.map(({ id }) => ({ id }))
  });
}

export async function refreshTaskNotifications(
  tasks: StudyTask[],
  profile: UserProfile
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await clearTaskNotifications();
  if (!profile.notificationsEnabled) return;

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') {
    const requested = await LocalNotifications.requestPermissions();
    if (requested.display !== 'granted') return;
  }

  const now = new Date();
  const upcoming = tasks
    .filter((task) => task.status !== 'COMPLETED' && task.status !== 'SKIPPED' && task.status !== 'PAUSED')
    .map((task) => ({ task, at: toScheduleDate(task, profile.reminderMinutes) }))
    .filter(({ at }) => at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 48);

  if (upcoming.length === 0) return;

  await LocalNotifications.schedule({
    notifications: upcoming.map(({ task, at }) => ({
      id: numericId(task.id),
      title: 'Study session approaching',
      body: `${task.subject}: ${task.title}`,
      schedule: { at },
      extra: { taskId: task.id, planId: task.planId }
    }))
  });
}
