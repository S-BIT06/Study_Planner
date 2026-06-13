# Study Planner Phase 2 to Phase 11 Upgrade Notes

This update implements the requested feature groups from Phase 2 through Phase 11 while intentionally skipping Phase 12 real NCISM syllabus import and excluding AI scheduling.

## Included

- Minute-precision, Android-style time picker for timetable blocks.
- Date-specific timetable exceptions for holidays, postings and one-day schedule changes.
- Scheduler corrections:
  - General focus preference now affects slot scoring.
  - Preferred study windows receive stronger priority.
  - Flexible/emergency windows are treated as reserve capacity.
  - Normal study is not scheduled on the exam date.
  - Optional topic prerequisites are respected where present in syllabus data.
- True generated-task locking support.
- Study execution modal with timer, pause, manual actual minutes, partial completion, notes and confidence.
- Confidence scale from 1 to 5.
- Extra recovery revision after low-confidence study attempts.
- Multiple spaced revision items during initial plan generation.
- Individual plan management: pause/resume, archive/restore, duplicate and delete.
- Progress upgrades: actual minutes, confidence average, adherence and recent study history.
- Notification centre and notification records.
- Backup and restore through JSON export/import.
- Help section renamed and implemented as About under More.
- Bottom navigation now uses More instead of Profile to avoid overcrowding.

## Not included

- Phase 12 real complete NCISM syllabus import.
- AI scheduling.
- Cloud sync or login.

## Important testing points

1. Create a plan and verify the schedule avoids the exam date.
2. Add a date exception and confirm the scheduler uses it after rescheduling.
3. Open a task and record partial completion.
4. Enter low confidence and check that recovery revision is created.
5. Lock a task and change profile availability; the task should be preserved.
6. Use More → About to read the feature guide.
7. Use More → Backup to export and restore a JSON backup.
