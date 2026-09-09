import { describe, expect, it } from "vitest";
import {
  chapterStatus,
  createNavigationState,
  isExpanded,
  isFavourite,
  quickJump,
  RECENT_LIMIT,
  resumeView,
  setChapterExpanded,
  toggleChapter,
  toggleFavourite,
  visit,
  welcomeBack,
} from "./navigation";

describe("remembering the user's place", () => {
  it("reopens where they were", () => {
    const state = visit(createNavigationState(), "sleep");
    expect(resumeView(state)).toBe("sleep");
  });

  it("opens the cover for someone who has never been anywhere", () => {
    expect(resumeView(createNavigationState())).toBe("cover");
  });

  it("keeps recents newest first, without duplicates", () => {
    let state = createNavigationState();
    state = visit(state, "water");
    state = visit(state, "sleep");
    state = visit(state, "water");
    expect(state.recent.map(entry => entry.view)).toEqual(["water", "sleep"]);
  });

  it("does not fill recents with the cover and contents", () => {
    let state = visit(createNavigationState(), "water");
    state = visit(state, "contents");
    state = visit(state, "cover");
    // Those two are how you get anywhere, so listing them helps nobody.
    expect(state.recent.map(entry => entry.view)).toEqual(["water"]);
    // They are still where the user was.
    expect(resumeView(state)).toBe("cover");
  });

  it("keeps the recent list bounded", () => {
    let state = createNavigationState();
    for (let index = 0; index < RECENT_LIMIT + 5; index += 1) {
      state = visit(state, `page${index}`);
    }
    expect(state.recent).toHaveLength(RECENT_LIMIT);
  });
});

describe("favourites and chapters", () => {
  it("stars and unstars a page", () => {
    let state = toggleFavourite(createNavigationState(), "water");
    expect(isFavourite(state, "water")).toBe(true);
    state = toggleFavourite(state, "water");
    expect(isFavourite(state, "water")).toBe(false);
  });

  it("remembers which chapters are open", () => {
    let state = toggleChapter(createNavigationState(), "BODY");
    expect(isExpanded(state, "BODY")).toBe(true);
    state = toggleChapter(state, "BODY");
    expect(isExpanded(state, "BODY")).toBe(false);
  });

  it("sets a chapter state idempotently", () => {
    const open = setChapterExpanded(createNavigationState(), "BODY", true);
    expect(setChapterExpanded(open, "BODY", true)).toBe(open);
  });

  it("offers favourites before recents, with no repeats", () => {
    let state = createNavigationState();
    state = visit(state, "sleep");
    state = visit(state, "water");
    state = toggleFavourite(state, "water");

    expect(quickJump(state)).toEqual(["water", "sleep"]);
  });
});

describe("chapter rows in the contents", () => {
  const chapter = {
    number: "01",
    name: "BODY",
    description: "Movement, food, rest",
    pages: ["water", "sleep", "workouts"],
  };

  it("adds up records and attention across its pages", () => {
    const status = chapterStatus({
      chapter,
      recordCounts: { water: 40, sleep: 12, workouts: 5 },
      attentionCounts: { sleep: 1 },
      lastActivity: {
        water: "2026-03-14T09:00:00.000Z",
        sleep: "2026-03-13T22:00:00.000Z",
      },
    });

    expect(status.pageCount).toBe(3);
    expect(status.recordCount).toBe(57);
    expect(status.needsAttention).toBe(1);
    expect(status.lastActivity).toBe("2026-03-14T09:00:00.000Z");
  });

  it("keeps a big archive from reading as a demand for attention", () => {
    const status = chapterStatus({
      chapter,
      recordCounts: { water: 400 },
    });
    expect(status.recordCount).toBe(400);
    expect(status.needsAttention).toBe(0);
  });

  it("reports no activity rather than a wrong date", () => {
    expect(chapterStatus({ chapter }).lastActivity).toBeUndefined();
  });
});

describe("the welcome back line", () => {
  it("says how many things are waiting", () => {
    const state = visit(createNavigationState(), "sleep");
    const welcome = welcomeBack({ state, needsAttention: 3, name: "Glory" });

    expect(welcome.greeting).toBe("Welcome back, Glory.");
    expect(welcome.detail).toBe("You have 3 things to check in on.");
    expect(welcome.resumeTo).toBe("sleep");
  });

  it("uses the singular for one", () => {
    const welcome = welcomeBack({
      state: createNavigationState(),
      needsAttention: 1,
    });
    expect(welcome.detail).toBe("You have 1 thing to check in on.");
  });

  it("says plainly when nothing is waiting", () => {
    const welcome = welcomeBack({
      state: createNavigationState(),
      needsAttention: 0,
    });
    expect(welcome.detail).toBe("Nothing is waiting for you.");
  });
});
