/**
 * The global search, opened with Cmd+K.
 *
 * One field that reaches every chapter. It runs entirely over records already
 * in memory: nothing is sent anywhere, which is both faster than a round trip
 * and the only version compatible with the privacy the sensitive chapters
 * promise — a search box that phoned home would quietly undo that.
 */

import { useRecordStore } from "@/contexts/RecordStoreContext";
import {
  groupHits,
  highlight,
  search,
  type SearchDoc,
} from "@/lib/core/search";
import { useEffect, useMemo, useRef, useState } from "react";

/** Pulls something human-readable out of a record whose shape varies by page. */
function titleOf(body: Record<string, unknown>, scope: string): string {
  for (const key of [
    "title",
    "name",
    "description",
    "label",
    "note",
    "notes",
  ]) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "number") return `${value} ${key}`;
  }
  return scope;
}

export function SearchPalette({
  onOpenPage,
}: {
  onOpenPage?: (view: string) => void;
}) {
  const journal = useRecordStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const combo =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (combo) {
        event.preventDefault();
        setOpen(current => !current);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus only once it is actually open, so the shortcut does not steal the
  // caret from whatever the user was typing into.
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  const docs = useMemo<SearchDoc[]>(() => {
    const records = Object.values(journal.store.records).filter(
      record => !record.deletedAt
    );
    return records.map(record => ({
      id: record.id,
      scope: record.scope,
      title: titleOf(record.body, record.scope),
      body: Object.values(record.body)
        .filter(value => typeof value === "string")
        .join(" "),
      day: journal.dayOf(record),
      target: record.scope,
    }));
  }, [journal]);

  const groups = useMemo(
    () => (query.trim() ? groupHits(search(query, docs, { limit: 20 })) : []),
    [docs, query]
  );

  if (!open) return null;

  const total = groups.reduce((sum, group) => sum + group.hits.length, 0);

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search your journal"
      onClick={event => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="search-palette">
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search your journal…"
          onChange={event => setQuery(event.target.value)}
        />

        {query.trim() === "" ? (
          <p className="search-hint">
            Type to search every chapter. Nothing leaves this device.
          </p>
        ) : total === 0 ? (
          <p className="search-hint">No entries match “{query}”.</p>
        ) : (
          <div className="search-results">
            {groups.map(group => (
              <section key={group.scope}>
                <h3>{group.scope}</h3>
                <ul>
                  {group.hits.map(hit => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenPage?.(hit.target ?? hit.scope);
                          setOpen(false);
                        }}
                      >
                        <span>
                          {/* Rendered as parts, so a title can never inject markup. */}
                          {highlight(hit.title, hit.matches).map(
                            (part, index) =>
                              part.matched ? (
                                <mark key={index}>{part.text}</mark>
                              ) : (
                                <span key={index}>{part.text}</span>
                              )
                          )}
                        </span>
                        {hit.day ? <small>{hit.day}</small> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
