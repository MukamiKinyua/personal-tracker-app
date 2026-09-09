/**
 * The global quick-search.
 *
 * One field, opened with Cmd+K, that reaches every chapter, log, task, and
 * note. It runs entirely over records already in memory: nothing is sent
 * anywhere, which is both faster than a round trip and the only version
 * compatible with the privacy the sensitive chapters promise.
 *
 * Ranking favours a title over a body match and an earlier match over a later
 * one, because the thing a person is looking for is almost always something
 * they can already name.
 */

import type { DayKey } from "./datetime";

export type SearchDoc = {
  id: string;
  scope: string;
  /** The line shown in the results list. */
  title: string;
  /** Everything else worth matching against; never shown in full. */
  body?: string;
  day?: DayKey;
  /** Where selecting the result should go. */
  target?: string;
};

export type SearchHit = SearchDoc & {
  score: number;
  /** Character ranges in the title that matched, for highlighting. */
  matches: Array<[number, number]>;
};

function normalise(value: string): string {
  return (
    value
      .toLowerCase()
      // Fold accents so "cafe" finds "café".
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  );
}

/** Splits a query into terms; every term must match somewhere. */
export function queryTerms(query: string): string[] {
  return normalise(query)
    .split(/\s+/)
    .map(term => term.trim())
    .filter(Boolean);
}

function scoreField(
  field: string,
  terms: string[]
): { score: number; matches: Array<[number, number]> } | null {
  const haystack = normalise(field);
  const matches: Array<[number, number]> = [];
  let score = 0;

  for (const term of terms) {
    const index = haystack.indexOf(term);
    if (index === -1) return null;

    matches.push([index, index + term.length]);

    // A match at the start of the field, or at a word boundary, is much more
    // likely to be what was meant than one buried mid-word.
    if (index === 0) score += 100;
    else if (/\s|[-_/]/.test(haystack[index - 1] ?? "")) score += 60;
    else score += 20;

    // Prefer a match that covers more of the field.
    score += Math.round((term.length / Math.max(1, haystack.length)) * 40);
  }

  return { score, matches };
}

export type SearchOptions = {
  limit?: number;
  /** Restrict to these scopes; empty or absent searches everything. */
  scopes?: string[];
};

export function search(
  query: string,
  docs: SearchDoc[],
  { limit = 20, scopes }: SearchOptions = {}
): SearchHit[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const pool =
    scopes && scopes.length > 0
      ? docs.filter(doc => scopes.includes(doc.scope))
      : docs;

  const hits: SearchHit[] = [];

  for (const doc of pool) {
    const titleHit = scoreField(doc.title, terms);
    if (titleHit) {
      hits.push({
        ...doc,
        score: titleHit.score + 200,
        matches: titleHit.matches,
      });
      continue;
    }

    // Fall back to the body, ranked well below any title match.
    if (doc.body) {
      const bodyHit = scoreField(doc.body, terms);
      if (bodyHit) {
        hits.push({ ...doc, score: bodyHit.score, matches: [] });
      }
    }
  }

  return hits
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Same relevance: the more recent record is the more likely one.
      if (a.day && b.day && a.day !== b.day) return b.day.localeCompare(a.day);
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

/** Results grouped under their chapter, the shape the palette renders. */
export function groupHits(
  hits: SearchHit[]
): Array<{ scope: string; hits: SearchHit[] }> {
  const groups = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const bucket = groups.get(hit.scope);
    if (bucket) bucket.push(hit);
    else groups.set(hit.scope, [hit]);
  }
  // Map preserves insertion order, so the best-scoring scope stays first.
  return Array.from(groups, ([scope, scopeHits]) => ({
    scope,
    hits: scopeHits,
  }));
}

/**
 * Splits a title into matched and unmatched pieces for highlighting, without
 * building HTML — the caller renders the parts, so nothing user-entered is
 * ever interpreted as markup.
 */
export function highlight(
  title: string,
  matches: Array<[number, number]>
): Array<{ text: string; matched: boolean }> {
  if (matches.length === 0) return [{ text: title, matched: false }];

  const merged = mergeRanges(matches);
  const parts: Array<{ text: string; matched: boolean }> = [];
  let cursor = 0;

  for (const [start, end] of merged) {
    if (start > cursor) {
      parts.push({ text: title.slice(cursor, start), matched: false });
    }
    parts.push({ text: title.slice(start, end), matched: true });
    cursor = end;
  }
  if (cursor < title.length) {
    parts.push({ text: title.slice(cursor), matched: false });
  }
  return parts;
}

function mergeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([...range] as [number, number]);
    }
  }
  return merged;
}
