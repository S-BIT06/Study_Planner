import type { StudyTask, TaskStatus } from '../types';
import { minutesLabel } from '../services/scheduler';

const labels: Record<TaskStatus, string> = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In progress',
  PAUSED: 'Paused',
  PARTIAL: 'Partial',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
  SKIPPED: 'Skipped'
};

export function StatusDonut({ tasks }: { tasks: StudyTask[] }) {
  const statuses: TaskStatus[] = ['COMPLETED', 'IN_PROGRESS', 'PAUSED', 'PARTIAL', 'PENDING', 'OVERDUE', 'SKIPPED'];
  const totals = statuses.map((status) => ({
    status,
    minutes: tasks
      .filter((task) => task.status === status)
      .reduce((sum, task) => sum + task.durationMinutes, 0)
  }));
  const total = Math.max(1, totals.reduce((sum, item) => sum + item.minutes, 0));
  const completed = totals.find((item) => item.status === 'COMPLETED')?.minutes ?? 0;
  const percentage = Math.round((completed / total) * 100);

  let cursor = 0;
  const palette: Record<TaskStatus, string> = {
    COMPLETED: '#f4b942',
    IN_PROGRESS: '#9b5cff',
    PAUSED: '#6ccff6',
    PARTIAL: '#ff9f1c',
    PENDING: '#293138',
    OVERDUE: '#f72585',
    SKIPPED: '#66727a'
  };

  const gradient = totals
    .filter((item) => item.minutes > 0)
    .map((item) => {
      const start = cursor;
      cursor += (item.minutes / total) * 360;
      return `${palette[item.status]} ${start}deg ${cursor}deg`;
    })
    .join(', ');

  return (
    <div className="donut-layout">
      <div
        className="status-donut"
        style={{ background: gradient ? `conic-gradient(${gradient})` : '#1a2024' }}
        role="img"
        aria-label={`${percentage}% completed`}
      >
        <div className="status-donut__centre">
          <strong>{percentage}%</strong>
          <span>complete</span>
        </div>
      </div>
      <div className="donut-legend">
        {totals.filter((item) => item.status !== 'SKIPPED' || item.minutes > 0).map((item) => (
          <div key={item.status}>
            <i style={{ background: palette[item.status] }} />
            <span>{labels[item.status]}</span>
            <strong>{minutesLabel(item.minutes)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
