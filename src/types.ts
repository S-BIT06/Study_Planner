export type AppTab = 'home' | 'syllabus' | 'planner' | 'progress' | 'profile';
export type ProfessionalYear = 'I Professional' | 'II Professional' | 'III Professional' | 'IV Professional';
export type FocusPeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Flexible';
export type Difficulty = 'Low' | 'Medium' | 'High';
export type Importance = 'Core' | 'Important' | 'Supporting';
export type TopicType = 'Theory' | 'Practical' | 'Clinical' | 'Journal' | 'Activity';
export type TaskType = TopicType | 'Revision' | 'Mock Test';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'SKIPPED';
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
  confidence?: 1 | 2 | 3 | 4;
  actualMinutes?: number;
}

export interface FeasibilityResult {
  health: PlanHealth;
  requiredMinutes: number;
  availableMinutes: number;
  shortageMinutes: number;
  unscheduledMinutes: number;
  message: string;
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
}

export interface ResetRequest {
  scope: ResetScope;
  title: string;
  description: string;
  effects: string[];
  dangerLevel: 'CAUTION' | 'DESTRUCTIVE';
}

export interface AppState {
  setupComplete: boolean;
  profile: UserProfile | null;
  plans: StudyPlan[];
  activePlanId: string | null;
  selectedTab: AppTab;
  lastSavedAt: string | null;
  schemaVersion?: number;
}
