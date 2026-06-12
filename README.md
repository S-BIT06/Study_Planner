# NCISM Study Planner — Offline Mobile Starter

A React + Capacitor mobile-first study planner with a native phone-side SQLite data store.

## What is implemented

- First-launch setup wizard
- Full 24-hour weekly timetable editor
- Multiple time blocks on every day
- 15-minute time precision
- Study, sleep, college, clinical, travel, meal, rest, flexible, and unavailable blocks
- High, normal, and low-focus study windows
- Locked and movable study windows
- Copy one day's timetable to another day
- Local student profile and editable timetable
- Mobile dashboard and bottom navigation
- Compact syllabus browser with demonstration curriculum data
- Multiple study plans
- Workload feasibility states: feasible, tight, impossible
- Priority and energy-aware session generation
- Automatic topic splitting when a study window is shorter than a preferred session
- Revision blocks and a mock-test block
- Future-task rescheduling after timetable changes
- Duration-based progress donut
- Daily task status tracking
- Native local-notification scheduling
- Native SQLite persistence on Android/iOS
- Browser localStorage fallback for development only
- Per-setting reset controls for session length, breaks, daily cap, focus period, and reminders
- Granular reset centre for scheduler defaults, the 24-hour timetable, plan progress, study plans, or the entire app
- Confirmation previews before any reset changes stored data

## Important curriculum note

`src/data/syllabus.ts` contains **demonstration data**, not a complete verified NCISM syllabus. Replace it through a separate, reviewed curriculum import before treating the app as academically authoritative.

## Run in a browser

Open PowerShell in the folder containing `package.json`:

```powershell
npm install
npm run dev
```

Run `npm install` only during the first setup, after cloning on another computer, or after dependencies change.

The browser preview uses localStorage so the interface can be developed without an emulator.

## How the 24-hour timetable works

During setup, open each day and add as many blocks as required. Each block has:

- Start and end time
- Activity category
- Optional label
- Energy level for study-capable blocks
- Locked or movable behaviour

Only these block categories are available to the scheduling engine:

- Preferred study
- Available for study
- Light study only
- Flexible / emergency

Sleep, college, travel, meals, rest, and unavailable blocks are protected from generated study sessions.

Unassigned time is treated as unavailable. Overnight activities must be split at midnight, for example `22:30–24:00` and `00:00–06:00`.


## Granular reset centre

Open **Profile → Reset centre** to restore only the part of the planner that needs correction.

Available reset scopes:

- Reset one scheduler setting from the Scheduler defaults card
- Restore all scheduler defaults to 50-minute sessions, 10-minute breaks, a 3-hour daily cap, evening focus, and 15-minute reminders
- Restore the starter 24-hour weekly timetable
- Clear the entire weekly timetable without deleting the profile
- Reset progress and rebuild all plans from their selected syllabus
- Delete every study plan while keeping the profile and timetable
- Reset all local application data and return to first-time setup

Scheduler-input resets show the resulting study capacity and reschedule only future unfinished sessions. Completed and historical work is protected unless the user explicitly chooses **Reset progress and rebuild plans**.

## Add Android

Install Android Studio and a supported Android SDK first. After the browser version works:

```powershell
npm run build
npm run android:add
npm run android:open
```

After the Android project already exists, use:

```powershell
npm run android:open
```

The script builds React, synchronizes Capacitor, and opens Android Studio.

## Native database

On a native device, `src/services/database.ts` opens a SQLite database named `study_planner` through `@capacitor-community/sqlite`.

The starter stores the application state as JSON in a SQLite table. This is deliberate for the first functional slice. When the curriculum import and reporting requirements stabilize, migrate to normalized tables for profiles, topics, plans, tasks, revisions, time blocks, and assessments.

## Scheduling behaviour

The engine now:

1. Reads every study-capable block from the weekly 24-hour timetable.
2. Applies the student's maximum daily study limit.
3. Prioritizes preferred and high-focus windows for demanding work.
4. Sends revisions, journals, and lighter work toward low-focus windows.
5. Prevents generated sessions from entering sleep or fixed-life blocks.
6. Splits long work when a configured window is shorter than the preferred session length.
7. Adds breaks only between sessions inside the same time block.
8. Adds one revision block per topic and one mock-test block.
9. Reports required time, usable time, and unscheduled minutes.
10. Regenerates only future unfinished tasks after profile timetable changes.
11. Migrates profiles saved by the older single-time-window version.

Date-specific exceptions are not included yet. The current version uses a recurring weekly timetable.

## Project location

Copy or extract this folder to your preferred Windows location, for example:

```text
D:\projects\StudyPlanner\Study_Planner
```
