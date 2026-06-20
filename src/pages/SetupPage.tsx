import { useMemo, useState } from 'react';
import { BrandMark } from '../components/BrandMark';
import { WeeklyScheduleEditor } from '../components/WeeklyScheduleEditor';
import { SCHEDULER_DEFAULTS } from '../config/schedulerDefaults';
import type { FocusPeriod, ProfessionalYear, UserProfile } from '../types';
import { defaultAvailability, PROFESSIONAL_YEARS, studyBlockCount, weeklyStudyMinutes } from '../utils/timeMap';

export function SetupPage({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [professionalYear, setProfessionalYear] = useState<ProfessionalYear>('I Professional');
  const [availability, setAvailability] = useState(defaultAvailability());
  const [sessionMinutes, setSessionMinutes] = useState(SCHEDULER_DEFAULTS.sessionMinutes);
  const [breakMinutes, setBreakMinutes] = useState(SCHEDULER_DEFAULTS.breakMinutes);
  const [maxDailyMinutes, setMaxDailyMinutes] = useState(SCHEDULER_DEFAULTS.maxDailyMinutes);
  const [focusPeriod, setFocusPeriod] = useState<FocusPeriod>(SCHEDULER_DEFAULTS.focusPeriod);
  const [notificationsEnabled, setNotificationsEnabled] = useState(SCHEDULER_DEFAULTS.notificationsEnabled);
  const [reminderMinutes, setReminderMinutes] = useState(SCHEDULER_DEFAULTS.reminderMinutes);

  const weeklyMinutes = useMemo(
    () => weeklyStudyMinutes(availability, maxDailyMinutes),
    [availability, maxDailyMinutes]
  );
  const studyWindows = useMemo(() => studyBlockCount(availability), [availability]);

  const submit = () => {
    if (!name.trim()) return;
    onComplete({
      name: name.trim(),
      college: college.trim(),
      professionalYear,
      curriculumVersion: 'NCISM current / 3 Professional BAMS structure',
      sessionMinutes,
      breakMinutes,
      maxDailyMinutes,
      focusPeriod,
      notificationsEnabled,
      reminderMinutes,
      availability,
      dateExceptions: []
    });
  };

  return (
    <div className="setup-page">
      <div className="setup-orbit setup-orbit--one" />
      <div className="setup-orbit setup-orbit--two" />
      <header className="setup-header">
        <BrandMark />
        <div className="step-indicator" aria-label={`Setup step ${step} of 4`}>
          {[1, 2, 3, 4].map((number) => <span key={number} className={number <= step ? 'is-active' : ''} />)}
        </div>
      </header>

      <main className={`setup-card ornate-card ${step === 2 ? 'setup-card--wide' : ''}`}>
        {step === 1 && (
          <section>
            <span className="eyebrow">Step 01 · Identity</span>
            <h1>Build your study profile</h1>
            <p className="muted">These details remain on this device and shape every schedule the app creates.</p>
            <label>
              Student name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" autoFocus />
            </label>
            <label>
              College <small>optional</small>
              <input value={college} onChange={(event) => setCollege(event.target.value)} placeholder="College name" />
            </label>
            <label>
              Professional year
              <select value={professionalYear} onChange={(event) => setProfessionalYear(event.target.value as ProfessionalYear)}>
                {PROFESSIONAL_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </section>
        )}

        {step === 2 && (
          <section>
            <span className="eyebrow">Step 02 · Complete time map</span>
            <h1>Shape all twenty-four hours</h1>
            <p className="muted">Map sleep, college, travel, meals, rest, and every study window. Only blocks marked for study can receive syllabus sessions.</p>
            <WeeklyScheduleEditor
              value={availability}
              onChange={setAvailability}
              maxDailyMinutes={maxDailyMinutes}
            />
          </section>
        )}

        {step === 3 && (
          <section>
            <span className="eyebrow">Step 03 · Study rhythm</span>
            <h1>Shape the sessions</h1>
            <div className="field-grid">
              <label>
                Preferred session length
                <select value={sessionMinutes} onChange={(event) => setSessionMinutes(Number(event.target.value))}>
                  <option value={30}>30 minutes</option>
                  <option value={35}>35 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={50}>50 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={75}>75 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </label>
              <label>
                Break length
                <select value={breakMinutes} onChange={(event) => setBreakMinutes(Number(event.target.value))}>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </label>
              <label>
                Daily study cap
                <select value={maxDailyMinutes} onChange={(event) => setMaxDailyMinutes(Number(event.target.value))}>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={300}>5 hours</option>
                  <option value={360}>6 hours</option>
                  <option value={480}>8 hours</option>
                  <option value={600}>10 hours</option>
                  <option value={720}>12 hours</option>
                  <option value={1440}>Use every marked study window</option>
                </select>
              </label>
              <label>
                General focus preference
                <select value={focusPeriod} onChange={(event) => setFocusPeriod(event.target.value as FocusPeriod)}>
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                  <option>Flexible</option>
                </select>
              </label>
            </div>
            <div className="info-banner">Each study block already has its own energy level. The general focus preference is used only as a fallback.</div>
            <div className="notification-box">
              <label className="toggle-row">
                <input type="checkbox" checked={notificationsEnabled} onChange={(event) => setNotificationsEnabled(event.target.checked)} />
                <span>
                  <strong>Local reminders</strong>
                  <small>Notifications stay on this phone.</small>
                </span>
              </label>
              {notificationsEnabled && (
                <label>
                  Alert before a session
                  <select value={reminderMinutes} onChange={(event) => setReminderMinutes(Number(event.target.value))}>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </label>
              )}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <span className="eyebrow">Step 04 · Review</span>
            <h1>Your planning foundation</h1>
            <div className="setup-summary">
              <div><span>Student</span><strong>{name || 'Not entered'}</strong></div>
              <div><span>Course stage</span><strong>{professionalYear}</strong></div>
              <div><span>Study windows</span><strong>{studyWindows} across the week</strong></div>
              <div><span>Weekly capacity</span><strong>{Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m</strong></div>
              <div><span>Study rhythm</span><strong>{sessionMinutes}m + {breakMinutes}m break</strong></div>
              <div><span>Daily cap</span><strong>{maxDailyMinutes === 1440 ? 'All marked windows' : `${maxDailyMinutes / 60} hours`}</strong></div>
              <div><span>Reminders</span><strong>{notificationsEnabled ? `${reminderMinutes}m before` : 'Disabled'}</strong></div>
            </div>
            {studyWindows === 0 && <div className="warning-banner warning-banner--impossible"><strong>No study windows</strong><span>Add at least one study-capable time block before creating a plan.</span></div>}
            <div className="info-banner">No schedule is created yet. After setup, choose an exam and syllabus scope from the Planner.</div>
          </section>
        )}

        <footer className="setup-actions">
          {step > 1 && <button type="button" className="button button--ghost" onClick={() => setStep((value) => value - 1)}>Back</button>}
          {step < 4 ? (
            <button type="button" className="button button--primary" disabled={step === 1 && !name.trim()} onClick={() => setStep((value) => value + 1)}>Continue</button>
          ) : (
            <button type="button" className="button button--primary" disabled={!name.trim() || studyWindows === 0} onClick={submit}>Enter planner</button>
          )}
        </footer>
      </main>
    </div>
  );
}
