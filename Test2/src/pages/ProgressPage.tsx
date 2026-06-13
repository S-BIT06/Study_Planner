import { StatusDonut } from '../components/StatusDonut';
import type { ConfidenceRecord, StudyAttempt, StudyPlan } from '../types';
import { minutesLabel } from '../services/scheduler';

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function ProgressPage({ plan, attempts, confidenceRecords }: { plan: StudyPlan | null; attempts: StudyAttempt[]; confidenceRecords: ConfidenceRecord[] }) {
  if (!plan) {
    return <section className="section-card empty-state empty-state--large"><div className="empty-state__symbol">◉</div><h3>Progress begins with a plan</h3><p>Create a study plan to unlock subject analytics and study-time tracking.</p></section>;
  }

  const subjectMap = new Map<string, { total: number; complete: number; actual: number }>();
  plan.tasks.forEach((task) => {
    if (task.taskType === 'Revision' || task.taskType === 'Mock Test') return;
    const entry = subjectMap.get(task.subject) ?? { total: 0, complete: 0, actual: 0 };
    entry.total += task.durationMinutes;
    if (task.status === 'COMPLETED') entry.complete += task.durationMinutes;
    entry.actual += task.actualMinutes ?? 0;
    subjectMap.set(task.subject, entry);
  });

  const planAttempts = attempts.filter((attempt) => attempt.planId === plan.id);
  const planConfidence = confidenceRecords.filter((record) => record.planId === plan.id);
  const total = plan.tasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const completed = plan.tasks.filter((task) => task.status === 'COMPLETED').reduce((sum, task) => sum + task.durationMinutes, 0);
  const overdue = plan.tasks.filter((task) => task.status === 'OVERDUE').reduce((sum, task) => sum + task.durationMinutes, 0);
  const actual = planAttempts.reduce((sum, attempt) => sum + attempt.actualMinutes, 0);
  const missed = plan.tasks.filter((task) => task.status === 'SKIPPED' || task.status === 'OVERDUE').length;
  const averageConfidence = average(planConfidence.map((record) => record.confidence));
  const adherence = plan.tasks.length ? Math.max(0, Math.round(((plan.tasks.length - missed) / plan.tasks.length) * 100)) : 0;

  const weeklyMap = new Map<string, number>();
  planAttempts.forEach((attempt) => {
    const date = attempt.endedAt ?? attempt.startedAt;
    const weekKey = date.slice(0, 10);
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + attempt.actualMinutes);
  });

  return (
    <div className="page-stack">
      <section className="section-card progress-hero">
        <span className="eyebrow">Learning telemetry</span>
        <h2>{plan.name}</h2>
        <StatusDonut tasks={plan.tasks} />
      </section>

      <section className="metric-grid metric-grid--three">
        <article><span>Planned</span><strong>{minutesLabel(total)}</strong><small>all sessions</small></article>
        <article><span>Completed</span><strong>{minutesLabel(completed)}</strong><small>planned time</small></article>
        <article><span>Actual</span><strong>{minutesLabel(actual)}</strong><small>timer/manual</small></article>
      </section>

      <section className="metric-grid metric-grid--three">
        <article><span>Overdue</span><strong>{minutesLabel(overdue)}</strong><small>recover soon</small></article>
        <article><span>Confidence</span><strong>{averageConfidence || '—'}</strong><small>average / 5</small></article>
        <article><span>Adherence</span><strong>{adherence}%</strong><small>not missed</small></article>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Subject progress</span><h3>Planned vs actual effort</h3></div></div>
        <div className="subject-progress-list">
          {[...subjectMap.entries()].map(([subject, value]) => {
            const percentage = value.total ? Math.round((value.complete / value.total) * 100) : 0;
            return (
              <div key={subject}>
                <header><strong>{subject}</strong><span>{percentage}%</span></header>
                <div className="progress-track"><span style={{ width: `${percentage}%` }} /></div>
                <small>{minutesLabel(value.complete)} completed · {minutesLabel(value.actual)} actual</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Study history</span><h3>Recent actual-time entries</h3></div></div>
        <div className="history-list">
          {planAttempts.slice(0, 8).map((attempt) => (
            <article key={attempt.id}><strong>{minutesLabel(attempt.actualMinutes)}</strong><span>{attempt.completionPercent}% complete · confidence {attempt.confidence ?? '—'}</span><small>{attempt.endedAt ?? attempt.startedAt}</small></article>
          ))}
          {planAttempts.length === 0 && <p className="muted">No actual study attempts recorded yet. Start a session from Home or Planner.</p>}
        </div>
      </section>
    </div>
  );
}
