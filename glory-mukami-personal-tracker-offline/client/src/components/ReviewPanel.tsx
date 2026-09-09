/**
 * Looking back over a week, month, quarter or year.
 *
 * The requirement that shapes this is a prohibition: a review must not present
 * an automatic score for the user's life. So nothing here rates anything. It
 * counts what was recorded, names the days that hold nothing, and asks
 * questions the person answers themselves.
 *
 * Comparisons with the previous period are stated as plain differences — "4
 * fewer than last time" — never as better or worse. A quieter month is not a
 * failed one, and an app that says otherwise will be wrong about someone's
 * life on a week when they had every reason to be quiet.
 */

import { useRecordStore } from "@/contexts/RecordStoreContext";
import { aggregateScope } from "@/lib/core/aggregate";
import { dayKeyRange } from "@/lib/core/datetime";
import {
  buildReview,
  describeChange,
  previousWindow,
  REVIEW_PERIODS,
  reviewWindow,
  type ReviewPeriod,
} from "@/lib/core/reviews";
import { useMemo, useState } from "react";

const TRACKED = ["water", "sleep", "task", "habit"];

export function ReviewPanel() {
  const journal = useRecordStore();
  const [period, setPeriod] = useState<ReviewPeriod>("weekly");

  const weekStartsOn = journal.preferences.weekStartsOn;

  const review = useMemo(() => {
    const window = reviewWindow(period, journal.today, weekStartsOn);
    const previous = previousWindow(window, weekStartsOn);

    const inWindow = (from: string, to: string) => (scope: string) =>
      journal.inScope(scope).filter(record => {
        const day = journal.dayOf(record);
        return day >= from && day <= to;
      });

    const totals = TRACKED.map(scope =>
      aggregateScope(inWindow(window.from, window.to)(scope), scope, record =>
        journal.dayOf(record)
      )
    ).filter(total => total.count > 0);

    const previousTotals = TRACKED.map(scope =>
      aggregateScope(
        inWindow(previous.from, previous.to)(scope),
        scope,
        record => journal.dayOf(record)
      )
    );

    const recordedDays = Array.from(
      new Set(
        TRACKED.flatMap(scope =>
          inWindow(
            window.from,
            window.to
          )(scope).map(record => journal.dayOf(record))
        )
      )
    );

    return buildReview({
      period,
      day: journal.today,
      today: journal.today,
      totals,
      previousTotals,
      recordedDays,
      weekStartsOn,
      locale: journal.preferences.locale,
    });
  }, [journal, period, weekStartsOn]);

  const daysInWindow = dayKeyRange(review.window.from, review.window.to).length;

  /**
   * Answers are records like anything else, so a reflection someone actually
   * wrote survives navigating away, reaches their other devices, and can be
   * undone. Held in component state it would simply vanish, which is the one
   * thing a journal must never do to writing.
   */
  const reviewRecords = journal.inScope("review");

  const existing = reviewRecords.find(
    record =>
      record.body.period === period && record.body.from === review.window.from
  );

  const savedAnswers = (existing?.body.answers ?? {}) as Record<string, string>;

  function saveAnswer(prompt: string, value: string) {
    const text = value.trim();
    if (text === (savedAnswers[prompt] ?? "")) return;

    const answers = { ...savedAnswers, [prompt]: text };

    if (existing) {
      journal.edit(
        existing.id,
        { ...existing.body, answers },
        "Reflection saved"
      );
    } else if (text) {
      // Only created once there is something to keep — an empty review would
      // otherwise be written the moment the field is touched.
      journal.add({
        scope: "review",
        body: {
          period,
          from: review.window.from,
          to: review.window.to,
          answers,
        },
        undoLabel: "Reflection saved",
      });
    }
  }

  return (
    <div className="review-panel">
      <div className="review-heading">
        <div>
          <b>Looking back</b>
          <small>{review.label}</small>
        </div>
        <div className="review-periods" role="group" aria-label="Review period">
          {REVIEW_PERIODS.map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={option === period}
              className={option === period ? "active" : ""}
              onClick={() => setPeriod(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {review.totals.length === 0 ? (
        <p className="review-empty">Nothing recorded in this period.</p>
      ) : (
        <>
          <ul className="review-totals">
            {review.totals.map(total => {
              const change = review.changes.find(
                entry => entry.scope === total.scope
              );
              return (
                <li key={total.scope}>
                  <b>
                    {total.count} {total.scope}
                    {total.count === 1 ? "" : "s"}
                  </b>
                  {change ? <small>{describeChange(change)}</small> : null}
                </li>
              );
            })}
          </ul>

          <p className="review-coverage">
            {/* Stated as a fact about the record, not about the person. */}
            {review.daysElapsed - review.gaps.length} of {review.daysElapsed}{" "}
            day{review.daysElapsed === 1 ? "" : "s"} so far hold something.
            {daysInWindow > review.daysElapsed
              ? " The rest of this period has not happened yet."
              : ""}
          </p>
        </>
      )}

      <div className="review-prompts">
        <span>Worth thinking about — none of these need an answer.</span>
        {review.prompts.map(prompt => (
          <label key={prompt}>
            <span>{prompt}</span>
            <textarea
              rows={2}
              defaultValue={savedAnswers[prompt] ?? ""}
              // Saved on blur rather than on every keystroke: a record per
              // character would flood the sync queue, and writing a paragraph
              // should not cost a hundred writes.
              onBlur={event => saveAnswer(prompt, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
