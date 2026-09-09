# Non-animation functionality audit

## Executive conclusion

The app is **not honestly verifiable as 100% functional yet**. The non-animation foundation is in good working condition at the automated and local runtime level, but two important areas remain unverified or conditional: the configured MongoDB connection could not be confirmed from the current environment, and a complete authenticated browser pass through every tracker has not been performed.

The application does render, compile, build, serve its public entry point, and pass the current automated test suite. The tracker pages use a shared persistence hook that writes to browser local storage and attempts MongoDB persistence when the user is authenticated and the Mongo connection reports ready. The reliability layer now uses bounded Mongo connection timeouts, retries readiness once, reports save failures through the persistence hook, and flushes local state on page exit.

## Verified checks

| Area | Evidence | Status |
|---|---|---|
| Public entry screen | Local HTTP smoke check returned HTTP 200 and the expected page title. | Verified working |
| Frontend compilation | TypeScript check completed without errors. | Verified working |
| Production build | Vite/client and server production build completed successfully. | Verified working |
| Automated tests | 33 test files passed; 98 tests passed and 1 test was skipped. | Verified working within test coverage |
| Unauthenticated auth state | `auth.me` returned HTTP 200 with a null user, which is the expected signed-out state. | Verified working |
| Protected API boundary | An unauthenticated journal-state request returned HTTP 401 with `UNAUTHORIZED`. | Verified working |
| Runtime shell | Development server remained running and the fresh browser console showed no current application errors. | Verified for shell load |
| Tracker persistence architecture | 42 tracker scopes in `Home.tsx` use the shared Mongo/local-storage persistence hook. | Implemented; broad end-to-end coverage remains incomplete |
| Timer persistence logic | Timer runs store timestamps and recompute elapsed time on visibility changes or reopening. | Implemented and unit-tested in part |

## Important limitations

### MongoDB is not currently verified as reachable

The public Mongo readiness request now returns HTTP 200 with `ready: false` in approximately three seconds when the configured database is unavailable. The code correctly reports readiness as false, but this means cloud persistence and cross-device restoration still cannot be certified from this environment until the intended MongoDB instance is reachable. The app falls back to browser local storage when the user is signed out or MongoDB is not ready.

This is the most important production-readiness gap. A real authenticated test using the intended MongoDB URI is still required to verify saving, hydration after reload, user isolation, and cross-device restoration.

### Persistence is conditional, not universally cloud-backed

The shared hook first hydrates browser local storage and then hydrates MongoDB only when authentication is available and the connection reports ready. Therefore, the UI can appear to work while data is only stored in the current browser. This is useful offline behavior, but it is not equivalent to confirmed durable cloud persistence.

### Timer behavior is reload-safe, not a native background service

The timer stores a start timestamp, recalculates elapsed time when the page becomes visible or is reopened, and now flushes the latest local state on page exit to reduce loss during the save debounce window. That allows the displayed duration to catch up after a page is hidden or closed. However, JavaScript cannot continue executing or reliably play audio while the web page is fully closed, and browser notifications remain permission- and platform-controlled. Native home-screen widgets and guaranteed background alarms still require the later APK/native implementation that was intentionally deferred.

### Full user-flow verification is incomplete

The automated suite covers shared logic and selected server behavior, but it does not prove that every one of the app’s many tracker forms has been manually exercised through authenticated save, reload, edit, delete, and error paths. The app is a very large single-page surface, so the remaining uncertainty is end-to-end coverage rather than an observed compile or test failure.

### Build warnings are non-blocking but worth future cleanup

The build reports a large JavaScript chunk and expected runtime resolution warnings for `/media/runtime/...` assets. The build succeeds, and managed assets are intended to resolve at runtime, but code-splitting and bundle-size reduction would improve production performance.

## Bottom line

If “functional” means **the app loads, the code compiles, automated tests pass, the public shell works, and the non-animation features are wired**, the answer is yes for the verified portions.

If “functional 100%” means **every tracker has been authenticated end-to-end tested, MongoDB persistence is confirmed against the user’s real database, all save/reload/error paths are proven, and native background timer/widget behavior works**, the answer is no. The next highest-value validation is to connect the intended MongoDB instance and run a signed-in save/reload test across representative trackers, followed by a systematic authenticated browser pass through the remaining forms.
