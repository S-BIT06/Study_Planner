import { useEffect, useMemo, useState } from 'react';
import type { ConfidenceLevel, StudyTask } from '../types';
import { minutesLabel } from '../services/scheduler';
import { Modal } from './Modal';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface TaskCompletionInput {
  taskId: string;
  status: StudyTask['status'];
  actualMinutes: number;
  completionPercent: number;
  remainingMinutes: number;
  confidence?: ConfidenceLevel;
  notes: string;
}

export function TaskSessionModal({
  task,
  onClose,
  onSave
}: {
  task: StudyTask;
  onClose: () => void;
  onSave: (input: TaskCompletionInput) => void;
}) {
  const [running, setRunning] = useState(task.status === 'IN_PROGRESS');
  const [seconds, setSeconds] = useState(Math.max(0, Math.round((task.actualMinutes ?? 0) * 60)));
  const [completionPercent, setCompletionPercent] = useState(task.completionPercent ?? (task.status === 'COMPLETED' ? 100 : 0));
  const [confidence, setConfidence] = useState<ConfidenceLevel>((task.confidence ?? 3) as ConfidenceLevel);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const actualMinutes = useMemo(() => Math.max(0, Math.round(seconds / 60)), [seconds]);
  const remainingMinutes = useMemo(() => clamp(Math.round(task.durationMinutes * (100 - completionPercent) / 100), 0, task.durationMinutes), [completionPercent, task.durationMinutes]);
  const elapsedLabel = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const submit = (status: StudyTask['status']) => {
    const completedPercent = status === 'COMPLETED' ? 100 : status === 'PARTIAL' ? clamp(completionPercent, 1, 99) : completionPercent;
    onSave({
      taskId: task.id,
      status,
      actualMinutes,
      completionPercent: completedPercent,
      remainingMinutes: status === 'COMPLETED' ? 0 : Math.max(1, remainingMinutes),
      confidence,
      notes
    });
  };

  return (
    <Modal title="Study session" onClose={onClose}>
      <div className="session-modal">
        <div className="session-task-card">
          <span className="eyebrow">{task.subject}</span>
          <h3>{task.title}</h3>
          <div className="task-meta"><span>{task.taskType}</span><span>{task.date} · {task.startTime}</span><span>{minutesLabel(task.durationMinutes)}</span></div>
        </div>

        <div className="timer-orb">
          <strong>{elapsedLabel}</strong>
          <span>actual time</span>
        </div>

        <div className="button-row">
          <button className="button button--primary" type="button" onClick={() => setRunning(true)}>Start</button>
          <button className="button button--ghost" type="button" onClick={() => setRunning(false)}>Pause</button>
          <button className="button button--ghost" type="button" onClick={() => { setRunning(false); setSeconds(0); }}>Reset timer</button>
        </div>

        <div className="field-grid">
          <label>
            Manual actual minutes
            <input type="number" min="0" value={actualMinutes} onChange={(event) => setSeconds(Math.max(0, Number(event.target.value)) * 60)} />
          </label>
          <label>
            Completion percentage
            <input type="number" min="0" max="100" value={completionPercent} onChange={(event) => setCompletionPercent(clamp(Number(event.target.value), 0, 100))} />
          </label>
        </div>

        <label>
          Confidence after studying
          <select value={confidence} onChange={(event) => setConfidence(Number(event.target.value) as ConfidenceLevel)}>
            <option value={1}>1 — Could not recall</option>
            <option value={2}>2 — Needs major revision</option>
            <option value={3}>3 — Partially confident</option>
            <option value={4}>4 — Confident</option>
            <option value={5}>5 — Mastered</option>
          </select>
        </label>

        <label>
          Notes <small>optional</small>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What was hard? What needs revision?" />
        </label>

        <div className="info-banner">Remaining work estimate: {minutesLabel(remainingMinutes)}. Low confidence creates an extra recovery revision.</div>

        <div className="button-row button-row--end">
          <button className="button button--ghost" type="button" onClick={() => submit('SKIPPED')}>Skip</button>
          <button className="button button--ghost" type="button" onClick={() => submit('PARTIAL')}>Save partial</button>
          <button className="button button--primary" type="button" onClick={() => submit('COMPLETED')}>Complete</button>
        </div>
      </div>
    </Modal>
  );
}
