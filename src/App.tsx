import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Modal } from './components/Modal';
import { syllabusTopics } from './data/syllabus';
import { HomePage } from './pages/HomePage';
import { PlannerPage } from './pages/PlannerPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProgressPage } from './pages/ProgressPage';
import { SetupPage } from './pages/SetupPage';
import { SyllabusPage } from './pages/SyllabusPage';
import { appDatabase } from './services/database';
import { clearTaskNotifications, refreshTaskNotifications } from './services/notifications';
import { generateStudyPlan, reschedulePlan, updateOverdueTasks } from './services/scheduler';
import type {
  AppState,
  AppTab,
  ResetRequest,
  ResetScope,
  StudyPlan,
  StudyTask,
  SyllabusTopic,
  UserProfile
} from './types';
import { normalizeUserProfile, studyBlockCount, weeklyStudyMinutes } from './utils/timeMap';

const initialState: AppState = {
  setupComplete: false,
  profile: null,
  plans: [],
  activePlanId: null,
  selectedTab: 'home',
  lastSavedAt: null,
  schemaVersion: 3
};

const tabTitles: Record<AppTab, { title: string; eyebrow: string }> = {
  home: { title: 'Dashboard', eyebrow: 'Daily command centre' },
  syllabus: { title: 'Syllabus', eyebrow: 'Curriculum browser' },
  planner: { title: 'Study Planner', eyebrow: 'Adaptive schedule' },
  progress: { title: 'Progress', eyebrow: 'Study analytics' },
  profile: { title: 'Profile', eyebrow: 'Local settings' }
};

const resetRequests: Record<ResetScope, ResetRequest> = {
  RESET_ALL_PROGRESS: {
    scope: 'RESET_ALL_PROGRESS',
    title: 'Reset progress and rebuild plans?',
    description: 'Every plan will be regenerated from its selected syllabus using the current scheduler settings and 24-hour timetable.',
    effects: [
      'Completed, skipped, overdue and in-progress states will be removed',
      'Actual study time and confidence records will be cleared',
      'New session dates and times may differ from the current schedule',
      'Your profile, timetable and selected syllabus will remain'
    ],
    dangerLevel: 'CAUTION'
  },
  DELETE_ALL_PLANS: {
    scope: 'DELETE_ALL_PLANS',
    title: 'Delete every study plan?',
    description: 'All generated plans, sessions and plan progress will be removed from this device.',
    effects: [
      'The local profile and 24-hour timetable will remain',
      'The syllabus browser will remain available',
      'Deleted plans cannot be restored without a backup'
    ],
    dangerLevel: 'DESTRUCTIVE'
  },
  RESET_ALL_LOCAL_DATA: {
    scope: 'RESET_ALL_LOCAL_DATA',
    title: 'Reset the entire application?',
    description: 'This returns the app to first launch and removes all locally stored planner data.',
    effects: [
      'Profile and scheduler settings will be deleted',
      'The complete 24-hour weekly timetable will be deleted',
      'All plans, sessions and progress will be deleted',
      'The setup wizard will open again'
    ],
    dangerLevel: 'DESTRUCTIVE'
  }
};

