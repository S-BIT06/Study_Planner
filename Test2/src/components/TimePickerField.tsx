import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';

function parse(value: string): { hour: number; minute: number } {
  if (value === '24:00') return { hour: 24, minute: 0 };
  const [hour, minute] = value.split(':').map(Number);
  return { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 };
}

function format(hour: number, minute: number): string {
  if (hour === 24) return '24:00';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function TimePickerField({
  label,
  value,
  onChange,
  allowEndOfDay = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowEndOfDay?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parse(value), [value]);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);

  useEffect(() => {
    if (!open) return;
    setHour(parsed.hour);
    setMinute(parsed.minute);
  }, [open, parsed.hour, parsed.minute]);

  const hours = Array.from({ length: allowEndOfDay ? 25 : 24 }, (_, index) => index);
  const minutes = Array.from({ length: 60 }, (_, index) => index);
  const normalizedMinute = hour === 24 ? 0 : minute;

  const apply = () => {
    onChange(format(hour, normalizedMinute));
    setOpen(false);
  };

  return (
    <div className="time-picker-field">
      <span>{label}</span>
      <button className="clock-time-button" type="button" onClick={() => setOpen(true)}>
        <span>{value}</span>
        <small>Tap to adjust</small>
      </button>
      {open && (
        <Modal title={`Set ${label.toLowerCase()}`} onClose={() => setOpen(false)}>
          <div className="clock-picker">
            <div className="clock-face" aria-hidden="true">
              <div className="clock-face__ring" />
              <strong>{format(hour, normalizedMinute)}</strong>
              <span>minute precise</span>
            </div>
            <div className="clock-wheels">
              <label>
                Hour
                <select value={hour} onChange={(event) => {
                  const next = Number(event.target.value);
                  setHour(next);
                  if (next === 24) setMinute(0);
                }}>
                  {hours.map((item) => <option key={item} value={item}>{String(item).padStart(2, '0')}</option>)}
                </select>
              </label>
              <label>
                Minute
                <select value={normalizedMinute} disabled={hour === 24} onChange={(event) => setMinute(Number(event.target.value))}>
                  {minutes.map((item) => <option key={item} value={item}>{String(item).padStart(2, '0')}</option>)}
                </select>
              </label>
            </div>
            <p className="muted">This behaves like a phone time picker: choose the hour and any exact minute. Use 24:00 only for an end-of-day block.</p>
            <div className="button-row button-row--end">
              <button className="button button--ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="button button--primary" type="button" onClick={apply}>Use time</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
