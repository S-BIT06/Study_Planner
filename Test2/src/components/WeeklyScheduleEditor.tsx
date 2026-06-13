import { useEffect, useMemo, useState } from 'react';
import { TimePickerField } from './TimePickerField';
import type {
  DayAvailability,
  DayName,
  EnergyLevel,
  TimeBlock,
  TimeBlockCategory
} from '../types';
import {
  blocksOverlap,
  CATEGORY_LABELS,
  createBlock,
  DAYS,
  dayStudyMinutes,
  ENERGY_LABELS,
  isStudyCategory,
  sortBlocks,
  timeToMinutes
} from '../utils/timeMap';

interface WeeklyScheduleEditorProps {
  value: DayAvailability[];
  onChange?: (value: DayAvailability[]) => void;
  maxDailyMinutes?: number;
  readOnly?: boolean;
}

const categories = Object.keys(CATEGORY_LABELS) as TimeBlockCategory[];
const energyLevels = Object.keys(ENERGY_LABELS) as EnergyLevel[];

function categoryClass(category: TimeBlockCategory): string {
  return category.toLowerCase().replaceAll('_', '-');
}

function newDraft(): TimeBlock {
  return createBlock('18:00', '19:00', 'PREFERRED_STUDY', 'HIGH', '', false);
}

