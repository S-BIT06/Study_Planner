export type AppTab = 'home' | 'syllabus' | 'planner' | 'progress' | 'more';
export type MoreView = 'menu' | 'profile' | 'about' | 'notifications' | 'backup';
export type ProfessionalYear = 'I Professional' | 'II Professional' | 'III Professional';
export type FocusPeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Flexible';
export type Difficulty = 'Low' | 'Medium' | 'High';
export type Importance = 'Core' | 'Important' | 'Supporting';
export type TopicType = 'Theory' | 'Practical' | 'Clinical' | 'Journal' | 'Activity';
export type TaskType = TopicType | 'Revision' | 'Mock Test';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'PARTIAL' | 'OVERDUE' | 'SKIPPED';
export type PlanHealth = 'FEASIBLE' | 'TIGHT' | 'IMPOSSIBLE';
export type ResetScope =
  | 'RESET_ALL_PROGRESS'
  | 'DELETE_ALL_PLANS'
  | 'RESET_ALL_LOCAL_DATA';
export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type EnergyLevel = 'HIGH' | 'NORMAL' | 'LOW';
export type TimeBlockCategory =
  | 'PREFERRED_STUDY'
  | 'AVAILABLE'
  | 'LIGHT_STUDY'
  | 'FLEXIBLE'
  | 'SLEEP'
  | 'COLLEGE'
  | 'TRAVEL'
  | 'MEAL'
  | 'REST'
  | 'UNAVAILABLE';

export interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  category: TimeBlockCategory;
  energyLevel: EnergyLevel;
  locked: boolean;
  label: string;
}

export interface DayAvailability {
  day: DayName;
  blocks: TimeBlock[];
}

export interface DateException {
  id: string;
  date: string;
  label: string;
  blocks: TimeBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  name: string;
  college: string;
  professionalYear: ProfessionalYear;
  curriculumVersion: string;
  sessionMinutes: number;
  breakMinutes: number;
  maxDailyMinutes: number;
  focusPeriod: FocusPeriod;
  notificationsEnabled: boolean;
  reminderMinutes: number;
  availability: DayAvailability[];
  dateExceptions: DateException[];
}

export interface SyllabusTopic {
  id: string;
  year: ProfessionalYear;
  subject: string;
  paper: string;
  unit: string;
  title: string;
  type: TopicType;
  estimatedMinutes: number;
  difficulty: Difficulty;
  importance: Importance;
  sourceLabel: string;
  prerequisites?: string[];
}

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export interface StudyAttempt {
  id: string;
  planId: string;
  taskId: string;
  topicId?: string;
  startedAt: string;
  endedAt?: string;
  pausedSeconds: number;
  actualMinutes: number;
  completionPercent: number;
  remainingMinutes: number;
  confidence?: ConfidenceLevel;
  notes: string;
}

export interface ConfidenceRecord {
  id: string;
  planId: string;
  taskId: string;
  topicId?: string;
  confidence: ConfidenceLevel;
  recordedAt: string;
  notes?: string;
}

export interface RevisionRecord {
  id: string;
  planId: string;
  topicId?: string;
  sourceTaskId?: string;
  revisionNumber: number;
  scheduledDate: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'SKIPPED';
  confidenceAtCreation?: ConfidenceLevel;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  planId?: string;
  taskId?: string;
  title: string;
  body: string;
  scheduledAt?: string;
  createdAt: string;
  read: boolean;
  category: 'STUDY' | 'REVISION' | 'EXAM' | 'OVERDUE' | 'SYSTEM' | 'RESCHEDULE';
}

export interface StudyTask {
  id: string;
  planId: string;
  topicId?: string;
  title: string;
  subject: string;
  taskType: TaskType;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: TaskStatus;
  confidence?: ConfidenceLevel;
  actualMinutes?: number;
  remainingMinutes?: number;
  completionPercent?: number;
  locked?: boolean;
  generatedKind?: 'LEARNING' | 'REVISION' | 'MOCK' | 'RESCHEDULED' | 'MANUAL';
  attemptIds?: string[];
  sourceTaskId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeasibilityResult {
  health: PlanHealth;
  requiredMinutes: number;
  availableMinutes: number;
  shortageMinutes: number;
  unscheduledMinutes: number;
  message: string;
}

export interface PlanEvent {
  id: string;
  at: string;
  label: string;
  detail: string;
}

export interface StudyPlan {
  id: string;
  name: string;
  examDate: string;
  startDate: string;
  topicIds: string[];
  tasks: StudyTask[];
  feasibility: FeasibilityResult;
  createdAt: string;
  archived: boolean;
  paused?: boolean;
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  history?: PlanEvent[];
}

export interface ResetRequest {
  scope: ResetScope;
  title: string;
  description: string;
  effects: string[];
  dangerLevel: 'CAUTION' | 'DESTRUCTIVE';
}

export interface BackupMetadata {
  lastExportedAt?: string;
  lastImportedAt?: string;
  lastBackupName?: string;
}

export interface ResetHistoryEntry {
  id: string;
  scope: string;
  label: string;
  createdAt: string;
}

export interface MigrationHistoryEntry {
  fromVersion: number;
  toVersion: number;
  migratedAt: string;
}

export interface AppState {
  setupComplete: boolean;
  profile: UserProfile | null;
  plans: StudyPlan[];
  activePlanId: string | null;
  selectedTab: AppTab;
  moreView?: MoreView;
  attempts: StudyAttempt[];
  confidenceRecords: ConfidenceRecord[];
  revisionRecords: RevisionRecord[];
  notificationRecords: NotificationRecord[];
  backupMetadata: BackupMetadata;
  resetHistory: ResetHistoryEntry[];
  migrationHistory: MigrationHistoryEntry[];
  lastSavedAt: string | null;
  schemaVersion: number;
}

export interface RescheduleChange {
  taskId: string;
  title: string;
  oldDate: string;
  oldStartTime: string;
  newDate: string;
  newStartTime: string;
  reason: string;
}

export interface RescheduleResult {
  plan: StudyPlan;
  changes: RescheduleChange[];
}
