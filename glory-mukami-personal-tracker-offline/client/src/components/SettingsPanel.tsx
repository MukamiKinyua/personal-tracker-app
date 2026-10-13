/**
 * What the app knows, and what it does about it.
 *
 * One page rather than five, because from the user's side these are the same
 * question: what has this thing got on me, and what will it do without being
 * asked. Splitting that across five screens is how a setting nobody can find
 * ends up staying on.
 */

import { useRecordStore } from "@/contexts/RecordStoreContext";
import {
  backupFilename,
  parseBackup,
  planRestore,
  restoreWarning,
  type RestoreMode,
  type RestorePlan,
} from "@/lib/core/backup";
import {
  activeMemory,
  confirm as confirmMemory,
  pendingSuggestions,
  suggestionPrompt,
  type MemoryItem,
} from "@/lib/core/memory";
import {
  addPriority,
  createPriority,
  MAX_PRIORITIES,
  type Priority,
} from "@/lib/core/priorities";
import {
  MAX_IGNORED_BEFORE_PAUSE,
  REMINDER_COPY,
  markActedOn,
  type ReminderSetting,
} from "@/lib/core/notifications";
import {
  isNative,
  notificationsPermitted,
  requestNotificationPermission,
  saveBackupFile,
} from "@/lib/native";
import { useEffect, useRef, useState } from "react";

