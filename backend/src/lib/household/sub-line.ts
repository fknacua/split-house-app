/**
 * Joins words the way a sentence does.
 *
 * @param words - The words.
 * @param conjunction - The word before the last one.
 * @returns `a`, `a and b`, or `a, b and c`.
 */
export function joinWords(words: string[], conjunction = "and"): string {
  return words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} ${conjunction} ${words.at(-1)}`;
}
