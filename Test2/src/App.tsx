import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Modal } from './components/Modal';
import { TaskSessionModal, type TaskCompletionInput } from './components/TaskSessionModal';
import { syllabusTopics } from './data/syllabus';
import { HomePage } from './pages/HomePage';
import { MorePage } from './pages/MorePage';
import { PlannerPage } from './pages/PlannerPage';
import { ProgressPage } from './pages/ProgressPage';
import { SetupPage } from './pages/SetupPage';
import { SyllabusPage } from './pages/SyllabusPage';
import { appDatabase } from './services/database';
import { CURRENT_SCHEMA_VERSION, initialAppState, migrateAppState } from './services/migrations';
import { clearTaskNotifications, refreshTaskNotifications } from './services/notifications';
import { buildAdaptiveRevisionTask, generateStudyPlan, reschedulePlanWithChanges, updateOverdueTasks } from './services/scheduler';
import type {
  AppState,
  AppTab,
  ConfidenceRecord,
  MoreView,
  NotificationRecord,
  ResetRequest,
  ResetScope,
  StudyAttempt,
  StudyPlan,
  StudyTask,
  SyllabusTopic,
  UserProfile
} from './types';
import { normalizeUserProfile, studyBlockCount, weeklyStudyMinutes } from './utils/timeMap';

const resetRequests: Record<ResetScope, ResetRequest> = {
  RESET_ALL_PROGRESS: {
    scope: 'RESET_ALL_PROGRESS',
    title: 'Reset progress and rebuild plans?',
    description: 'Every plan will be regenerated from its selected syllabus using the current scheduler settings and 24-hour timetable.',
    effects: [
      'Completed, skipped, overdue and in-progress states will be removed',
      'Actual study time, confidence records, study attempts and revision records will be cleared',
      'New session dates and times may differ from the current schedule',
      'Your profile, timetable and selected syllabus will remain'
    ],
    dangerLevel: 'CAUTION'
  },
  DELETE_ALL_PLANS: {
    scope: 'DELETE_ALL_PLANS',
    title: 'Delete every study plan?',
    description: 'All generated plans, sessions and plan progress will be removed from this device.',
    effects: ['The local profile and 24-hour timetable will remain', 'The syllabus browser will remain available', 'Deleted plans cannot be restored without a backup'],
    dangerLevel: 'DESTRUCTIVE'
  },
  RESET_ALL_LOCAL_DATA: {
    scope: 'RESET_ALL_LOCAL_DATA',
    title: 'Reset the entire application?',
    description: 'This returns the app to first launch and removes all locally stored planner data.',
    effects: ['Profile and scheduler settings will be deleted', 'The complete timetable will be deleted', 'All plans, sessions and progress will be deleted', 'The setup wizard will open again'],
    dangerLevel: 'DESTRUCTIVE'
  }
};

const tabTitles: Record<AppTab, { title: string; eyebrow: string }> = {
  home: { title: 'Dashboard', eyebrow: 'Daily command centre' },
  syllabus: { title: 'Syllabus', eyebrow: 'Curriculum browser' },
  planner: { title: 'Study Planner', eyebrow: 'Adaptive schedule' },
  progress: { title: 'Progress', eyebrow: 'Study analytics' },
  more: { title: 'More', eyebrow: 'Profile, About and tools' }
};

function now(): string {
  return new Date().toISOString();
}

function rebuildPlan(profile: UserProfile, plan: StudyPlan): StudyPlan {
  const selectedTopics = syllabusTopics.filter((topic) => plan.topicIds.includes(topic.id));
  const rebuilt = generateStudyPlan(profile, selectedTopics, plan.name, plan.examDate);
  return {
    ...rebuilt,
    id: plan.id,
    createdAt: plan.createdAt,
    archived: plan.archived,
    paused: plan.paused,
    priority: plan.priority,
    history: [...(plan.history ?? []), { id: `event-${Date.now()}`, at: now(), label: 'Progress reset', detail: 'Plan rebuilt from selected topics.' }],
    tasks: rebuilt.tasks.map((task) => ({ ...task, id: task.id.replace(rebuilt.id, plan.id), planId: plan.id }))
  };
}

