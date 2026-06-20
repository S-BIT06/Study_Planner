# Known Limitations

The app is feature-complete for the offline planner framework through Phases 1 to 11, but these limitations remain.

## Not included by design

- AI scheduling
- Cloud sync
- Login accounts
- Teacher/admin dashboard
- Phase 12 complete NCISM syllabus import

## Syllabus limitation

The current syllabus is demonstration data. It is useful for testing the scheduler, but it is not the complete official NCISM curriculum.

## Offline limitation

All data is local. If the user uninstalls the app without exporting a backup, data may be lost.

## Android testing required

Browser storage and Android SQLite are different environments. Always test SQLite persistence on a phone or emulator before final submission.

## Future improvements

- import full verified NCISM syllabus
- normalize SQLite tables instead of JSON app-state storage
- add app icons and splash screens
- add stronger accessibility checks
- add cloud backup as an optional future feature