export function WeeklyScheduleEditor({
  value,
  onChange,
  maxDailyMinutes = 1440,
  readOnly = false
}: WeeklyScheduleEditorProps) {
  const [activeDay, setActiveDay] = useState<DayName>('Monday');
  const [draft, setDraft] = useState<TimeBlock | null>(null);
  const [copyTarget, setCopyTarget] = useState<DayName>('Tuesday');
  const [error, setError] = useState('');

  const day = value.find((item) => item.day === activeDay) ?? { day: activeDay, blocks: [] };
  const sortedBlocks = useMemo(() => sortBlocks(day.blocks), [day.blocks]);
  const totalStudy = dayStudyMinutes(day, maxDailyMinutes);

  useEffect(() => {
    if (copyTarget === activeDay) {
      setCopyTarget(DAYS.find((dayName) => dayName !== activeDay) ?? 'Monday');
    }
  }, [activeDay, copyTarget]);

  const replaceDay = (nextDay: DayAvailability) => {
    onChange?.(value.map((item) => item.day === activeDay ? nextDay : item));
  };

  const saveDraft = () => {
    if (!draft || readOnly) return;
    const start = timeToMinutes(draft.startTime);
    const end = timeToMinutes(draft.endTime);

    if (end <= start) {
      setError('End time must be later than start time. Split overnight blocks at midnight.');
      return;
    }

    const overlaps = day.blocks.some((block) => block.id !== draft.id && blocksOverlap(block, draft));
    if (overlaps) {
      setError('This block overlaps another block. Edit or remove the conflicting time first.');
      return;
    }

    const normalized: TimeBlock = {
      ...draft,
      energyLevel: isStudyCategory(draft.category) ? draft.energyLevel : 'LOW',
      locked: isStudyCategory(draft.category) ? draft.locked : true
    };

    const exists = day.blocks.some((block) => block.id === normalized.id);
    replaceDay({
      ...day,
      blocks: sortBlocks(exists
        ? day.blocks.map((block) => block.id === normalized.id ? normalized : block)
        : [...day.blocks, normalized])
    });
    setDraft(null);
    setError('');
  };

  const removeBlock = (blockId: string) => {
    if (readOnly) return;
    replaceDay({ ...day, blocks: day.blocks.filter((block) => block.id !== blockId) });
    if (draft?.id === blockId) setDraft(null);
  };

  const copyDay = () => {
    if (readOnly || copyTarget === activeDay) return;
    const copied = day.blocks.map((block) => ({ ...block, id: `${block.id}-copy-${copyTarget}-${Date.now()}` }));
    onChange?.(value.map((item) => item.day === copyTarget ? { day: copyTarget, blocks: copied } : item));
  };

  return (
    <div className={`weekly-editor ${readOnly ? 'weekly-editor--readonly' : ''}`}>
      <div className="day-tabs" role="tablist" aria-label="Weekly timetable days">
        {DAYS.map((dayName) => {
          const item = value.find((entry) => entry.day === dayName) ?? { day: dayName, blocks: [] };
          const studyMinutes = dayStudyMinutes(item, maxDailyMinutes);
          return (
            <button
              key={dayName}
              type="button"
              className={dayName === activeDay ? 'is-active' : ''}
              onClick={() => {
                setActiveDay(dayName);
                setDraft(null);
                setError('');
              }}
            >
              <strong>{dayName.slice(0, 3)}</strong>
              <span>{studyMinutes ? `${studyMinutes}m` : 'off'}</span>
            </button>
          );
        })}
      </div>

      <div className="day-map-card">
        <header>
          <div>
            <span className="eyebrow">24-hour map</span>
            <h3>{activeDay}</h3>
          </div>
          <span className="time-chip">{Math.floor(totalStudy / 60)}h {totalStudy % 60}m study</span>
        </header>

        <div className="time-rail" aria-label={`${activeDay} 24-hour timetable`}>
          <div className="time-rail__ticks">
            {[0, 6, 12, 18, 24].map((hour) => <span key={hour} style={{ left: `${(hour / 24) * 100}%` }}>{String(hour).padStart(2, '0')}</span>)}
          </div>
          <div className="time-rail__track">
            {sortedBlocks.map((block) => {
              const start = timeToMinutes(block.startTime);
              const end = timeToMinutes(block.endTime);
              return (
                <button
                  key={block.id}
                  type="button"
                  disabled={readOnly}
                  className={`time-rail__block block--${categoryClass(block.category)}`}
                  style={{ left: `${(start / 1440) * 100}%`, width: `${((end - start) / 1440) * 100}%` }}
                  title={`${block.startTime}–${block.endTime} · ${CATEGORY_LABELS[block.category]}`}
                  onClick={() => setDraft({ ...block })}
                >
                  <span>{block.label || CATEGORY_LABELS[block.category]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="timeline-note">Unassigned time remains unavailable. To describe an overnight activity, create one block ending at 24:00 and another starting at 00:00.</p>
      </div>

      <div className="time-block-list">
        {sortedBlocks.map((block) => (
          <article className={`time-block-card block--${categoryClass(block.category)}`} key={block.id}>
            <div className="time-block-card__time">
              <strong>{block.startTime}</strong>
              <span>to</span>
              <strong>{block.endTime}</strong>
            </div>
            <div className="time-block-card__body">
              <strong>{block.label || CATEGORY_LABELS[block.category]}</strong>
              <span>
                {CATEGORY_LABELS[block.category]}
                {isStudyCategory(block.category) ? ` · ${ENERGY_LABELS[block.energyLevel]} · ${block.locked ? 'Locked' : 'Movable'}` : ''}
              </span>
            </div>
            {!readOnly && (
              <div className="time-block-card__actions">
                <button type="button" onClick={() => { setDraft({ ...block }); setError(''); }}>Edit</button>
                <button type="button" onClick={() => removeBlock(block.id)}>Delete</button>
              </div>
            )}
          </article>
        ))}

        {sortedBlocks.length === 0 && <div className="empty-inline">No blocks are defined. This entire day is unavailable to the scheduler.</div>}
      </div>

      {!readOnly && (
        <>
          <div className="schedule-actions">
            <button className="button button--ghost button--small" type="button" onClick={() => { setDraft(newDraft()); setError(''); }}>Add time block</button>
            <div className="copy-day-control">
              <select value={copyTarget} onChange={(event) => setCopyTarget(event.target.value as DayName)} aria-label="Copy schedule to day">
                {DAYS.filter((dayName) => dayName !== activeDay).map((dayName) => <option key={dayName}>{dayName}</option>)}
              </select>
              <button className="button button--ghost button--small" type="button" onClick={copyDay}>Copy day</button>
            </div>
            <button className="text-button text-button--danger" type="button" onClick={() => replaceDay({ ...day, blocks: [] })}>Clear {activeDay}</button>
          </div>

          {draft && (
            <section className="time-block-editor">
              <div className="section-heading">
                <div><span className="eyebrow">Time block</span><h3>{day.blocks.some((block) => block.id === draft.id) ? 'Edit block' : 'Add block'}</h3></div>
                <button className="icon-button" type="button" onClick={() => { setDraft(null); setError(''); }} aria-label="Close time block editor">×</button>
              </div>

              <div className="field-grid">
                <TimePickerField label="Start" value={draft.startTime} onChange={(startTime) => setDraft({ ...draft, startTime })} />
                <TimePickerField label="End" value={draft.endTime} allowEndOfDay onChange={(endTime) => setDraft({ ...draft, endTime })} />
              </div>

              <label>
                Block type
                <select value={draft.category} onChange={(event) => {
                  const category = event.target.value as TimeBlockCategory;
                  setDraft({
                    ...draft,
                    category,
                    energyLevel: isStudyCategory(category) ? draft.energyLevel : 'LOW',
                    locked: isStudyCategory(category) ? draft.locked : true
                  });
                }}>
                  {categories.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
                </select>
              </label>

              <label>
                Label <small>optional</small>
                <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Example: Anatomy deep work" />
              </label>

              {isStudyCategory(draft.category) && (
                <div className="field-grid">
                  <label>
                    Energy level
                    <select value={draft.energyLevel} onChange={(event) => setDraft({ ...draft, energyLevel: event.target.value as EnergyLevel })}>
                      {energyLevels.map((level) => <option key={level} value={level}>{ENERGY_LABELS[level]}</option>)}
                    </select>
                  </label>
                  <label className="toggle-card">
                    <input type="checkbox" checked={draft.locked} onChange={(event) => setDraft({ ...draft, locked: event.target.checked })} />
                    <span><strong>Lock this window</strong><small>A generated study session placed here can be protected from automatic rescheduling when locked.</small></span>
                  </label>
                </div>
              )}

              {error && <div className="warning-banner warning-banner--impossible"><strong>Cannot save block</strong><span>{error}</span></div>}

              <div className="button-row button-row--end">
                <button className="button button--ghost" type="button" onClick={() => { setDraft(null); setError(''); }}>Cancel</button>
                <button className="button button--primary" type="button" onClick={saveDraft}>Save block</button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
