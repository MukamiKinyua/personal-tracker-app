# Glory Mukami’s Personal Tracker — Prototype Scope

This milestone is a **UI/UX and interaction prototype**. User-created entries, local undo states, History activity, export payloads, privacy preferences, and reminder preferences are held in the active browser session only. They are intentionally not represented as durable records.

## Deferred persistence

MongoDB design and integration are deferred until the journal’s information model, privacy expectations, retention choices, ownership rules, and offline or multi-device behavior have been approved. No current interface should imply that an entry survives a refresh, a new browser session, or a different device.

## Deferred reminder delivery

Assignments, habits, period estimates, document renewal, responsibilities, and security pages expose **visible local preference and preview controls only**. They do not schedule, queue, or deliver any notification.

After reminder rules and deployment are approved, automatic delivery must use platform-managed scheduled request handlers with authenticated, idempotent callback behavior and persisted task identifiers. It must not depend on browser timers, in-process timers, or local prototype state.

## Current interaction boundary

The Time page’s focus countdown is manual and user-controlled. It does not progress in the background and cannot trigger reminders. The interface states this boundary where the control is used.
