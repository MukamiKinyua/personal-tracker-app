import { useEffect, useRef } from "react";
import type { UpcomingItem, UpcomingSource } from "@/lib/eventReminders";
import { publishUpcoming } from "@/lib/upcoming";
import { useIsJournalGhost } from "./journalGhost";

/**
 * Tells the notification scheduler about a page's dated items.
 *
 * Two guards keep it from damaging what is already published. A "ghost" copy
 * of the page (the one drawn on the turning leaf) never publishes. And a page
 * that has not loaded its data yet renders an empty list for a moment, which
 * must not wipe the items published last time: an empty list is only believed
 * once this page has seen the list non-empty, i.e. once the person has
 * actually emptied it.
 */
export function usePublishUpcoming(
  source: UpcomingSource,
  items: UpcomingItem[]
) {
  const ghost = useIsJournalGhost();
  const key = JSON.stringify(items);
  const sawItems = useRef(false);

  useEffect(() => {
    if (ghost) return;
    if (items.length > 0) sawItems.current = true;
    if (items.length === 0 && !sawItems.current) return;
    publishUpcoming(source, items);
    // `key` stands for `items`: the array is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghost, key, source]);
}
