/**
 * Where the user was, where they go often, and what they have starred.
 *
 * This is what turns "Open Journal" into "Welcome back — you were on Sleep".
 * A book with fifty pages is only usable if it remembers your place, keeps
 * your favourites within reach, and tells you which chapters are asking for
 * something.
 */

export type PageVisit = {
  view: string;
  at: string;
};

export type NavigationState = {
  /** The page to reopen on launch. */
  lastVisited?: string;
  /** Most recent first, without duplicates. */
  recent: PageVisit[];
  /** Starred pages, in the order the user starred them. */
  favourites: string[];
  /** Chapters the user has expanded in the contents. */
  expandedChapters: string[];
};

export const RECENT_LIMIT = 8;

export function createNavigationState(): NavigationState {
  return { recent: [], favourites: [], expandedChapters: [] };
}

/**
 * Records a visit.
 *
 * The cover and the contents are excluded from "recent" on purpose: they are
 * how you get anywhere, so counting them would fill the list with the two
 * pages the list exists to help you avoid.
 */
const NOT_RECENT = new Set(["cover", "contents"]);

export function visit(
  state: NavigationState,
  view: string,
  now: Date = new Date()
): NavigationState {
  if (NOT_RECENT.has(view)) {
    return { ...state, lastVisited: view };
  }

  const recent = [
    { view, at: now.toISOString() },
    ...state.recent.filter(entry => entry.view !== view),
  ].slice(0, RECENT_LIMIT);

  return { ...state, lastVisited: view, recent };
}

/** Where to open on launch. Falls back to the cover for a new user. */
export function resumeView(state: NavigationState): string {
  return state.lastVisited ?? "cover";
}

export function isFavourite(state: NavigationState, view: string): boolean {
  return state.favourites.includes(view);
}

export function toggleFavourite(
  state: NavigationState,
  view: string
): NavigationState {
  return {
    ...state,
    favourites: isFavourite(state, view)
      ? state.favourites.filter(favourite => favourite !== view)
      : [...state.favourites, view],
  };
}

export function isExpanded(state: NavigationState, chapter: string): boolean {
  return state.expandedChapters.includes(chapter);
}

export function toggleChapter(
  state: NavigationState,
  chapter: string
): NavigationState {
  return {
    ...state,
    expandedChapters: isExpanded(state, chapter)
      ? state.expandedChapters.filter(existing => existing !== chapter)
      : [...state.expandedChapters, chapter],
  };
}

export function setChapterExpanded(
  state: NavigationState,
  chapter: string,
  expanded: boolean
): NavigationState {
  if (expanded === isExpanded(state, chapter)) return state;
  return toggleChapter(state, chapter);
}

export type ChapterEntry = {
  /** Two-digit number shown in the contents, e.g. "01". */
  number: string;
  name: string;
  description: string;
  pages: string[];
};

export type ChapterStatus = ChapterEntry & {
  pageCount: number;
  /** Records held across the chapter's pages. */
  recordCount: number;
  /** Items in the chapter asking for something now. */
  needsAttention: number;
  /** The most recent activity across its pages. */
  lastActivity?: string;
};

/**
 * The contents row for one chapter.
 *
 * `needsAttention` is separate from `recordCount` because they answer
 * different questions. A chapter holding four hundred finished records is not
 * asking for anything, and badging it would teach the user to ignore badges.
 */
export function chapterStatus({
  chapter,
  recordCounts = {},
  attentionCounts = {},
  lastActivity = {},
}: {
  chapter: ChapterEntry;
  recordCounts?: Record<string, number>;
  attentionCounts?: Record<string, number>;
  lastActivity?: Record<string, string>;
}): ChapterStatus {
  const stamps = chapter.pages
    .map(page => lastActivity[page])
    .filter((stamp): stamp is string => Boolean(stamp))
    .sort();

  return {
    ...chapter,
    pageCount: chapter.pages.length,
    recordCount: chapter.pages.reduce(
      (sum, page) => sum + (recordCounts[page] ?? 0),
      0
    ),
    needsAttention: chapter.pages.reduce(
      (sum, page) => sum + (attentionCounts[page] ?? 0),
      0
    ),
    lastActivity: stamps[stamps.length - 1],
  };
}

/**
 * Pages to offer above the full contents: favourites first, then recents that
 * are not already starred.
 */
export function quickJump(state: NavigationState, limit = 6): string[] {
  const seen = new Set(state.favourites);
  const recents = state.recent
    .map(entry => entry.view)
    .filter(view => !seen.has(view));
  return [...state.favourites, ...recents].slice(0, limit);
}

/** "Welcome back" line for the cover. */
export function welcomeBack({
  state,
  needsAttention,
  name,
}: {
  state: NavigationState;
  needsAttention: number;
  name?: string;
}): { greeting: string; detail: string; resumeTo: string } {
  const greeting = name ? `Welcome back, ${name}.` : "Welcome back.";

  const detail =
    needsAttention === 0
      ? "Nothing is waiting for you."
      : `You have ${needsAttention} thing${needsAttention === 1 ? "" : "s"} to check in on.`;

  return { greeting, detail, resumeTo: resumeView(state) };
}
