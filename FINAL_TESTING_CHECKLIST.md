# Final Testing Checklist

Use this checklist before calling the project complete.

## 1. Setup

- [ ] App opens without crashing.
- [ ] First-time setup appears when no data exists.
- [ ] Student name, college and professional year save correctly.
- [ ] Timetable blocks can be added, edited and deleted.
- [ ] Time picker accepts minute-level times such as 06:17 and 21:43.
- [ ] Overlapping blocks are rejected.
- [ ] Setup review shows correct study capacity.

## 2. Timetable and exceptions

- [ ] Weekly timetable shows all seven days.
- [ ] Preferred study windows are visible.
- [ ] Sleep, college, travel, meal and unavailable blocks are protected.
- [ ] Date-specific exception can be created.
- [ ] A holiday exception changes that date's usable availability.
- [ ] A special unavailable day prevents scheduling on that date.

## 3. Planner

- [ ] A new plan can be created.
- [ ] The plan requires a name, exam date and selected topics.
- [ ] Scheduler reports feasible, tight or impossible correctly.
- [ ] Generated tasks do not enter sleep or fixed blocks.
- [ ] Normal study is not placed on the exam date.
- [ ] Preferred-study windows receive demanding tasks where possible.
- [ ] Flexible/emergency windows are used after stronger windows.
- [ ] Revisions are generated.
- [ ] Mock or assessment work appears where applicable.

## 4. Task execution

- [ ] A task opens in the session modal.
- [ ] Timer starts.
- [ ] Timer pauses.
- [ ] Timer resumes or resets correctly.
- [ ] Manual actual minutes can be entered.
- [ ] Partial completion can be saved.
- [ ] Remaining minutes are stored.
- [ ] Confidence from 1 to 5 can be saved.
- [ ] Low confidence creates recovery revision.

## 5. Locking and rescheduling

- [ ] A generated task can be locked.
- [ ] Locked task remains in place after rescheduling.
- [ ] User can unlock and edit when needed.
- [ ] Completed history is preserved after timetable changes.
- [ ] Future unfinished sessions regenerate.

## 6. Plan management

- [ ] Plan can be paused.
- [ ] Paused plan does not dominate current dashboard.
- [ ] Plan can be resumed.
- [ ] Plan can be archived.
- [ ] Archived plan can be restored.
- [ ] Plan can be duplicated.
- [ ] One plan can be deleted without deleting every plan.

## 7. Progress

- [ ] Progress donut updates after task completion.
- [ ] Planned time and actual time are different when manual actual time differs.
- [ ] Subject progress updates.
- [ ] Confidence average updates.
- [ ] Schedule adherence changes based on completed sessions.

## 8. More tab

- [ ] More tab opens.
- [ ] Profile is accessible from More.
- [ ] About is accessible from More.
- [ ] Backup is accessible from More.
- [ ] Reset Centre is accessible from More.

## 9. About

- [ ] About explains scheduler behaviour.
- [ ] About explains timetable block types.
- [ ] About explains focus.
- [ ] About explains daily cap.
- [ ] About explains locking.
- [ ] About explains confidence and revision.
- [ ] About explains charts and backup.

## 10. Backup and restore

- [ ] Export backup creates JSON.
- [ ] Restore accepts valid backup.
- [ ] Restore rejects invalid backup.
- [ ] Restored data appears correctly after refresh.

## 11. Reset Centre

- [ ] Individual scheduler settings reset correctly.
- [ ] Starter timetable restore works.
- [ ] Clear timetable works.
- [ ] Reset progress and rebuild plans works.
- [ ] Delete all study plans works.
- [ ] Complete app reset returns to setup.

## 12. Android

- [ ] `npm run build` passes.
- [ ] `npx cap sync android` passes.
- [ ] Android Studio opens the project.
- [ ] App runs on emulator or phone.
- [ ] SQLite data persists after closing and reopening.
- [ ] Notifications request permission.
- [ ] Android back button does not break navigation.
