import { useMemo, useState } from 'react';
import type { DateException, DayAvailability, TimeBlock } from '../types';
import { createBlock } from '../utils/timeMap';
import { WeeklyScheduleEditor } from './WeeklyScheduleEditor';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newException(): DateException {
  const at = new Date().toISOString();
  return {
    id: `exception-${Date.now()}`,
    date: today(),
    label: 'Special day',
    blocks: [createBlock('09:00', '12:00', 'PREFERRED_STUDY', 'HIGH', 'Holiday study window', false)],
    createdAt: at,
    updatedAt: at
  };
}

function toDayAvailability(exception: DateException): DayAvailability[] {
  return [{ day: 'Monday', blocks: exception.blocks }];
}

export function DateExceptionEditor({
  value,
  onChange,
  maxDailyMinutes
}: {
  value: DateException[];
  onChange: (value: DateException[]) => void;
  maxDailyMinutes: number;
}) {
  const [activeId, setActiveId] = useState(value[0]?.id ?? '');
  const active = useMemo(() => value.find((item) => item.id === activeId) ?? value[0] ?? null, [activeId, value]);

  const addException = () => {
    const next = newException();
    onChange([...value, next]);
    setActiveId(next.id);
  };

  const updateException = (next: DateException) => {
    onChange(value.map((item) => item.id === next.id ? { ...next, updatedAt: new Date().toISOString() } : item));
  };

  const removeException = (id: string) => {
    const remaining = value.filter((item) => item.id !== id);
    onChange(remaining);
    setActiveId(remaining[0]?.id ?? '');
  };

  return (
    <section className="section-card date-exception-editor">
      <div className="section-heading">
        <div><span className="eyebrow">Calendar exceptions</span><h3>Special one-day schedules</h3></div>
        <button className="button button--ghost button--small" type="button" onClick={addException}>Add date</button>
      </div>
      <p className="muted">Use this for holidays, postings, family events, or one-day availability changes. A date exception replaces the normal weekly timetable only for that date.</p>

      {value.length > 0 && (
        <div className="plan-switcher">
          {value.map((item) => (
            <button key={item.id} type="button" className={active?.id === item.id ? 'is-active' : ''} onClick={() => setActiveId(item.id)}>
              {item.date}
            </button>
          ))}
        </div>
      )}

      {!active ? (
        <div className="empty-inline">No date exceptions. The regular weekly map will be used every week.</div>
      ) : (
        <div className="exception-card">
          <div className="field-grid">
            <label>Date<input type="date" value={active.date} onChange={(event) => updateException({ ...active, date: event.target.value })} /></label>
            <label>Label<input value={active.label} onChange={(event) => updateException({ ...active, label: event.target.value })} /></label>
          </div>
          <WeeklyScheduleEditor
            value={toDayAvailability(active)}
            maxDailyMinutes={maxDailyMinutes}
            onChange={(days) => updateException({ ...active, blocks: (days[0]?.blocks ?? []) as TimeBlock[] })}
          />
          <button className="text-button text-button--danger" type="button" onClick={() => removeException(active.id)}>Delete this date exception</button>
        </div>
      )}
    </section>
  );
}
