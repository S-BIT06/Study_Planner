import { useRef } from 'react';
import { ProfilePage } from './ProfilePage';
import type { AppState, MoreView, NotificationRecord, ResetScope, StudyPlan, UserProfile } from '../types';
import { minutesLabel } from '../services/scheduler';

function AboutSection() {
  const featureGroups = [
    ['Automatic scheduler', 'Turns selected syllabus, exam date, timetable, daily cap, focus levels, importance and difficulty into dated study sessions. It avoids sleep, college, meals, travel and unavailable blocks.'],
    ['24-hour timetable', 'Lets the student mark the whole day with study windows, sleep, college, clinical postings, travel, meals, rest, flexible windows and unavailable time.'],
    ['Minute time picker', 'Uses a phone-style hour and minute picker so every exact minute can be selected. The scheduler still avoids useless tiny study segments.'],
    ['Preferred study', 'Gets the strongest scheduling weight, especially for difficult core topics and mock tests.'],
    ['Focus levels', 'High focus receives difficult new concepts; normal focus receives regular study; low focus receives revision, journals and light work.'],
    ['Daily study cap', 'Limits how much of the available time the scheduler may use on one day, preventing overloaded timetables.'],
    ['Flexible / emergency windows', 'Kept as lower-priority reserve time for tight plans, overdue work or rescheduled tasks.'],
    ['Locked sessions', 'Locked generated tasks are preserved during automatic rescheduling. The user can still unlock and edit manually.'],
    ['Timer and partial completion', 'Sessions can record actual minutes, pause/resume progress, partial completion, remaining work and notes.'],
    ['Confidence level', 'After studying, confidence from 1 to 5 influences recovery revision. Weak topics return sooner.'],
    ['Revision system', 'The planner adds spaced revision tasks and can create extra recovery revision after low confidence.'],
    ['Pie chart and progress', 'Progress is calculated using planned duration, not raw task count, so a six-hour pending task weighs more than a short completed task.'],
    ['Notifications', 'The app stores notification records and schedules local reminders for active, non-skipped tasks on the phone.'],
    ['Backup and restore', 'Exports and imports local app data as JSON so offline data is not trapped on one device.']
  ];

  return (
    <div className="page-stack">
      <section className="hero-card ornate-card"><span className="eyebrow">About</span><h2>How Study Planner works</h2><p>This page is the built-in guide for the offline NCISM study scheduling system.</p></section>
      <section className="section-card help-list">
        {featureGroups.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}
      </section>
    </div>
  );
}

function NotificationsSection({ records, onMarkRead, onClear }: { records: NotificationRecord[]; onMarkRead: (id: string) => void; onClear: () => void }) {
  return (
    <div className="page-stack">
      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Notification centre</span><h3>Local reminders and alerts</h3></div><button className="button button--ghost button--small" type="button" onClick={onClear}>Clear</button></div>
        {records.length ? <div className="notification-list">{records.map((record) => (
          <button key={record.id} className={`notification-item ${record.read ? 'is-read' : ''}`} type="button" onClick={() => onMarkRead(record.id)}>
            <strong>{record.title}</strong><span>{record.body}</span><small>{record.category} · {record.scheduledAt ?? record.createdAt}</small>
          </button>
        ))}</div> : <p className="muted">No notification records yet. Future phone reminders and scheduling warnings will appear here.</p>}
      </section>
    </div>
  );
}

function BackupSection({ state, onImport }: { state: AppState; onImport: (state: AppState) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const exportBackup = () => {
    const payload = JSON.stringify({ ...state, lastSavedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `study-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importBackup = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as AppState;
    if (!parsed || typeof parsed !== 'object' || !('plans' in parsed)) throw new Error('Invalid backup file.');
    onImport(parsed);
  };

  return (
    <div className="page-stack">
      <section className="section-card">
        <span className="eyebrow">Offline safety</span><h2>Backup and restore</h2>
        <p className="muted">Export a JSON backup before risky changes or before uninstalling the app. Restore only files you trust.</p>
        <div className="metric-grid metric-grid--three">
          <article><span>Plans</span><strong>{state.plans.length}</strong><small>stored</small></article>
          <article><span>Attempts</span><strong>{state.attempts.length}</strong><small>tracked</small></article>
          <article><span>Records</span><strong>{state.notificationRecords.length}</strong><small>alerts</small></article>
        </div>
        <div className="button-row">
          <button className="button button--primary" type="button" onClick={exportBackup}>Export backup</button>
          <button className="button button--ghost" type="button" onClick={() => inputRef.current?.click()}>Restore backup</button>
          <input ref={inputRef} hidden type="file" accept="application/json" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importBackup(file);
            event.currentTarget.value = '';
          }} />
        </div>
      </section>
    </div>
  );
}

export function MorePage({
  view,
  onViewChange,
  profile,
  plans,
  state,
  onRequestSave,
  onRequestDataReset,
  onImportState,
  onMarkNotificationRead,
  onClearNotifications
}: {
  view: MoreView;
  onViewChange: (view: MoreView) => void;
  profile: UserProfile;
  plans: StudyPlan[];
  state: AppState;
  onRequestSave: (profile: UserProfile, reason: string) => void;
  onRequestDataReset: (scope: ResetScope) => void;
  onImportState: (state: AppState) => void;
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications: () => void;
}) {
  if (view === 'profile') return <ProfilePage profile={profile} plans={plans} onRequestSave={onRequestSave} onRequestDataReset={onRequestDataReset} />;
  if (view === 'about') return <AboutSection />;
  if (view === 'notifications') return <NotificationsSection records={state.notificationRecords} onMarkRead={onMarkNotificationRead} onClear={onClearNotifications} />;
  if (view === 'backup') return <BackupSection state={state} onImport={onImportState} />;

  const activeMinutes = plans.flatMap((plan) => plan.tasks).reduce((sum, task) => sum + task.durationMinutes, 0);
  return (
    <div className="page-stack">
      <section className="profile-identity ornate-card"><div className="profile-avatar"><span>{profile.name.slice(0, 1).toUpperCase()}</span></div><div><span className="eyebrow">More</span><h2>{profile.name}</h2><p>{profile.professionalYear} · {minutesLabel(activeMinutes)} planned</p></div></section>
      <section className="more-grid">
        <button type="button" onClick={() => onViewChange('profile')}><strong>Profile</strong><span>Personal details, timetable, reset centre</span></button>
        <button type="button" onClick={() => onViewChange('about')}><strong>About</strong><span>Feature guide and scheduler explanation</span></button>
        <button type="button" onClick={() => onViewChange('notifications')}><strong>Notifications</strong><span>Reminder history and alerts</span></button>
        <button type="button" onClick={() => onViewChange('backup')}><strong>Backup</strong><span>Export and restore local data</span></button>
      </section>
    </div>
  );
}
