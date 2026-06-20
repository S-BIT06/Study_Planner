# NCISM Study Planner — Offline Mobile App

A mobile-first offline Study Planner for Ayurveda students following the NCISM curriculum structure.

This project uses:

- React
- Vite
- Capacitor
- Phone-side SQLite through Capacitor
- Local notifications
- Browser localStorage fallback for development

## Current status

This package contains the completed offline planner framework through Phases 1 to 11.

Implemented:

- First-time setup wizard
- Local profile
- Full 24-hour weekly timetable
- Minute-level Android-style time picker
- Date-specific timetable exceptions
- Study block categories and focus levels
- Multiple study plans
- Feasibility checking
- Priority, focus and availability-aware scheduler
- Preferred-study weighting
- Flexible/emergency reserve windows
- Exam-date protection for normal study
- Prerequisite-aware topic ordering where data exists
- True generated task locking model
- Timer, pause, manual actual time and partial completion
- Confidence levels from 1 to 5
- Confidence-based recovery revision
- Spaced revision generation
- Individual plan pause, resume, archive, restore, duplicate and delete
- Progress donut, actual-time analytics, confidence average and adherence metrics
- Notification centre and notification records
- JSON backup export and restore
- More tab with Profile, About, Backup and Reset tools
- Reset Centre
- SQLite app-state storage on native devices
- Browser localStorage fallback during development

Not implemented:

- AI scheduling
- Complete verified NCISM syllabus import
- Cloud login or sync

## Important syllabus note

`src/data/syllabus.ts` contains demonstration data. The app should not be presented as containing the complete official NCISM syllabus until the dedicated syllabus import phase is completed.

## Run in browser

Open PowerShell in the folder containing `package.json`:

```powershell
npm install
npm run build
npm run dev
```

The browser version uses localStorage.

## Android setup

After the browser version works and Android Studio is installed:

```powershell
npm run build
npm run android:add
npm run android:open
```

Use `android:add` only once.

After Android already exists:

```powershell
npm run build
npx cap sync android
npm run android:open
```

## Final documentation

Read these files before final submission:

- `FINAL_COMPLETION_GUIDE.md`
- `FINAL_TESTING_CHECKLIST.md`
- `ANDROID_RELEASE_GUIDE.md`
- `KNOWN_LIMITATIONS.md`
- `PHASE2_TO_11_NOTES.md`

## Recommended project location

```text
D:\projects\StudyPlanner\Study_Planner
```

## Final Git workflow

After testing:

```powershell
git add .
git commit -m "Complete offline study planner phases 1 to 11"
git push
```

Merge into `main` only after browser and Android testing pass.
