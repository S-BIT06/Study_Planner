import type { ResetScope } from '../types';

export function ResetCenter({
  hasPlans,
  onResetSchedulerDefaults,
  onRestoreTimetable,
  onClearTimetable,
  onRequestDataReset
}: {
  hasPlans: boolean;
  onResetSchedulerDefaults: () => void;
  onRestoreTimetable: () => void;
  onClearTimetable: () => void;
  onRequestDataReset: (scope: ResetScope) => void;
}) {
  return (
    <section className="section-card reset-center">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Reset centre</span>
          <h3>Restore only what you need</h3>
        </div>
      </div>

      <p className="muted reset-center__intro">
        Each reset has its own boundary. Your identity, timetable, plans and progress are not erased together unless you explicitly choose the complete device reset.
      </p>

      <div className="reset-group">
        <div className="reset-group__heading">
          <span>Scheduler inputs</span>
          <small>May reschedule future unfinished sessions</small>
        </div>

        <article className="reset-option">
          <div>
            <strong>Scheduler defaults</strong>
            <p>Restore session length, break length, daily cap, focus period and reminder settings.</p>
          </div>
          <button className="button button--ghost button--small" type="button" onClick={onResetSchedulerDefaults}>
            Restore
          </button>
        </article>

        <article className="reset-option">
          <div>
            <strong>Starter 24-hour timetable</strong>
            <p>Replace the current weekly map with the built-in weekday and weekend template.</p>
          </div>
          <button className="button button--ghost button--small" type="button" onClick={onRestoreTimetable}>
            Restore
          </button>
        </article>

        <article className="reset-option">
          <div>
            <strong>Clear weekly timetable</strong>
            <p>Remove every time block. No new schedule can be generated until study windows are added again.</p>
          </div>
          <button className="button button--ghost button--small reset-button--warning" type="button" onClick={onClearTimetable}>
            Clear
          </button>
        </article>
      </div>

      <div className="reset-group">
        <div className="reset-group__heading">
          <span>Planner data</span>
          <small>Profile and curriculum remain stored</small>
        </div>

        <article className="reset-option">
          <div>
            <strong>Reset progress and rebuild plans</strong>
            <p>Remove completion, confidence and actual-time records, then generate fresh sessions from the selected syllabus.</p>
          </div>
          <button
            className="button button--ghost button--small reset-button--warning"
            type="button"
            disabled={!hasPlans}
            onClick={() => onRequestDataReset('RESET_ALL_PROGRESS')}
          >
            Reset
          </button>
        </article>

        <article className="reset-option">
          <div>
            <strong>Delete all study plans</strong>
            <p>Remove generated plans, sessions and progress while preserving the local profile and timetable.</p>
          </div>
          <button
            className="button button--ghost button--small reset-button--danger"
            type="button"
            disabled={!hasPlans}
            onClick={() => onRequestDataReset('DELETE_ALL_PLANS')}
          >
            Delete
          </button>
        </article>
      </div>

      <div className="reset-group reset-group--danger">
        <div className="reset-group__heading">
          <span>Device data</span>
          <small>Irreversible without a backup</small>
        </div>

        <article className="reset-option">
          <div>
            <strong>Reset the entire application</strong>
            <p>Delete the local profile, 24-hour timetable, plans, sessions and progress, then return to first-time setup.</p>
          </div>
          <button
            className="button button--small reset-button--danger-solid"
            type="button"
            onClick={() => onRequestDataReset('RESET_ALL_LOCAL_DATA')}
          >
            Reset all
          </button>
        </article>
      </div>
    </section>
  );
}
