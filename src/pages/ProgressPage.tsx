import { StatusDonut } from '../components/StatusDonut';
import type { StudyPlan } from '../types';
import { minutesLabel } from '../services/scheduler';

export function ProgressPage({ plan }: { plan: StudyPlan | null }) {
  if (!plan) {
    return <section className="section-card empty-state empty-state--large"><div className="empty-state__symbol">◉</div><h3>Progress begins with a plan</h3><p>Create a study plan to unlock subject analytics and study-time tracking.</p></section>;
  }

  const subjectMap = new Map<string, { total: number; complete: number }>();
  plan.tasks.forEach((task) => {
    if (task.taskType === 'Revision' || task.taskType === 'Mock Test') return;
    const entry = subjectMap.get(task.subject) ?? { total: 0, complete: 0 };
    entry.total += task.durationMinutes;
    if (task.status === 'COMPLETED') entry.complete += task.durationMinutes;
    subjectMap.set(task.subject, entry);
  });

  const total = plan.tasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const completed = plan.tasks.filter((task) => task.status === 'COMPLETED').reduce((sum, task) => sum + task.durationMinutes, 0);
  const overdue = plan.tasks.filter((task) => task.status === 'OVERDUE').reduce((sum, task) => sum + task.durationMinutes, 0);

  return (
    <div className="page-stack">
      <section className="section-card progress-hero">
        <span className="eyebrow">Learning telemetry</span>
        <h2>{plan.name}</h2>
        <StatusDonut tasks={plan.tasks} />
      </section>

      <section className="metric-grid metric-grid--three">
        <article><span>Planned</span><strong>{minutesLabel(total)}</strong><small>all sessions</small></article>
        <article><span>Completed</span><strong>{minutesLabel(completed)}</strong><small>recorded</small></article>
        <article><span>Overdue</span><strong>{minutesLabel(overdue)}</strong><small>recover soon</small></article>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Subject mastery</span><h3>Completion by study duration</h3></div></div>
        <div className="subject-progress-list">
          {[...subjectMap.entries()].map(([subject, value]) => {
            const percentage = value.total ? Math.round((value.complete / value.total) * 100) : 0;
            return (
              <div key={subject}>
                <header><strong>{subject}</strong><span>{percentage}%</span></header>
                <div className="progress-track"><span style={{ width: `${percentage}%` }} /></div>
                <small>{minutesLabel(value.complete)} of {minutesLabel(value.total)}</small>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
