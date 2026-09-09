/**
 * Today.
 *
 * The page that answers "what is being asked of me right now", and the reason
 * the rest of the journal is worth keeping: entries scattered across forty
 * pages are a filing cabinet, not a picture of a day.
 *
 * Its value is in what it leaves out. Nothing appears unless it is actionable
 * today, every section is capped, and a clear day is shown as an outcome
 * rather than as an empty list — so the page stays worth opening on the days
 * when there is nothing on it.
 */

import { useRecordStore } from "@/contexts/RecordStoreContext";
import { describeTotal, aggregateScope } from "@/lib/core/aggregate";
import { hydrationPatternNote } from "@/lib/core/hydration";
import {
  oneTapBody,
  quickAddMenu,
  quickAddUndoLabel,
  resolveDefaults,
  type QuickAddKind,
} from "@/lib/core/quickAdd";
import { buildDayRecap, emptyRecapMessage } from "@/lib/core/timeline";
import {
  buildBriefing,
  buildToday,
  clearDayMessage,
  overflowLabel,
} from "@/lib/core/today";
import { useMemo } from "react";

export function TodayPanel() {
  const journal = useRecordStore();
  const { today, preferences } = journal;

  const trackedScopes = preferences.areas;

  // One pass over the store, rather than one query per card.
  const allToday = useMemo(
    () =>
      trackedScopes.flatMap(scope =>
        journal.onDay(scope, today).map(record => ({ scope, record }))
      ),
    [journal, today, trackedScopes]
  );

  const loggedScopes = useMemo(
    () => Array.from(new Set(allToday.map(entry => entry.scope))),
    [allToday]
  );

  const view = useMemo(
    () =>
      buildToday({
        today,
        trackedScopes: trackedScopes as string[],
        loggedScopes,
      }),
    [loggedScopes, today, trackedScopes]
  );

  const briefing = buildBriefing({ view, hourOfDay: new Date().getHours() });

  const recap = useMemo(
    () =>
      buildDayRecap({
        entries: allToday.map(({ scope, record }) => ({
          id: record.id,
          scope,
          title: scope,
          at: record.period.start,
        })),
        day: today,
        timezone: journal.store.timezone,
      }),
    [allToday, journal.store.timezone, today]
  );

  // Only the actions for areas this person actually tracks.
  const actions = quickAddMenu({
    trackedAreas: trackedScopes as string[],
    limit: 4,
  }).filter(action => oneTapBody(action.kind, resolveDefaults()) !== null);

  // The one-tap amount is a sip, not the daily goal — passing the goal here
  // would log the whole day's target with a single tap.
  const defaults = resolveDefaults();

  function quickLog(kind: QuickAddKind) {
    const body = oneTapBody(kind, defaults);
    if (!body) return;
    const action = quickAddMenu({
      trackedAreas: trackedScopes as string[],
    }).find(entry => entry.kind === kind);
    if (!action) return;

    journal.add({
      scope: action.scope,
      body,
      undoLabel: quickAddUndoLabel(kind, body),
    });
  }

  // Stated only when there are enough entries to be a pattern rather than a
  // few data points.
  const waterNote = hydrationPatternNote(
    journal.inScope("water").map(record => ({
      id: record.id,
      amountMl: Number(record.body.amountMl) || 0,
      at: record.period.start,
      seq: 0,
    })),
    journal.store.timezone
  );

  return (
    <div className="today-panel">
      <div className="today-briefing">
        <b>{briefing.greeting}</b>
        <p>{briefing.headline}</p>
        {briefing.lines.length > 0 ? (
          <small>{briefing.lines.join(" · ")}</small>
        ) : null}
      </div>

      {actions.length > 0 ? (
        <div className="today-quick">
          <span>Log without leaving this page</span>
          <div>
            {actions.map(action => (
              <button
                key={action.kind}
                type="button"
                onClick={() => quickLog(action.kind)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="today-recap">
        <b>Today so far</b>
        {recap.isEmpty ? (
          <small>{emptyRecapMessage()}</small>
        ) : (
          <ul>
            {recap.lines.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      {view.notLoggedYet.length > 0 ? (
        <p className="today-gaps">
          {/* Stated as fact, not as a reprimand. */}
          Nothing recorded yet for {view.notLoggedYet.join(", ")}.
        </p>
      ) : null}

      {view.isClear ? (
        <p className="today-clear">{clearDayMessage(view)}</p>
      ) : null}

      {waterNote ? <p className="today-pattern">{waterNote}</p> : null}

      <div className="today-totals">
        {loggedScopes.map(scope => (
          <small key={scope}>
            {describeTotal(
              aggregateScope(journal.inScope(scope), scope, record =>
                journal.dayOf(record)
              )
            )}
          </small>
        ))}
      </div>
    </div>
  );
}
