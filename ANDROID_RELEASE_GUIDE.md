# Android Testing and Release Guide

This project is a Capacitor Android application wrapped around the React frontend.

## First Android setup

Run these from the project root after the browser build works:

```powershell
npm run build
npm run android:add
npm run android:open
```

Run `android:add` only once. It creates the `android/` native project.

## Normal Android sync after changes

After Android already exists:

```powershell
npm run build
npx cap sync android
npm run android:open
```

## Android Studio testing

In Android Studio:

1. Wait for Gradle sync.
2. Select an emulator or connected phone.
3. Press Run.
4. Test setup, storage, timetable, planner, timer, notifications and backup.

## APK testing

For a local debug APK, use Android Studio:

```text
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

Use debug APKs only for personal testing or college demonstration.

## Release caution

Before creating a release APK or AAB:

- replace demo syllabus with verified syllabus if claiming academic completeness
- set final app name and package id
- add proper icons and splash screen
- test data persistence on real Android device
- test backup and restore
- test notification permission behaviour
- create and safely store signing key

Do not publish a release build with demo syllabus unless the app clearly labels it as a prototype.