function rebuildPlan(profile: UserProfile, plan: StudyPlan): StudyPlan {
  const selectedTopics = syllabusTopics.filter((topic) => plan.topicIds.includes(topic.id));
  const rebuilt = generateStudyPlan(profile, selectedTopics, plan.name, plan.examDate);

  return {
    ...rebuilt,
    id: plan.id,
    createdAt: plan.createdAt,
    archived: plan.archived,
    tasks: rebuilt.tasks.map((task) => ({
      ...task,
      id: task.id.replace(rebuilt.id, plan.id),
      planId: plan.id
    }))
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [pendingProfileChange, setPendingProfileChange] = useState<{
    profile: UserProfile;
    reason: string;
  } | null>(null);
  const [pendingReset, setPendingReset] = useState<ResetRequest | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await appDatabase.load();
        if (saved) {
          setState({
            ...saved,
            schemaVersion: 3,
            profile: saved.profile ? normalizeUserProfile(saved.profile) : null,
            plans: saved.plans.map(updateOverdueTasks)
          });
        }
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'Unable to open local storage.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    const next = { ...state, schemaVersion: 3, lastSavedAt: new Date().toISOString() };
    void appDatabase.save(next).catch((error) => {
      setStorageError(error instanceof Error ? error.message : 'Unable to save local data.');
    });
  }, [state.setupComplete, state.profile, state.plans, state.activePlanId, state.selectedTab, loading]);

  const activePlan = useMemo(
    () => state.plans.find((plan) => plan.id === state.activePlanId) ?? null,
    [state.plans, state.activePlanId]
  );

  useEffect(() => {
    if (!state.profile) return;

    const notificationAction = activePlan
      ? refreshTaskNotifications(activePlan.tasks, state.profile)
      : clearTaskNotifications();

    void notificationAction.catch(() => {
      // Notification permission failures should not block the planner.
    });
  }, [activePlan, state.profile]);

  const updateTaskStatus = (taskId: string, status: StudyTask['status']) => {
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) => ({
        ...plan,
        tasks: plan.tasks.map((task) => task.id === taskId ? { ...task, status } : task)
      }))
    }));
  };

  const createPlan = (name: string, examDate: string, selectedTopics: SyllabusTopic[]) => {
    if (!state.profile) return;
    const plan = generateStudyPlan(state.profile, selectedTopics, name, examDate);
    setState((current) => ({
      ...current,
      plans: [...current.plans, plan],
      activePlanId: plan.id,
      selectedTab: 'planner'
    }));
  };

  const requestProfileChange = (profile: UserProfile, reason: string) => {
    setPendingProfileChange({ profile, reason });
  };

  const applyProfileChange = () => {
    if (!pendingProfileChange) return;
    const nextProfile = pendingProfileChange.profile;
    setState((current) => ({
      ...current,
      profile: nextProfile,
      plans: current.plans.map((plan) => reschedulePlan(nextProfile, plan))
    }));
    setPendingProfileChange(null);
  };

  const requestDataReset = (scope: ResetScope) => {
    setPendingReset(resetRequests[scope]);
  };

  const applyDataReset = async () => {
    if (!pendingReset) return;

    if (pendingReset.scope === 'RESET_ALL_PROGRESS') {
      if (!state.profile) return;
      setState((current) => ({
        ...current,
        plans: current.plans.map((plan) => rebuildPlan(state.profile!, plan))
      }));
    }

    if (pendingReset.scope === 'DELETE_ALL_PLANS') {
      setState((current) => ({
        ...current,
        plans: [],
        activePlanId: null,
        selectedTab: 'profile'
      }));
    }

    if (pendingReset.scope === 'RESET_ALL_LOCAL_DATA') {
      await appDatabase.clear();
      setState(initialState);
    }

    setPendingReset(null);
  };

  if (loading) {
    return <div className="loading-screen"><div className="loading-sigil" /><span>Opening your study vault…</span></div>;
  }

  if (!state.setupComplete || !state.profile) {
    return (
      <SetupPage
        onComplete={(profile) => setState({
          ...initialState,
          setupComplete: true,
          schemaVersion: 3,
          profile,
          selectedTab: 'home'
        })}
      />
    );
  }

  const plannedIds = new Set(state.plans.flatMap((plan) => plan.topicIds));
  const heading = tabTitles[state.selectedTab];

  return (
    <>
      <AppShell
        activeTab={state.selectedTab}
        onTabChange={(selectedTab) => setState((current) => ({ ...current, selectedTab }))}
        title={heading.title}
        eyebrow={heading.eyebrow}
      >
        {storageError && <div className="warning-banner warning-banner--impossible"><strong>Storage warning</strong><span>{storageError}</span></div>}

        {state.selectedTab === 'home' && (
          <HomePage
            profile={state.profile}
            plan={activePlan}
            onOpenPlanner={() => setState((current) => ({ ...current, selectedTab: 'planner' }))}
            onTaskStatus={updateTaskStatus}
          />
        )}
        {state.selectedTab === 'syllabus' && (
          <SyllabusPage topics={syllabusTopics} currentYear={state.profile.professionalYear} plannedTopicIds={plannedIds} />
        )}
        {state.selectedTab === 'planner' && (
          <PlannerPage
            profile={state.profile}
            topics={syllabusTopics}
            plans={state.plans}
            activePlan={activePlan}
            onCreatePlan={createPlan}
            onSelectPlan={(activePlanId) => setState((current) => ({ ...current, activePlanId }))}
            onTaskStatus={updateTaskStatus}
          />
        )}
        {state.selectedTab === 'progress' && <ProgressPage plan={activePlan} />}
        {state.selectedTab === 'profile' && (
          <ProfilePage
            profile={state.profile}
            plans={state.plans}
            onRequestSave={requestProfileChange}
            onRequestDataReset={requestDataReset}
          />
        )}
      </AppShell>

      {pendingProfileChange && (
        <Modal title={pendingProfileChange.reason} onClose={() => setPendingProfileChange(null)}>
          <div className="modal-form">
            <p className="muted">Scheduler input changes regenerate only future unfinished sessions. Completed and historical work remain untouched.</p>
            <div className="setup-summary">
              <div><span>Affected plans</span><strong>{state.plans.length}</strong></div>
              <div><span>Study windows</span><strong>{studyBlockCount(pendingProfileChange.profile.availability)}</strong></div>
              <div><span>Weekly capacity</span><strong>{Math.floor(weeklyStudyMinutes(pendingProfileChange.profile.availability, pendingProfileChange.profile.maxDailyMinutes) / 60)} hours</strong></div>
              <div><span>Daily maximum</span><strong>{pendingProfileChange.profile.maxDailyMinutes === 1440 ? 'All marked windows' : `${Math.floor(pendingProfileChange.profile.maxDailyMinutes / 60)}h ${pendingProfileChange.profile.maxDailyMinutes % 60}m`}</strong></div>
              <div><span>Session rhythm</span><strong>{pendingProfileChange.profile.sessionMinutes}m + {pendingProfileChange.profile.breakMinutes}m break</strong></div>
              <div><span>Focus period</span><strong>{pendingProfileChange.profile.focusPeriod}</strong></div>
              <div><span>Reminder</span><strong>{pendingProfileChange.profile.notificationsEnabled ? `${pendingProfileChange.profile.reminderMinutes}m before` : 'Disabled'}</strong></div>
            </div>
            {studyBlockCount(pendingProfileChange.profile.availability) === 0 && (
              <div className="warning-banner warning-banner--impossible"><strong>No study windows will remain</strong><span>Existing plans will become impossible until you add at least one study-capable time block.</span></div>
            )}
            <div className="button-row button-row--end">
              <button className="button button--ghost" type="button" onClick={() => setPendingProfileChange(null)}>Cancel</button>
              <button className="button button--primary" type="button" onClick={applyProfileChange}>Apply and reschedule</button>
            </div>
          </div>
        </Modal>
      )}

      {pendingReset && (
        <Modal title={pendingReset.title} onClose={() => setPendingReset(null)}>
          <div className="modal-form">
            <p className="muted">{pendingReset.description}</p>
            <ul className="reset-effects">
              {pendingReset.effects.map((effect) => <li key={effect}>{effect}</li>)}
            </ul>
            <div className={pendingReset.dangerLevel === 'DESTRUCTIVE'
              ? 'warning-banner warning-banner--impossible'
              : 'warning-banner warning-banner--tight'}>
              <strong>{pendingReset.dangerLevel === 'DESTRUCTIVE' ? 'Destructive reset' : 'Schedule rebuild'}</strong>
              <span>Review the effects above before confirming. This action is applied only after you press the confirmation button.</span>
            </div>
            <div className="button-row button-row--end">
              <button className="button button--ghost" type="button" onClick={() => setPendingReset(null)}>Cancel</button>
              <button
                className={pendingReset.dangerLevel === 'DESTRUCTIVE'
                  ? 'button reset-button--danger-solid'
                  : 'button button--primary'}
                type="button"
                onClick={() => void applyDataReset()}
              >
                {pendingReset.scope === 'RESET_ALL_PROGRESS' ? 'Reset and rebuild' : 'Confirm reset'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
