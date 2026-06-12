import type { StudyPlan, StudyTask, UserProfile } from '../types';
import { minutesLabel } from '../services/scheduler';

function todayString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function HomePage({
  profile,
  plan,
  onOpenPlanner,
  onTaskStatus
}: {
  profile: UserProfile;
  plan: StudyPlan | null;
  onOpenPlanner: () => void;
  onTaskStatus: (taskId: string, status: StudyTask['status']) => void;
}) {
  const today = todayString();
  const todayTasks = plan?.tasks.filter((task) => task.date === today) ?? [];
  const completedToday = todayTasks.filter((task) => task.status === 'COMPLETED');
  const plannedMinutes = todayTasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const completedMinutes = completedToday.reduce((sum, task) => sum + task.durationMinutes, 0);
  const nextTask = todayTasks.find((task) => task.status !== 'COMPLETED')
    ?? plan?.tasks.find((task) => task.date > today && task.status !== 'COMPLETED');

  if (!plan) {
    return (
      <div className="page-stack">
        <section className="hero-card ornate-card">
          <span className="eyebrow">Welcome, {profile.name}</span>
          <h2>Turn the syllabus into a path you can actually walk.</h2>
          <p>You have completed setup. Create an exam plan to generate your first offline schedule.</p>
          <button className="button button--primary" type="button" onClick={onOpenPlanner}>Create first study plan</button>
          <div className="hero-sigil" aria-hidden="true"><span /></div>
        </section>
        <section className="section-card empty-state">
          <div className="empty-state__symbol">◇</div>
          <h3>No active plan</h3>
          <p>Select syllabus topics, choose an exam date, and let the scheduler test whether the plan is realistic.</p>
        </section>
      </div>
    );
  }

  const totalMinutes = plan.tasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const totalCompleted = plan.tasks.filter((task) => task.status === 'COMPLETED').reduce((sum, task) => sum + task.durationMinutes, 0);
  const overallPercent = totalMinutes ? Math.round((totalCompleted / totalMinutes) * 100) : 0;
  const examDays = Math.max(0, Math.ceil((new Date(`${plan.examDate}T12:00:00`).getTime() - Date.now()) / 86_400_000));

  return (
    <div className="page-stack">
      <section className="home-hero ornate-card">
        <div>
          <span className="eyebrow">Today’s command centre</span>
          <h2>{profile.name}, keep the chain moving.</h2>
          <p>{plan.name}</p>
        </div>
        <div className="compact-ring" style={{ '--progress': `${overallPercent * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{overallPercent}%</strong><span>plan</span></div>
        </div>
      </section>

      <section className="metric-grid metric-grid--three">
        <article><span>Today</span><strong>{minutesLabel(plannedMinutes)}</strong><small>{todayTasks.length} sessions</small></article>
        <article><span>Completed</span><strong>{minutesLabel(completedMinutes)}</strong><small>{completedToday.length} done</small></article>
        <article><span>Exam</span><strong>{examDays}</strong><small>days left</small></article>
      </section>

      {plan.feasibility.health !== 'FEASIBLE' && (
        <section className={`warning-banner warning-banner--${plan.feasibility.health.toLowerCase()}`}>
          <strong>{plan.feasibility.health === 'IMPOSSIBLE' ? 'Schedule conflict' : 'Tight schedule'}</strong>
          <span>{plan.feasibility.message}</span>
        </section>
      )}

      <section className="section-card focus-card">
        <div className="section-heading">
          <div><span className="eyebrow">Next focus</span><h3>{nextTask ? nextTask.subject : 'Day complete'}</h3></div>
          {nextTask && <span className="time-chip">{nextTask.date === today ? nextTask.startTime : nextTask.date}</span>}
        </div>
        {nextTask ? (
          <>
            <h2>{nextTask.title}</h2>
            <div className="task-meta"><span>{nextTask.taskType}</span><span>{minutesLabel(nextTask.durationMinutes)}</span></div>
            <div className="button-row">
              <button className="button button--primary" type="button" onClick={() => onTaskStatus(nextTask.id, 'IN_PROGRESS')}>Start session</button>
              <button className="button button--ghost" type="button" onClick={() => onTaskStatus(nextTask.id, 'COMPLETED')}>Mark complete</button>
            </div>
          </>
        ) : <p className="muted">No unfinished session is currently scheduled.</p>}
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div><span className="eyebrow">Today’s sequence</span><h3>Study timeline</h3></div>
          <button className="text-button" type="button" onClick={onOpenPlanner}>Full plan</button>
        </div>
        {todayTasks.length ? (
          <div className="timeline-list">
            {todayTasks.map((task) => (
              <button className={`timeline-item timeline-item--${task.status.toLowerCase()}`} key={task.id} type="button" onClick={() => onTaskStatus(task.id, task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}>
                <time>{task.startTime}</time>
                <span className="timeline-dot" />
                <div><strong>{task.title}</strong><small>{task.subject} · {minutesLabel(task.durationMinutes)}</small></div>
                <span className="status-glyph">{task.status === 'COMPLETED' ? '✓' : '›'}</span>
              </button>
            ))}
          </div>
        ) : <p className="muted">No sessions are scheduled today. Use the Planner to inspect the next study day.</p>}
      </section>
    </div>
  );
}
