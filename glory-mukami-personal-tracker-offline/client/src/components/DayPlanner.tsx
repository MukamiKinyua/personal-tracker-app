/**
 * The day, hour by hour.
 *
 * Not a calendar: no invitations, no attendees, no sync with anyone else's
 * diary. Just the hours you have and what you meant to do with them, which is
 * the gap between a goal and actually getting to it.
 *
 * The one hard rule is that blocks may not overlap. A plan that quietly
 * double-books an hour is worse than no plan, because it looks feasible when
 * it is not — so a clash is refused and says what it collided with.
 */

import { useRecordStore } from "@/contexts/RecordStoreContext";
import {
  addBlock,
  blockMinutes,
  blocksForDay,
  DEFAULT_DAY_END,
  DEFAULT_DAY_START,
  emptyPlanMessage,
  freeSlots,
  hourGrid,
  overcommittedNote,
  planSummary,
  type PlanBlock,
} from "@/lib/core/dayPlanner";
import { useState } from "react";

export function DayPlanner() {
  const journal = useRecordStore();

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [error, setError] = useState<string>();

  const blocks: PlanBlock[] = journal.inScope("plan").map(record => ({
    id: record.id,
    day: journal.dayOf(record),
    start: String(record.body.start ?? "09:00"),
    end: String(record.body.end ?? "10:00"),
    title: String(record.body.title ?? ""),
    done: Boolean(record.body.done),
  }));

  const today = blocksForDay(blocks, journal.today);
  const rows = hourGrid({ blocks, day: journal.today });
  const free = freeSlots({ blocks, day: journal.today });
  const summary = planSummary({ blocks, day: journal.today });
  const crowded = overcommittedNote(summary);

  function add() {
    const trimmed = title.trim();
    if (!trimmed) return;

    const candidate: PlanBlock = {
      id: "pending",
      day: journal.today,
      start,
      end,
      title: trimmed,
    };

    // Checked before anything is written, so a refusal costs nothing and can
    // name what it clashed with.
    const result = addBlock(today, candidate);
    if (!result.ok) {
      setError(result.reason);
      return;
    }

    journal.add({
      scope: "plan",
      body: { title: trimmed, start, end, done: false },
      undoLabel: `Planned ${trimmed}`,
    });

    setTitle("");
    setError(undefined);
  }

  return (
    <div className="day-planner">
      <div className="planner-heading">
        <b>Today, hour by hour</b>
        <small>
          {summary.blocks === 0
            ? emptyPlanMessage()
            : `${Math.round(summary.plannedMinutes / 60)}h planned · ${Math.round(summary.freeMinutes / 60)}h free`}
        </small>
      </div>

      <div className="planner-add">
        <input
          value={title}
          placeholder="What is this hour for?"
          onChange={event => setTitle(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") add();
          }}
        />
        <input
          type="time"
          value={start}
          onChange={event => setStart(event.target.value)}
          aria-label="Starts"
        />
        <input
          type="time"
          value={end}
          onChange={event => setEnd(event.target.value)}
          aria-label="Ends"
        />
        <button type="button" onClick={add}>
          Add
        </button>
      </div>

      {error ? (
        <p className="planner-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="planner-grid">
        {rows
          .filter(
            row => row.hour >= DEFAULT_DAY_START && row.hour <= DEFAULT_DAY_END
          )
          .map(row => (
            <div key={row.hour} className="planner-row">
              <span className="planner-hour">{row.label}</span>
              <div className="planner-blocks">
                {row.blocks.map(block => (
                  /*
                   * A block appears on every hour it covers, so the middle of a
                   * long one does not read as free. Only the first row carries
                   * its controls, so they are not repeated down the column.
                   */
                  <article
                    key={block.id}
                    className={block.done ? "is-done" : ""}
                  >
                    <span>{block.title}</span>
                    {Number(block.start.slice(0, 2)) === row.hour ? (
                      <>
                        <small>
                          {block.start}–{block.end} · {blockMinutes(block)} min
                        </small>
                        <button
                          type="button"
                          onClick={() =>
                            journal.edit(
                              block.id,
                              { ...block, done: !block.done },
                              block.done ? "Reopened" : "Done"
                            )
                          }
                        >
                          {block.done ? "Undo" : "Done"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            journal.remove(block.id, `Removed ${block.title}`)
                          }
                          aria-label={`Remove ${block.title}`}
                        >
                          ×
                        </button>
                      </>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ))}
      </div>

      {crowded ? <p className="planner-note">{crowded}</p> : null}

      {free.length > 0 && summary.blocks > 0 ? (
        <p className="planner-note">
          Still open:{" "}
          {free
            .slice(0, 3)
            .map(slot => `${slot.start}–${slot.end}`)
            .join(", ")}
          .
        </p>
      ) : null}
    </div>
  );
}