function notificationRecord(input: Omit<NotificationRecord, 'id' | 'createdAt' | 'read'>): NotificationRecord {
  return { ...input, id: `note-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: now(), read: false };
}

export default function App() {
  const [state, setState] = useState<AppState>(() => initialAppState());
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [pendingProfileChange, setPendingProfileChange] = useState<{ profile: UserProfile; reason: string } | null>(null);
  const [pendingReset, setPendingReset] = useState<ResetRequest | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await appDatabase.load();
        const migrated = migrateAppState(saved) ?? initialAppState();
        setState({ ...migrated, plans: migrated.plans.map(updateOverdueTasks) });
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'Unable to open local storage.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    const next = { ...state, schemaVersion: CURRENT_SCHEMA_VERSION, lastSavedAt: now() };
    void appDatabase.save(next).catch((error) => setStorageError(error instanceof Error ? error.message : 'Unable to save local data.'));
  }, [state, loading]);

  const activePlan = useMemo(() => state.plans.find((plan) => plan.id === state.activePlanId) ?? null, [state.plans, state.activePlanId]);
  const activeTask = useMemo(() => state.plans.flatMap((plan) => plan.tasks).find((task) => task.id === activeTaskId) ?? null, [state.plans, activeTaskId]);

  useEffect(() => {
    if (!state.profile) return;
    const action = activePlan ? refreshTaskNotifications(activePlan.tasks, state.profile) : clearTaskNotifications();
    void action.catch(() => undefined);
  }, [activePlan, state.profile]);

  const updateTaskStatus = (taskId: string, status: StudyTask['status']) => {
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) => ({
        ...plan,
        tasks: plan.tasks.map((task) => task.id === taskId ? { ...task, status, updatedAt: now() } : task)
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
      selectedTab: 'planner',
      notificationRecords: [notificationRecord({ category: plan.feasibility.health === 'IMPOSSIBLE' ? 'SYSTEM' : 'STUDY', title: 'Study plan generated', body: `${plan.name}: ${plan.feasibility.message}`, planId: plan.id }), ...current.notificationRecords]
    }));
  };

  const requestProfileChange = (profile: UserProfile, reason: string) => setPendingProfileChange({ profile: normalizeUserProfile(profile), reason });

  const applyProfileChange = () => {
    if (!pendingProfileChange) return;
    const nextProfile = pendingProfileChange.profile;
    setState((current) => {
      const results = current.plans.map((plan) => reschedulePlanWithChanges(nextProfile, plan));
      const moved = results.flatMap((result) => result.changes);
      return {
        ...current,
        profile: nextProfile,
        plans: results.map((result) => result.plan),
        notificationRecords: [notificationRecord({ category: 'RESCHEDULE', title: 'Schedule recalculated', body: `${moved.length} future session(s) moved after ${pendingProfileChange.reason}.` }), ...current.notificationRecords]
      };
    });
    setPendingProfileChange(null);
  };

  const requestDataReset = (scope: ResetScope) => setPendingReset(resetRequests[scope]);

  const applyDataReset = async () => {
    if (!pendingReset) return;
    if (pendingReset.scope === 'RESET_ALL_PROGRESS') {
      if (!state.profile) return;
      setState((current) => ({
        ...current,
        attempts: [],
        confidenceRecords: [],
        revisionRecords: [],
        plans: current.plans.map((plan) => rebuildPlan(state.profile!, plan)),
        resetHistory: [...current.resetHistory, { id: `reset-${Date.now()}`, scope: pendingReset.scope, label: pendingReset.title, createdAt: now() }],
        notificationRecords: [notificationRecord({ category: 'SYSTEM', title: 'Progress reset', body: 'Plans were rebuilt from selected topics.' }), ...current.notificationRecords]
      }));
    }
    if (pendingReset.scope === 'DELETE_ALL_PLANS') {
      setState((current) => ({ ...current, plans: [], activePlanId: null, selectedTab: 'more', moreView: 'profile', resetHistory: [...current.resetHistory, { id: `reset-${Date.now()}`, scope: pendingReset.scope, label: pendingReset.title, createdAt: now() }] }));
    }
    if (pendingReset.scope === 'RESET_ALL_LOCAL_DATA') {
      await appDatabase.clear();
      setState(initialAppState());
    }
    setPendingReset(null);
  };

  const completeTaskWithAttempt = (input: TaskCompletionInput) => {
    const target = state.plans.flatMap((plan) => plan.tasks).find((task) => task.id === input.taskId);
    if (!target) return;
    const attemptId = `attempt-${Date.now()}`;
    const attempt: StudyAttempt = {
      id: attemptId,
      planId: target.planId,
      taskId: target.id,
      topicId: target.topicId,
      startedAt: now(),
      endedAt: now(),
      pausedSeconds: 0,
      actualMinutes: input.actualMinutes,
      completionPercent: input.completionPercent,
      remainingMinutes: input.remainingMinutes,
      confidence: input.confidence,
      notes: input.notes
    };
    const confidenceRecord: ConfidenceRecord | null = input.confidence ? {
      id: `confidence-${Date.now()}`,
      planId: target.planId,
      taskId: target.id,
      topicId: target.topicId,
      confidence: input.confidence,
      recordedAt: now(),
      notes: input.notes
    } : null;
    const adaptiveRevision = input.confidence ? buildAdaptiveRevisionTask(target.planId, target, input.confidence) : null;

    setState((current) => ({
      ...current,
      attempts: [attempt, ...current.attempts],
      confidenceRecords: confidenceRecord ? [confidenceRecord, ...current.confidenceRecords] : current.confidenceRecords,
      plans: current.plans.map((plan) => plan.id !== target.planId ? plan : {
        ...plan,
        tasks: [
          ...plan.tasks.map((task) => task.id === target.id ? {
            ...task,
            status: input.status,
            actualMinutes: input.actualMinutes,
            completionPercent: input.completionPercent,
            remainingMinutes: input.remainingMinutes,
            confidence: input.confidence,
            attemptIds: [...(task.attemptIds ?? []), attemptId],
            updatedAt: now()
          } : task),
          ...(adaptiveRevision && input.status !== 'SKIPPED' && input.confidence && input.confidence <= 3 ? [adaptiveRevision] : [])
        ].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
        history: [...(plan.history ?? []), { id: `event-${Date.now()}`, at: now(), label: 'Study attempt recorded', detail: `${target.title}: ${input.completionPercent}% complete, confidence ${input.confidence ?? 'not set'}.` }]
      }),
      notificationRecords: [notificationRecord({ category: input.status === 'PARTIAL' ? 'OVERDUE' : 'STUDY', title: input.status === 'PARTIAL' ? 'Partial work saved' : 'Study session recorded', body: `${target.title}: ${input.completionPercent}% complete.`, planId: target.planId, taskId: target.id }), ...current.notificationRecords]
    }));
    setActiveTaskId(null);
  };

  const updatePlan = (planId: string, updater: (plan: StudyPlan) => StudyPlan) => {
    setState((current) => ({ ...current, plans: current.plans.map((plan) => plan.id === planId ? updater(plan) : plan) }));
  };

  const duplicatePlan = (planId: string) => {
    const plan = state.plans.find((item) => item.id === planId);
    if (!plan || !state.profile) return;
    const topics = syllabusTopics.filter((topic) => plan.topicIds.includes(topic.id));
    const copy = generateStudyPlan(state.profile, topics, `${plan.name} copy`, plan.examDate);
    setState((current) => ({ ...current, plans: [...current.plans, copy], activePlanId: copy.id }));
  };

  const deletePlan = (planId: string) => setState((current) => ({ ...current, plans: current.plans.filter((plan) => plan.id !== planId), activePlanId: current.activePlanId === planId ? current.plans.find((plan) => plan.id !== planId)?.id ?? null : current.activePlanId }));

  const importState = (imported: AppState) => {
    const migrated = migrateAppState(imported);
    if (!migrated) return;
    setState({ ...migrated, backupMetadata: { ...migrated.backupMetadata, lastImportedAt: now(), lastBackupName: 'manual import' } });
  };

  if (loading) return <div className="loading-screen"><div className="loading-sigil" /><span>Opening your study vault…</span></div>;

  if (!state.setupComplete || !state.profile) {
    return <SetupPage onComplete={(profile) => setState({ ...initialAppState(), setupComplete: true, profile, selectedTab: 'home', moreView: 'menu' })} />;
  }

  const plannedIds = new Set(state.plans.flatMap((plan) => plan.topicIds));
  const heading = tabTitles[state.selectedTab];

  return (
    <>
      <AppShell
        activeTab={state.selectedTab}
        onTabChange={(selectedTab) => setState((current) => ({ ...current, selectedTab, moreView: selectedTab === 'more' ? current.moreView ?? 'menu' : current.moreView }))}
        title={heading.title}
        eyebrow={heading.eyebrow}
        onNotifications={() => setState((current) => ({ ...current, selectedTab: 'more', moreView: 'notifications' }))}
      >
        {storageError && <div className="warning-banner warning-banner--impossible"><strong>Storage warning</strong><span>{storageError}</span></div>}
        {state.selectedTab === 'home' && <HomePage profile={state.profile} plan={activePlan} onOpenPlanner={() => setState((current) => ({ ...current, selectedTab: 'planner' }))} onTaskStatus={updateTaskStatus} onOpenTask={setActiveTaskId} />}
        {state.selectedTab === 'syllabus' && <SyllabusPage topics={syllabusTopics} currentYear={state.profile.professionalYear} plannedTopicIds={plannedIds} />}
        {state.selectedTab === 'planner' && <PlannerPage profile={state.profile} topics={syllabusTopics} plans={state.plans} activePlan={activePlan} onCreatePlan={createPlan} onSelectPlan={(activePlanId) => setState((current) => ({ ...current, activePlanId }))} onTaskStatus={updateTaskStatus} onOpenTask={setActiveTaskId} onDeletePlan={deletePlan} onDuplicatePlan={duplicatePlan} onUpdatePlan={updatePlan} />}
        {state.selectedTab === 'progress' && <ProgressPage plan={activePlan} attempts={state.attempts} confidenceRecords={state.confidenceRecords} />}
        {state.selectedTab === 'more' && <MorePage view={state.moreView ?? 'menu'} onViewChange={(moreView: MoreView) => setState((current) => ({ ...current, moreView }))} profile={state.profile} plans={state.plans} state={state} onRequestSave={requestProfileChange} onRequestDataReset={requestDataReset} onImportState={importState} onMarkNotificationRead={(id) => setState((current) => ({ ...current, notificationRecords: current.notificationRecords.map((record) => record.id === id ? { ...record, read: true } : record) }))} onClearNotifications={() => setState((current) => ({ ...current, notificationRecords: [] }))} />}
      </AppShell>

      {activeTask && <TaskSessionModal task={activeTask} onClose={() => setActiveTaskId(null)} onSave={completeTaskWithAttempt} />}

      {pendingProfileChange && (
        <Modal title={pendingProfileChange.reason} onClose={() => setPendingProfileChange(null)}>
          <div className="modal-form">
            <p className="muted">Scheduler input changes regenerate future unfinished sessions only. Completed, skipped, locked and historical work remain untouched.</p>
            <div className="settings-list">
              <div><span>Study windows</span><strong>{studyBlockCount(pendingProfileChange.profile.availability)}</strong></div>
              <div><span>Weekly capacity</span><strong>{Math.floor(weeklyStudyMinutes(pendingProfileChange.profile.availability, pendingProfileChange.profile.maxDailyMinutes) / 60)}h</strong></div>
              <div><span>Date exceptions</span><strong>{pendingProfileChange.profile.dateExceptions.length}</strong></div>
              <div><span>Session length</span><strong>{pendingProfileChange.profile.sessionMinutes}m</strong></div>
              <div><span>Break length</span><strong>{pendingProfileChange.profile.breakMinutes}m</strong></div>
              <div><span>Focus preference</span><strong>{pendingProfileChange.profile.focusPeriod}</strong></div>
            </div>
            <div className="button-row button-row--end"><button className="button button--ghost" type="button" onClick={() => setPendingProfileChange(null)}>Cancel</button><button className="button button--primary" type="button" onClick={applyProfileChange}>Apply and reschedule</button></div>
          </div>
        </Modal>
      )}

      {pendingReset && (
        <Modal title={pendingReset.title} onClose={() => setPendingReset(null)}>
          <div className="modal-form">
            <p className="muted">{pendingReset.description}</p>
            <ul className="effect-list">{pendingReset.effects.map((effect) => <li key={effect}>{effect}</li>)}</ul>
            <div className="button-row button-row--end"><button className="button button--ghost" type="button" onClick={() => setPendingReset(null)}>Cancel</button><button className={`button ${pendingReset.dangerLevel === 'DESTRUCTIVE' ? 'button--danger' : 'button--primary'}`} type="button" onClick={() => void applyDataReset()}>Confirm</button></div>
          </div>
        </Modal>
      )}
    </>
  );
}