export function SettingsPanel() {
  const journal = useRecordStore();
  const { preferences } = journal;

  const [priorityName, setPriorityName] = useState("");
  const [priorityError, setPriorityError] = useState<string>();
  const [plan, setPlan] = useState<RestorePlan>();
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("merge");
  const [restoreProblems, setRestoreProblems] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [permitted, setPermitted] = useState<boolean>();

  useEffect(() => {
    void notificationsPermitted().then(setPermitted);
  }, []);

  function setReminder(kind: ReminderSetting["kind"], patch: Partial<ReminderSetting>) {
    journal.updatePreferences({
      reminders: preferences.reminders.map(reminder =>
        reminder.kind === kind ? { ...reminder, ...patch } : reminder
      ),
    });
  }

  async function enableReminders(enabled: boolean) {
    if (enabled && permitted !== true) {
      // Asked at the moment it matters, on the user's own action, rather
      // than on first open — which is when permission prompts get refused.
      const granted = await requestNotificationPermission();
      setPermitted(granted);
    }
    journal.updatePreferences({ notifications: { enabled } });
  }

  /*
   * Priorities and memory are records, so they reach the user's other devices.
   * Reminders stay in preferences: a reminder should fire on the device it was
   * set on, not on whichever one happens to be awake.
   */
  const priorities = journal
    .inScope("priority")
    .map(record => ({ ...(record.body as object), id: record.id }) as Priority);

  const memories = journal
    .inScope("memory")
    .map(
      record => ({ ...(record.body as object), id: record.id }) as MemoryItem
    );

  function addNewPriority() {
    const name = priorityName.trim();
    if (!name) return;

    const result = addPriority(priorities, createPriority(name));
    if (!result.ok) {
      setPriorityError(result.reason);
      return;
    }

    const created = result.priorities[result.priorities.length - 1];
    const { id: _drafted, ...body } = created;
    journal.add({ scope: "priority", body, undoLabel: "Added " + name });

    setPriorityName("");
    setPriorityError(undefined);
  }

  async function download() {
    const bundle = journal.exportAll();
    const contents = JSON.stringify(bundle, null, 2);
    const filename = backupFilename();

    // On Android there is no Downloads folder an in-app link can reach, so
    // the file goes to the system share sheet instead; the browser's own
    // download link only ever existed for the web build.
    if (await saveBackupFile(filename, contents)) return;

    const blob = new Blob([contents], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function chooseBackup(file: File) {
    const parsed = parseBackup(await file.text());
    setRestoreProblems(parsed.problems.map(problem => problem.message));

    if (!parsed.ok) {
      setPlan(undefined);
      return;
    }

    // Planned, not applied. Restoring is the most destructive thing this app
    // can do, so the consequences are computed and shown before anything runs.
    setPlan(
      planRestore({
        bundle: parsed.bundle,
        existing: Object.values(journal.store.records),
        mode: restoreMode,
      })
    );
  }

  return (
    <div className="settings-panel">
      <section>
        <h3>Your priorities</h3>
        <p className="settings-note">
          At most {MAX_PRIORITIES}. That limit is the point — three things you
          have decided matter is a decision; eleven is a list.
        </p>

        <ul className="settings-list">
          {priorities.map(priority => (
            <li key={priority.id}>
              <span>{priority.name}</span>
              <button
                type="button"
                onClick={() => {
                  journal.remove(priority.id, "Removed " + priority.name);
                  setPriorityError(undefined);
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        {priorities.length < MAX_PRIORITIES ? (
          <div className="settings-add">
            <input
              value={priorityName}
              placeholder="School, Exercise, Family…"
              onChange={event => setPriorityName(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") addNewPriority();
              }}
            />
            <button type="button" onClick={addNewPriority}>
              Add
            </button>
          </div>
        ) : null}

        {priorityError ? (
          <p className="settings-error" role="alert">
            {priorityError}
          </p>
        ) : null}
      </section>

      <section>
        <h3>What this app remembers</h3>
        {activeMemory(memories).length === 0 &&
        pendingSuggestions(memories).length === 0 ? (
          <p className="settings-note">
            Nothing yet. It only remembers what you tell it, or what you accept
            when it asks.
          </p>
        ) : (
          <>
            <ul className="settings-list">
              {activeMemory(memories).map(item => (
                <li key={item.id}>
                  <span>
                    <b>{item.label}</b> {item.value}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      journal.remove(item.id, "Forgot " + item.label)
                    }
                  >
                    Forget
                  </button>
                </li>
              ))}
            </ul>

            {pendingSuggestions(memories).map(item => (
              <div key={item.id} className="settings-suggestion">
                {/* Asked, never asserted: noticing a repetition is not the
                    same as knowing something about someone. */}
                <span>{suggestionPrompt(item)}</span>
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      journal.edit(
                        item.id,
                        { ...confirmMemory(item) },
                        "Remembered"
                      )
                    }
                  >
                    Yes, remember it
                  </button>
                  <button
                    type="button"
                    onClick={() => journal.remove(item.id, "Dismissed")}
                  >
                    No
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </section>

      <section>
        <h3>Reminders</h3>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={preferences.notifications.enabled}
            onChange={event => void enableReminders(event.target.checked)}
          />
          <span>
            <b>Let this app remind me</b>
            <small>
              Off unless you turn it on. Nothing is sent inside your quiet
              hours, and a reminder that keeps going unanswered pauses itself
              rather than nagging.
            </small>
          </span>
        </label>

        {preferences.notifications.enabled ? (
          <>
            {permitted === false ? (
              <p className="settings-error" role="alert">
                Notifications are blocked for this app on this device, so
                nothing can be shown until that is allowed in the device
                settings.
              </p>
            ) : null}

            <ul className="settings-reminders">
              {preferences.reminders.map(reminder => (
                <li key={reminder.kind}>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={reminder.enabled}
                      onChange={event =>
                        setReminder(reminder.kind, {
                          enabled: event.target.checked,
                          // Switching it on again is an answer: the pause
                          // that ignoring it earned is cleared.
                          ...(event.target.checked
                            ? { ignoredCount: 0 }
                            : {}),
                        })
                      }
                    />
                    <span>
                      <b>{REMINDER_COPY[reminder.kind].body}</b>
                      {reminder.ignoredCount >= MAX_IGNORED_BEFORE_PAUSE ? (
                        <small>
                          Paused — it went unanswered {reminder.ignoredCount}{" "}
                          times.{" "}
                          <button
                            type="button"
                            onClick={() =>
                              setReminder(reminder.kind, markActedOn(reminder))
                            }
                          >
                            Resume
                          </button>
                        </small>
                      ) : null}
                    </span>
                  </label>
                  <input
                    type="time"
                    value={reminder.at}
                    aria-label={`Time for the ${reminder.kind} reminder`}
                    disabled={!reminder.enabled}
                    onChange={event =>
                      setReminder(reminder.kind, { at: event.target.value })
                    }
                  />
                </li>
              ))}
            </ul>

            <label className="settings-quiet">
              Quiet from
              <input
                type="time"
                value={preferences.notifications.quietHoursStart}
                onChange={event =>
                  journal.updatePreferences({
                    notifications: { quietHoursStart: event.target.value },
                  })
                }
              />
              until
              <input
                type="time"
                value={preferences.notifications.quietHoursEnd}
                onChange={event =>
                  journal.updatePreferences({
                    notifications: { quietHoursEnd: event.target.value },
                  })
                }
              />
            </label>
          </>
        ) : null}

        <p className="settings-note">
          {isNative()
            ? "Delivered by your phone at the times set, whether or not the app is open. A reminder set inside quiet hours is not scheduled at all."
            : "In a browser, a reminder can only be shown while this app is open — it checks once a minute and skips anything you have already recorded. Install the Android app for reminders that arrive with it closed."}
        </p>
      </section>

      <section>
        <h3>Your data</h3>
        <div className="settings-add">
          <button type="button" onClick={download}>
            Export a backup
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            Restore from a file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) void chooseBackup(file);
            }}
          />
        </div>

        {restoreProblems.map(problem => (
          <p key={problem} className="settings-error">
            {problem}
          </p>
        ))}

        {plan ? (
          <div className="settings-restore">
            <label>
              <input
                type="radio"
                checked={restoreMode === "merge"}
                onChange={() => setRestoreMode("merge")}
              />
              Keep what is here and add what is missing
            </label>
            <label>
              <input
                type="radio"
                checked={restoreMode === "replace"}
                onChange={() => setRestoreMode("replace")}
              />
              Replace everything with the backup
            </label>

            {plan.summary.map(line => (
              <p key={line}>{line}</p>
            ))}

            <p
              className={plan.destructive ? "settings-error" : "settings-note"}
            >
              {restoreWarning(plan)}
            </p>

            <p className="settings-note">
              Restoring is not wired up yet. This shows exactly what it would
              do, so nothing happens by surprise once it is.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
