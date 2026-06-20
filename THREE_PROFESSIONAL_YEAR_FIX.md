# Three Professional Year Fix

This update changes the app's active professional-year structure from four options to three:

- I Professional
- II Professional
- III Professional

## What changed

- Removed `IV Professional` from the `ProfessionalYear` type.
- Removed `IV Professional` from setup and profile dropdowns.
- Removed the fourth-year demo syllabus topic.
- Added a shared `PROFESSIONAL_YEARS` list for dropdowns.
- Added migration normalization so any old saved `IV Professional` profile is moved to `III Professional` instead of breaking the app.
- Updated the curriculum version label to `NCISM current / 3 Professional BAMS structure`.

## Still pending

The full verified NCISM syllabus import is still not included. The app continues to use demonstration syllabus data until Phase 12 is intentionally performed.
