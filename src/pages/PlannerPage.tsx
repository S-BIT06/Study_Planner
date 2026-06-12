import { useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { StatusDonut } from '../components/StatusDonut';
import type { StudyPlan, StudyTask, SyllabusTopic, UserProfile } from '../types';
import { minutesLabel } from '../services/scheduler';

function defaultExamDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function PlannerPage({
  profile,
  topics,
  plans,
  activePlan,
  onCreatePlan,
  onSelectPlan,
  onTaskStatus
}: {
  profile: UserProfile;
  topics: SyllabusTopic[];
  plans: StudyPlan[];
  activePlan: StudyPlan | null;
  onCreatePlan: (name: string, examDate: string, selectedTopics: SyllabusTopic[]) => void;
  onSelectPlan: (planId: string) => void;
  onTaskStatus: (taskId: string, status: StudyTask['status']) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [planName, setPlanName] = useState('Next examination plan');
  const [examDate, setExamDate] = useState(defaultExamDate());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const yearTopics = topics.filter((topic) => topic.year === profile.professionalYear);

  const upcomingTasks = useMemo(() => activePlan?.tasks
    .filter((task) => task.status !== 'COMPLETED')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 12) ?? [], [activePlan]);

  const submitPlan = () => {
    const selected = yearTopics.filter((topic) => selectedIds.has(topic.id));
    if (!planName.trim() || !examDate || selected.length === 0) return;
    onCreatePlan(planName.trim(), examDate, selected);
    setCreating(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="page-stack">
      <section className="planner-toolbar">
        <div>
          <span className="eyebrow">Offline scheduling engine</span>
          <h2>{activePlan ? activePlan.name : 'Build your first plan'}</h2>
        </div>
        <button className="button button--primary button--small" type="button" onClick={() => setCreating(true)}>New plan</button>
      </section>

      {plans.length > 1 && (
        <div className="plan-switcher">
          {plans.map((plan) => (
            <button key={plan.id} type="button" className={activePlan?.id === plan.id ? 'is-active' : ''} onClick={() => onSelectPlan(plan.id)}>
              {plan.name}
            </button>
          ))}
        </div>
      )}

      {!activePlan ? (
        <section className="section-card empty-state empty-state--large">
          <div className="empty-state__symbol">◇</div>
          <h3>No schedule exists yet</h3>
          <p>Create a plan, select curriculum topics, and the app will calculate workload, available hours, revision time, and schedule health.</p>
          <button className="button button--primary" type="button" onClick={() => setCreating(true)}>Create study plan</button>
        </section>
      ) : (
        <>
          <section className={`plan-health plan-health--${activePlan.feasibility.health.toLowerCase()}`}>
            <div>
              <span>{activePlan.feasibility.health}</span>
              <strong>{activePlan.feasibility.message}</strong>
            </div>
            <div className="plan-health__numbers">
              <span><b>{minutesLabel(activePlan.feasibility.requiredMinutes)}</b> required</span>
              <span><b>{minutesLabel(activePlan.feasibility.availableMinutes)}</b> available</span>
            </div>
          </section>

          <section className="section-card">
            <div className="section-heading">
              <div><span className="eyebrow">Schedule completion</span><h3>Progress by planned time</h3></div>
              <span className="time-chip">Exam {activePlan.examDate}</span>
            </div>
            <StatusDonut tasks={activePlan.tasks} />
          </section>

          <section className="metric-grid">
            <article><span>Topics</span><strong>{activePlan.topicIds.length}</strong><small>selected</small></article>
            <article><span>Sessions</span><strong>{activePlan.tasks.length}</strong><small>generated</small></article>
            <article><span>Unscheduled</span><strong>{minutesLabel(activePlan.feasibility.unscheduledMinutes)}</strong><small>needs adjustment</small></article>
            <article><span>Focus rhythm</span><strong>{profile.sessionMinutes}m</strong><small>per session</small></article>
          </section>

          <section className="section-card">
            <div className="section-heading">
              <div><span className="eyebrow">Next sessions</span><h3>Execution queue</h3></div>
            </div>
            <div className="planner-task-list">
              {upcomingTasks.map((task) => (
                <article key={task.id} className={`planner-task planner-task--${task.status.toLowerCase()}`}>
                  <div className="date-block"><strong>{new Date(`${task.date}T12:00:00`).toLocaleDateString(undefined, { day: '2-digit' })}</strong><span>{new Date(`${task.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span></div>
                  <div className="planner-task__body">
                    <span>{task.startTime} · {task.taskType} · {minutesLabel(task.durationMinutes)}</span>
                    <strong>{task.title}</strong>
                    <small>{task.subject}</small>
                  </div>
                  <select value={task.status} onChange={(event) => onTaskStatus(task.id, event.target.value as StudyTask['status'])} aria-label={`Status for ${task.title}`}>
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="COMPLETED">Complete</option>
                    <option value="SKIPPED">Skipped</option>
                  </select>
                </article>
              ))}
              {upcomingTasks.length === 0 && <p className="muted">All scheduled work is complete.</p>}
            </div>
          </section>
        </>
      )}

      {creating && (
        <Modal title="Create a study plan" onClose={() => setCreating(false)}>
          <div className="modal-form">
            <label>
              Plan name
              <input value={planName} onChange={(event) => setPlanName(event.target.value)} />
            </label>
            <label>
              Exam or target date
              <input type="date" min={new Date().toISOString().slice(0, 10)} value={examDate} onChange={(event) => setExamDate(event.target.value)} />
            </label>
            <div>
              <div className="modal-section-title"><strong>Select syllabus scope</strong><span>{selectedIds.size} selected</span></div>
              <div className="topic-picker">
                {yearTopics.map((topic) => (
                  <label key={topic.id} className={selectedIds.has(topic.id) ? 'is-selected' : ''}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(topic.id)}
                      onChange={(event) => {
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(topic.id); else next.delete(topic.id);
                          return next;
                        });
                      }}
                    />
                    <span><strong>{topic.title}</strong><small>{topic.subject} · {minutesLabel(topic.estimatedMinutes)}</small></span>
                  </label>
                ))}
              </div>
            </div>
            <div className="info-banner">The scheduler adds revision time and a mock-test block before checking feasibility.</div>
            <div className="button-row button-row--end">
              <button className="button button--ghost" type="button" onClick={() => setCreating(false)}>Cancel</button>
              <button className="button button--primary" type="button" disabled={!planName.trim() || !examDate || selectedIds.size === 0} onClick={submitPlan}>Generate schedule</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
