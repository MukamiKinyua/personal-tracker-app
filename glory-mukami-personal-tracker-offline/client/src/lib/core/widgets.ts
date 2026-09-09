/**
 * The widget system behind the Today page and the dashboard.
 *
 * Today has to stay useful, which means it must be allowed to stay small. The
 * requirement is explicit that it should carry only what is needed now and
 * "should not become a dense all-data dashboard" — so the layout is an
 * opt-in list the user orders, not every widget that could possibly render.
 *
 * A widget declares what it needs; it does not fetch. That keeps the Today
 * page one pass over the store rather than one query per card.
 */

export type WidgetKind =
  | "quick-log"
  | "today-habits"
  | "today-tasks"
  | "upcoming"
  | "water"
  | "sleep"
  | "mood"
  | "focus"
  | "movement"
  | "streaks"
  | "briefing"
  | "missing-data"
  | "goal-progress"
  | "notes";

export type WidgetDefinition = {
  kind: WidgetKind;
  title: string;
  /** One line, shown when the user is choosing widgets. */
  description: string;
  /** Scopes the widget reads, so Today can gather them in one pass. */
  reads: string[];
  /** On for a new user. Kept small on purpose. */
  defaultEnabled: boolean;
  /** Widgets that only make sense while an area is tracked (2.1). */
  requiresArea?: string;
  /** Rough height, so a default layout does not need hand-tuning. */
  size: "small" | "medium" | "tall";
};

export const WIDGET_CATALOG: WidgetDefinition[] = [
  {
    kind: "briefing",
    title: "Today at a glance",
    description: "A short summary of what today holds.",
    reads: ["task", "habit", "calendar"],
    defaultEnabled: true,
    size: "small",
  },
  {
    kind: "quick-log",
    title: "Quick log",
    description: "Record water, mood, or a habit without leaving the page.",
    reads: [],
    defaultEnabled: true,
    size: "small",
  },
  {
    kind: "today-habits",
    title: "Habits due today",
    description: "Only the habits actually scheduled for today.",
    reads: ["habit"],
    defaultEnabled: true,
    requiresArea: "habits",
    size: "medium",
  },
  {
    kind: "today-tasks",
    title: "Due and overdue",
    description: "Tasks and assignments needing attention now.",
    reads: ["task", "assignment"],
    defaultEnabled: true,
    requiresArea: "tasks",
    size: "medium",
  },
  {
    kind: "water",
    title: "Water",
    description: "Today's intake against your target.",
    reads: ["water"],
    defaultEnabled: true,
    requiresArea: "water",
    size: "small",
  },
  {
    kind: "sleep",
    title: "Last night",
    description: "How long you slept and how it felt.",
    reads: ["sleep"],
    defaultEnabled: true,
    requiresArea: "sleep",
    size: "small",
  },
  {
    kind: "mood",
    title: "Mood and energy",
    description: "Today's check-in, if you have made one.",
    reads: ["wellbeing"],
    defaultEnabled: false,
    requiresArea: "wellbeing",
    size: "small",
  },
  {
    kind: "upcoming",
    title: "Coming up",
    description: "The next few days across every chapter you show.",
    reads: ["calendar"],
    defaultEnabled: false,
    size: "medium",
  },
  {
    kind: "focus",
    title: "Focus",
    description: "Start a session, or see today's focused time.",
    reads: ["focus"],
    defaultEnabled: false,
    requiresArea: "focus",
    size: "small",
  },
  {
    kind: "movement",
    title: "Movement",
    description: "What you have moved today.",
    reads: ["movement"],
    defaultEnabled: false,
    requiresArea: "movement",
    size: "small",
  },
  {
    kind: "streaks",
    title: "Streaks",
    description: "Habits you have kept going.",
    reads: ["habit"],
    defaultEnabled: false,
    requiresArea: "habits",
    size: "medium",
  },
  {
    kind: "goal-progress",
    title: "Goals",
    description: "Where your longer-term goals stand.",
    reads: ["goal"],
    defaultEnabled: false,
    requiresArea: "goals",
    size: "medium",
  },
  {
    kind: "missing-data",
    title: "Gaps",
    description: "Days with nothing recorded, stated as fact.",
    reads: [],
    defaultEnabled: false,
    size: "small",
  },
  {
    kind: "notes",
    title: "Scratch note",
    description: "Somewhere to put a thought straight away.",
    reads: ["reflection"],
    defaultEnabled: false,
    size: "tall",
  },
];

export function widgetDefinition(
  kind: WidgetKind
): WidgetDefinition | undefined {
  return WIDGET_CATALOG.find(widget => widget.kind === kind);
}

/** The user's chosen widgets, in the order they appear. */
export type WidgetLayout = WidgetKind[];

export function defaultLayout(trackedAreas: string[] = []): WidgetLayout {
  return WIDGET_CATALOG.filter(widget => {
    if (!widget.defaultEnabled) return false;
    // Never place a widget for something the user chose not to track.
    if (widget.requiresArea && !trackedAreas.includes(widget.requiresArea)) {
      return false;
    }
    return true;
  }).map(widget => widget.kind);
}

export function addWidget(
  layout: WidgetLayout,
  kind: WidgetKind
): WidgetLayout {
  return layout.includes(kind) ? layout : [...layout, kind];
}

export function removeWidget(
  layout: WidgetLayout,
  kind: WidgetKind
): WidgetLayout {
  return layout.filter(widget => widget !== kind);
}

/**
 * Moves a widget to a new index. Used by drag-and-drop and by keyboard
 * reordering, which 2.7 requires to work without a pointer.
 */
export function moveWidget(
  layout: WidgetLayout,
  kind: WidgetKind,
  toIndex: number
): WidgetLayout {
  const from = layout.indexOf(kind);
  if (from === -1) return layout;

  const clamped = Math.max(0, Math.min(layout.length - 1, toIndex));
  if (clamped === from) return layout;

  const next = [...layout];
  next.splice(from, 1);
  next.splice(clamped, 0, kind);
  return next;
}

/**
 * Drops widgets that can no longer be shown, without editing the stored
 * layout. Switching an area back on should bring its widget back exactly where
 * it was, so the user's arrangement is filtered for display, never rewritten.
 */
export function visibleLayout(
  layout: WidgetLayout,
  trackedAreas: string[]
): WidgetLayout {
  return layout.filter(kind => {
    const definition = widgetDefinition(kind);
    if (!definition) return false;
    if (definition.requiresArea) {
      return trackedAreas.includes(definition.requiresArea);
    }
    return true;
  });
}

/** Widgets not yet placed, for the "add a widget" list. */
export function availableWidgets(
  layout: WidgetLayout,
  trackedAreas: string[]
): WidgetDefinition[] {
  return WIDGET_CATALOG.filter(widget => {
    if (layout.includes(widget.kind)) return false;
    if (widget.requiresArea && !trackedAreas.includes(widget.requiresArea)) {
      return false;
    }
    return true;
  });
}

/** Every scope the current layout needs, so Today can read the store once. */
export function requiredScopes(layout: WidgetLayout): string[] {
  const scopes = new Set<string>();
  for (const kind of layout) {
    for (const scope of widgetDefinition(kind)?.reads ?? []) {
      scopes.add(scope);
    }
  }
  return Array.from(scopes).sort();
}
