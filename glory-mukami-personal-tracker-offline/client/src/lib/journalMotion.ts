// Keep in sync with --page-flip-duration in journal.css. The sweep runs for
// exactly this long, and the spread underneath is swapped at the halfway mark,
// while the paper veil is fully closed over it.
export function pageTurnDuration(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : 640;
}

export function pageTurnDestinationClass(destination: string): string {
  return `to-${destination}`;
}
