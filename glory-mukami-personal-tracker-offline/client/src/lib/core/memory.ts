/**
 * What the app remembers about the user.
 *
 * Favourite workout, current project, the meal they keep coming back to. The
 * governing rule from the requirement is short and absolute: **the user
 * controls what the app remembers.**
 *
 * That rule is enforced structurally rather than by good intentions. Nothing
 * enters memory without an explicit act — either the user wrote it, or they
 * accepted a suggestion. Observed patterns are kept in a separate, unconfirmed
 * state that the interface must present as a question, never as a fact about
 * the person.
 */

export type MemoryKind =
  | "favourite"
  | "current"
  | "preference"
  | "person"
  | "place"
  | "fact";

export type MemoryItem = {
  id: string;
  kind: MemoryKind;
  /** What this is about, e.g. "Favourite workout". */
  label: string;
  value: string;
  /**
   * How it got here. A suggestion is not yet a memory: it is an offer, and it
   * must be confirmed before anything in the app treats it as true.
   */
  origin: "user" | "suggested";
  confirmed: boolean;
  /** Why it was suggested, so the user can judge the offer. */
  because?: string;
  createdAt: string;
  updatedAt: string;
};

let counter = 0;

function nextId(label: string): string {
  counter += 1;
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `mem_${slug || "item"}_${counter.toString(36)}`;
}

/** Something the user typed. Confirmed by definition. */
export function rememberFact({
  kind,
  label,
  value,
  now = new Date(),
}: {
  kind: MemoryKind;
  label: string;
  value: string;
  now?: Date;
}): MemoryItem {
  const at = now.toISOString();
  return {
    id: nextId(label),
    kind,
    label,
    value,
    origin: "user",
    confirmed: true,
    createdAt: at,
    updatedAt: at,
  };
}

/**
 * Something the app noticed and would like to remember. Deliberately arrives
 * unconfirmed: noticing that someone logs "rice and beans" often is not the
 * same as knowing it is their favourite meal.
 */
export function suggestFact({
  kind,
  label,
  value,
  because,
  now = new Date(),
}: {
  kind: MemoryKind;
  label: string;
  value: string;
  because: string;
  now?: Date;
}): MemoryItem {
  const at = now.toISOString();
  return {
    id: nextId(label),
    kind,
    label,
    value,
    origin: "suggested",
    confirmed: false,
    because,
    createdAt: at,
    updatedAt: at,
  };
}

export function confirm(item: MemoryItem, now: Date = new Date()): MemoryItem {
  return { ...item, confirmed: true, updatedAt: now.toISOString() };
}

export function editValue(
  item: MemoryItem,
  value: string,
  now: Date = new Date()
): MemoryItem {
  return {
    ...item,
    value,
    // Editing a suggestion makes it the user's own.
    origin: "user",
    confirmed: true,
    because: undefined,
    updatedAt: now.toISOString(),
  };
}

export function forget(items: MemoryItem[], id: string): MemoryItem[] {
  return items.filter(item => item.id !== id);
}

/** Everything the app may actually use. Suggestions are excluded. */
export function activeMemory(items: MemoryItem[]): MemoryItem[] {
  return items.filter(item => item.confirmed);
}

/** Offers awaiting a decision, for the "is this right?" prompt. */
export function pendingSuggestions(items: MemoryItem[]): MemoryItem[] {
  return items.filter(item => !item.confirmed);
}

export function memoryValue(
  items: MemoryItem[],
  label: string
): string | undefined {
  return activeMemory(items).find(item => item.label === label)?.value;
}

/**
 * Turns a repeated entry into a suggestion, once it has happened often enough
 * to be worth asking about.
 *
 * The threshold exists so a single unusual day never becomes a claim about who
 * someone is. Below it, nothing is offered at all.
 */
export function suggestFromRepetition({
  label,
  values,
  kind = "favourite",
  threshold = 4,
  now = new Date(),
}: {
  label: string;
  /** The recorded values, most recent first or in any order. */
  values: string[];
  kind?: MemoryKind;
  threshold?: number;
  now?: Date;
}): MemoryItem | null {
  if (values.length === 0) return null;

  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let best: { value: string; count: number } | null = null;
  for (const [key, count] of Array.from(counts)) {
    if (!best || count > best.count) {
      // Keep the original casing the user typed.
      const original = values.find(
        value => value.trim().toLowerCase() === key
      )!;
      best = { value: original.trim(), count };
    }
  }

  if (!best || best.count < threshold) return null;

  return suggestFact({
    kind,
    label,
    value: best.value,
    because: `You have recorded this ${best.count} times.`,
    now,
  });
}

/** A sentence the user can accept or dismiss. Always phrased as a question. */
export function suggestionPrompt(item: MemoryItem): string {
  return `${item.label}: ${item.value}? ${item.because ?? ""}`.trim();
}
