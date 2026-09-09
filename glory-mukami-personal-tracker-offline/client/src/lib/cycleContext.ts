export function toggleCycleContextTag(tags: string[], tag: string) {
  return tags.includes(tag)
    ? tags.filter(item => item !== tag)
    : [...tags, tag];
}

export function addCycleContextTag(tags: string[], draft: string) {
  const tag = draft.trim();
  return !tag || tags.includes(tag) ? tags : [...tags, tag];
}
