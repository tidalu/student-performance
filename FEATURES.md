# Feature manifest

Core: simulated sign-in, teacher-owned datasets, real CSV upload, strict preview, atomic single confirmation, deterministic saved predictions, aggregate evaluation, help, forbidden/missing states.

Optional course enhancements (Full mode): record review, quality, analytics, activity, account management, local preferences, record/result exports and report downloads. These are prototype explorations, not mandatory course commitments.

Demo tooling: persona switching, latency and one-shot named failures, preview/session expiry, reset, backup/restore, synthetic fixtures and local feedback outbox.

## Frontend completion additions

Requirement-level mapping and evidence live in FRONTEND-GAP-AUDIT.md and VERIFICATION.md. Added shared accessible drawers/popovers/tooltips/read/form recovery, remembered filters and source context; saved prediction metadata/failure subtypes; typed evaluation reports/comparison charts; computed quality/analytics distributions; structured authorized activity and admin history; complete review editing; feedback outbox/downloadable guides; persistence rollback and staged preview cancellation.

## Registration and recovery UI

The sign-in screen includes Create an account, Forgot password and Continue with Google (Demo). Registration validates name/email and matching passwords, permits duplicate display names, creates teacher-only accounts and requires explicit sign-in afterward. Password reset uses an expiring, one-use local demo inbox message and a new-password form. Google sign-in is a synthetic account chooser, not a configured OAuth integration. No Google requests or reset emails are sent. Local mock credentials are salted digests; do not use real passwords or treat browser state as an authentication boundary.
