import { useState } from 'react';
import { ResetCenter } from '../components/ResetCenter';
import { WeeklyScheduleEditor } from '../components/WeeklyScheduleEditor';
import {
  applySchedulerDefaults,
  isSchedulerSettingDefault,
  resetSchedulerSetting,
  SCHEDULER_DEFAULTS,
  type SchedulerSettingKey
} from '../config/schedulerDefaults';
import type {
  FocusPeriod,
  ProfessionalYear,
  ResetScope,
  StudyPlan,
  UserProfile
} from '../types';
import {
  DAYS,
  defaultAvailability,
  studyBlockCount,
  weeklyStudyMinutes
} from '../utils/timeMap';

function emptyAvailability() {
  return DAYS.map((day) => ({ day, blocks: [] }));
}

export function ProfilePage({
  profile,
  plans,
  onRequestSave,
  onRequestDataReset
}: {
  profile: UserProfile;
  plans: StudyPlan[];
  onRequestSave: (profile: UserProfile, reason: string) => void;
  onRequestDataReset: (scope: ResetScope) => void;
}) {
  const [draft, setDraft] = useState<UserProfile>(() => structuredClone(profile));
  const [editing, setEditing] = useState(false);

  const save = () => {
    onRequestSave(draft, 'Apply profile and timetable changes');
    setEditing(false);
  };

  const cancel = () => {
    setDraft(structuredClone(profile));
    setEditing(false);
  };

  const requestSettingReset = (key: SchedulerSettingKey, label: string) => {
    onRequestSave(resetSchedulerSetting(profile, key), `Reset ${label}`);
  };

  const requestReminderReset = () => {
    onRequestSave({
      ...profile,
      notificationsEnabled: SCHEDULER_DEFAULTS.notificationsEnabled,
      reminderMinutes: SCHEDULER_DEFAULTS.reminderMinutes
    }, 'Reset session reminder defaults');
  };

  const weeklyMinutes = weeklyStudyMinutes(profile.availability, profile.maxDailyMinutes);
  const windows = studyBlockCount(profile.availability);
  const remindersAreDefault = profile.notificationsEnabled === SCHEDULER_DEFAULTS.notificationsEnabled
    && profile.reminderMinutes === SCHEDULER_DEFAULTS.reminderMinutes;

  return (
    <div className="page-stack">
      <section className="profile-identity ornate-card">
        <div className="profile-avatar"><span>{profile.name.slice(0, 1).toUpperCase()}</span></div>
        <div><span className="eyebrow">Local student profile</span><h2>{profile.name}</h2><p>{profile.professionalYear}{profile.college ? ` · ${profile.college}` : ''}</p></div>
        <button className="button button--ghost button--small" type="button" onClick={() => editing ? cancel() : setEditing(true)}>{editing ? 'Cancel' : 'Edit'}</button>
      </section>

      {editing ? (
        <section className="section-card profile-form">
          <div className="section-heading"><div><span className="eyebrow">Editable settings</span><h3>Profile and 24-hour timetable</h3></div></div>
          <label>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>College<input value={draft.college} onChange={(event) => setDraft({ ...draft, college: event.target.value })} /></label>
          <div className="field-grid">
            <label>Professional year<select value={draft.professionalYear} onChange={(event) => setDraft({ ...draft, professionalYear: event.target.value as ProfessionalYear })}><option>I Professional</option><option>II Professional</option><option>III Professional</option><option>IV Professional</option></select></label>
            <label>General focus preference<select value={draft.focusPeriod} onChange={(event) => setDraft({ ...draft, focusPeriod: event.target.value as FocusPeriod })}><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Flexible</option></select></label>
            <label>Session minutes<input type="number" min="15" step="5" value={draft.sessionMinutes} onChange={(event) => setDraft({ ...draft, sessionMinutes: Number(event.target.value) })} /></label>
            <label>Break minutes<input type="number" min="0" step="5" value={draft.breakMinutes} onChange={(event) => setDraft({ ...draft, breakMinutes: Number(event.target.value) })} /></label>
            <label>Maximum daily minutes<input type="number" min="60" max="1440" step="30" value={draft.maxDailyMinutes} onChange={(event) => setDraft({ ...draft, maxDailyMinutes: Number(event.target.value) })} /></label>
            <label>Session reminders<select value={draft.notificationsEnabled ? String(draft.reminderMinutes) : 'OFF'} onChange={(event) => {
              const value = event.target.value;
              setDraft({
                ...draft,
                notificationsEnabled: value !== 'OFF',
                reminderMinutes: value === 'OFF' ? draft.reminderMinutes : Number(value)
              });
            }}><option value="OFF">Disabled</option><option value="5">5 minutes before</option><option value="10">10 minutes before</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option></select></label>
          </div>

          <WeeklyScheduleEditor
            value={draft.availability}
            onChange={(availability) => setDraft((current) => ({ ...current, availability }))}
            maxDailyMinutes={draft.maxDailyMinutes}
          />

          <div className="warning-banner warning-banner--tight"><strong>Schedule impact</strong><span>Saving timetable changes will preview and then regenerate only future unfinished sessions across {plans.length} plan(s). Completed and historical work will remain untouched.</span></div>
          <div className="button-row button-row--end"><button className="button button--primary" type="button" onClick={save}>Review changes</button></div>
        </section>
      ) : (
        <>
          <section className="section-card">
            <div className="section-heading"><div><span className="eyebrow">Twenty-four-hour map</span><h3>Weekly availability</h3></div><span className="time-chip">{windows} study windows</span></div>
            <WeeklyScheduleEditor value={profile.availability} maxDailyMinutes={profile.maxDailyMinutes} readOnly />
          </section>

          <section className="section-card">
            <div className="section-heading"><div><span className="eyebrow">Study rhythm</span><h3>Scheduler defaults</h3></div><span className="time-chip">Resettable</span></div>
            <div className="settings-list settings-list--resettable">
              <div>
                <span>Session length</span>
                <div className="setting-value"><strong>{profile.sessionMinutes} minutes</strong><button type="button" disabled={isSchedulerSettingDefault(profile, 'sessionMinutes')} onClick={() => requestSettingReset('sessionMinutes', 'session length')}>Reset</button></div>
              </div>
              <div>
                <span>Break length</span>
                <div className="setting-value"><strong>{profile.breakMinutes} minutes</strong><button type="button" disabled={isSchedulerSettingDefault(profile, 'breakMinutes')} onClick={() => requestSettingReset('breakMinutes', 'break length')}>Reset</button></div>
              </div>
              <div>
                <span>Weekly study capacity</span>
                <div className="setting-value"><strong>{Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m</strong><em>Calculated</em></div>
              </div>
              <div>
                <span>Maximum daily study</span>
                <div className="setting-value"><strong>{profile.maxDailyMinutes === 1440 ? 'Every marked window' : `${Math.floor(profile.maxDailyMinutes / 60)}h ${profile.maxDailyMinutes % 60}m`}</strong><button type="button" disabled={isSchedulerSettingDefault(profile, 'maxDailyMinutes')} onClick={() => requestSettingReset('maxDailyMinutes', 'daily study cap')}>Reset</button></div>
              </div>
              <div>
                <span>Strongest focus period</span>
                <div className="setting-value"><strong>{profile.focusPeriod}</strong><button type="button" disabled={isSchedulerSettingDefault(profile, 'focusPeriod')} onClick={() => requestSettingReset('focusPeriod', 'focus period')}>Reset</button></div>
              </div>
              <div>
                <span>Session reminders</span>
                <div className="setting-value"><strong>{profile.notificationsEnabled ? `${profile.reminderMinutes} minutes before` : 'Disabled'}</strong><button type="button" disabled={remindersAreDefault} onClick={requestReminderReset}>Reset</button></div>
              </div>
            </div>
          </section>

          <ResetCenter
            hasPlans={plans.length > 0}
            onResetSchedulerDefaults={() => onRequestSave(applySchedulerDefaults(profile), 'Restore all scheduler defaults')}
            onRestoreTimetable={() => onRequestSave({ ...profile, availability: defaultAvailability() }, 'Restore the starter 24-hour timetable')}
            onClearTimetable={() => onRequestSave({ ...profile, availability: emptyAvailability() }, 'Clear the 24-hour weekly timetable')}
            onRequestDataReset={onRequestDataReset}
          />

          <section className="section-card">
            <div className="section-heading"><div><span className="eyebrow">Local data</span><h3>Device storage</h3></div></div>
            <p className="muted">Your profile, schedules and progress are stored on this phone. Cloud login and sync are not active. Use the reset centre above to erase only the section you intend to replace.</p>
          </section>
        </>
      )}
    </div>
  );
}
