import type { AppState, StudyPlan, StudyTask } from '../types';
import { normalizeUserProfile } from '../utils/timeMap';

export const CURRENT_SCHEMA_VERSION = 11;

const emptyState: AppState = {
  setupComplete: false,
  profile: null,
  plans: [],
  activePlanId: null,
  selectedTab: 'home',
  moreView: 'menu',
  attempts: [],
  confidenceRecords: [],
  revisionRecords: [],
  notificationRecords: [],
  backupMetadata: {},
  resetHistory: [],
  migrationHistory: [],
  lastSavedAt: null,
  schemaVersion: CURRENT_SCHEMA_VERSION
};

function now(): string {
  return new Date().toISOString();
}

function normalizeTask(task: StudyTask): StudyTask {
  const createdAt = task.createdAt || now();
  return {
    ...task,
    status: task.status === 'PAUSED' ? 'PAUSED' : task.status,
    actualMinutes: task.actualMinutes ?? 0,
    remainingMinutes: task.remainingMinutes ?? task.durationMinutes,
    completionPercent: task.completionPercent ?? (task.status === 'COMPLETED' ? 100 : 0),
    locked: Boolean(task.locked),
    generatedKind: task.generatedKind ?? (task.taskType === 'Revision' ? 'REVISION' : task.taskType === 'Mock Test' ? 'MOCK' : 'LEARNING'),
    attemptIds: Array.isArray(task.attemptIds) ? task.attemptIds : [],
    createdAt,
    updatedAt: task.updatedAt || createdAt
  };
}

function normalizePlan(plan: StudyPlan): StudyPlan {
  return {
    ...plan,
    archived: Boolean(plan.archived),
    paused: Boolean(plan.paused),
    priority: plan.priority ?? 'NORMAL',
    history: Array.isArray(plan.history) ? plan.history : [],
    tasks: Array.isArray(plan.tasks) ? plan.tasks.map(normalizeTask) : []
  };
}

export function migrateAppState(raw: AppState | null): AppState | null {
  if (!raw) return null;

  const fromVersion = Number.isFinite(raw.schemaVersion) ? raw.schemaVersion : 1;
  const migrated: AppState = {
    ...emptyState,
    ...raw,
    profile: raw.profile ? normalizeUserProfile(raw.profile) : null,
    plans: Array.isArray(raw.plans) ? raw.plans.map(normalizePlan) : [],
    selectedTab: (raw as { selectedTab?: string }).selectedTab === 'profile' ? 'more' : raw.selectedTab ?? 'home',
    moreView: raw.moreView ?? ((raw as { selectedTab?: string }).selectedTab === 'profile' ? 'profile' : 'menu'),
    attempts: Array.isArray(raw.attempts) ? raw.attempts : [],
    confidenceRecords: Array.isArray(raw.confidenceRecords) ? raw.confidenceRecords : [],
    revisionRecords: Array.isArray(raw.revisionRecords) ? raw.revisionRecords : [],
    notificationRecords: Array.isArray(raw.notificationRecords) ? raw.notificationRecords : [],
    backupMetadata: raw.backupMetadata ?? {},
    resetHistory: Array.isArray(raw.resetHistory) ? raw.resetHistory : [],
    migrationHistory: Array.isArray(raw.migrationHistory) ? raw.migrationHistory : [],
    schemaVersion: CURRENT_SCHEMA_VERSION
  };

  if (fromVersion !== CURRENT_SCHEMA_VERSION) {
    migrated.migrationHistory = [
      ...migrated.migrationHistory,
      { fromVersion, toVersion: CURRENT_SCHEMA_VERSION, migratedAt: now() }
    ];
  }

  return migrated;
}

export function initialAppState(): AppState {
  return structuredClone(emptyState);
}
