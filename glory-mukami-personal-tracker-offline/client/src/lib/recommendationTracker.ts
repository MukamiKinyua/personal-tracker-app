export function eligibleRecommendationSourceKeys(
  sourceKeys: readonly string[],
  selected: Record<string, boolean>,
  showLessFrom: Record<string, boolean>
): string[] {
  return sourceKeys.filter(key => selected[key] && !showLessFrom[key]);
}
