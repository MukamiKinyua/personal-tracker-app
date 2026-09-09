import { createContext, useContext } from "react";

/**
 * Marks a subtree as a ghost: a second, purely visual copy of a spread.
 *
 * The page turn paints three copies of a spread at once - the outgoing page on
 * the turning leaf, and the incoming page both underneath it and on the leaf's
 * reverse - so that the book has real pages on every surface. Only one of those
 * copies is the live page. The rest must not touch storage, or a single turn
 * would write the same scope several times over and race the real page's own
 * save.
 */
export const JournalGhostContext = createContext(false);

export function useIsJournalGhost(): boolean {
  return useContext(JournalGhostContext);
}
