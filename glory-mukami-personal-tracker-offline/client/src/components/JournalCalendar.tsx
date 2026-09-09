/**
 * One month, with everything on it.
 *
 * The calendar owns no records. It projects the ones the pages already wrote,
 * which is what stops a task's due date and its calendar entry from ever
 * disagreeing — and means hiding a category is a display choice that can never
 * delete anything.
 *
 * The padding days at each end are real days carrying real events, dimmed
 * rather than blanked. Blanking them would hide an entry on the 1st from
 * someone looking at the previous month's last row.
 */

import { useRecordStore } from "@/contexts/RecordStoreContext";
import {
  ALL_CATEGORIES,
  categoryCounts,
  monthGrid,
  projectPeriod,
  projectRecords,
  type CalendarCategory,
  type CategoryVisibility,
} from "@/lib/core/calendar";
import { formatDayKey, monthStartKey, shiftDayKey } from "@/lib/core/datetime";
import { useMemo, useState } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function JournalCalendar() {
  const journal = useRecordStore();
  const [month, setMonth] = useState(() => monthStartKey(journal.today));
  const [hidden, setHidden] = useState<CategoryVisibility>({});
  const [selected, setSelected] = useState<string | null>(null);

  const events = useMemo(() => {
    const tasks = projectRecords({
      records: journal.inScope("task"),
      category: "task",
      id: record => record.id,
      title: record => String(record.body.title ?? "Task"),
      // Only tasks with a real day appear; `due` is free text elsewhere in the
      // app, and a guessed date would put an entry on the wrong day.
      day: record => journal.dayOf(record),
      done: record => Boolean(record.body.done),
    });

    const water = projectRecords({
      records: journal.inScope("water"),
      category: "reminder",
      id: record => record.id,
      title: record => `${record.body.amountMl ?? 0} ml`,
      day: record => journal.dayOf(record),
    });

    const habits = projectRecords({
      records: journal.inScope("habit"),
      category: "habit",
      id: record => record.id,
      title: record => String(record.body.name ?? "Habit"),
      day: record => journal.dayOf(record),
    });

    // Sleep is the one that genuinely spans days, so it goes through the
    // period projection rather than being pinned to a single date.
    const sleep = journal.inScope("sleep").map(record =>
      projectPeriod({
        id: record.id,
        category: "sleep",
        title: `${record.body.hours ?? 0}h sleep`,
        start: record.period.start,
        end: record.period.end,
        timezone: journal.store.timezone,
      })
    );

    return [...tasks, ...water, ...habits, ...sleep];
  }, [journal]);

  const grid = monthGrid({
    events,
    month,
    today: journal.today,
    weekStartsOn: journal.preferences.weekStartsOn,
    visibility: hidden,
  });

  const monthEnd = shiftDayKey(monthStartKey(shiftDayKey(month, 32)), -1);
  const counts = categoryCounts(events, month, monthEnd);
  const present = ALL_CATEGORIES.filter(category => counts[category] > 0);

  const selectedDay = selected
    ? grid.find(entry => entry.day === selected)
    : undefined;

  return (
    <div className="journal-calendar">
      <div className="calendar-heading">
        <button
          type="button"
          onClick={() => setMonth(monthStartKey(shiftDayKey(month, -1)))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <b>
          {formatDayKey(month, journal.preferences.locale, {
            month: "long",
            year: "numeric",
          })}
        </b>
        <button
          type="button"
          onClick={() => setMonth(monthStartKey(shiftDayKey(month, 32)))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {present.length > 0 ? (
        <div className="calendar-filters" role="group" aria-label="Show">
          {present.map(category => {
            const shown = hidden[category] !== false;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={shown}
                className={shown ? "active" : ""}
                onClick={() =>
                  setHidden(current => ({ ...current, [category]: !shown }))
                }
              >
                {category} <small>{counts[category]}</small>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="calendar-grid" role="grid">
        {WEEKDAYS.map(day => (
          <div key={day} className="calendar-weekday" role="columnheader">
            {day}
          </div>
        ))}

        {grid.map(entry => (
          <button
            key={entry.day}
            type="button"
            role="gridcell"
            className={[
              "calendar-day",
              entry.inPeriod ? "" : "outside",
              entry.isToday ? "today" : "",
              entry.day === selected ? "selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              setSelected(entry.day === selected ? null : entry.day)
            }
            aria-label={`${entry.day}, ${entry.events.length} entries`}
          >
            <span>{Number(entry.day.slice(-2))}</span>
            {entry.events.length > 0 ? (
              // A count, not a colour: the number is the information, and it
              // reads the same to everyone.
              <small>{entry.events.length}</small>
            ) : null}
          </button>
        ))}
      </div>

      {selectedDay ? (
        <div className="calendar-day-detail">
          <b>
            {formatDayKey(selectedDay.day, journal.preferences.locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </b>
          {selectedDay.events.length === 0 ? (
            <small>Nothing recorded on this day.</small>
          ) : (
            <ul>
              {selectedDay.events.map(event => (
                <li key={event.id}>
                  <span className="calendar-event-scope">{event.category}</span>
                  <span>{event.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
