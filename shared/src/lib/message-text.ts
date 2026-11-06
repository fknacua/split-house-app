/**
 * Counting a message's characters the way the user sees them, for the template editor's counter
 * and the limit the server checks. Both sides call this, so they always agree.
 */

const ZWJ = 0x200d;

/** Code points drawn as part of the character before them: variation selectors, skin tones, the keycap, tags and combining accents. */
function joinsPrevious(cp: number): boolean {
  return (
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
    cp === 0x20e3 ||
    (cp >= 0xe0020 && cp <= 0xe007f) ||
    (cp >= 0x0300 && cp <= 0x036f)
  );
}

const isRegionalIndicator = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;

/**
 * Counts the characters in a message as the user sees them, so an emoji counts as 1, including one built from several
 * code points (a skin tone, a flag, a family joined with zero-width joiners or a keycap). Works without
 * `Intl.Segmenter`, which the app's JavaScript engine lacks, so the app and the server count the same.
 *
 * @param text The message as typed.
 * @returns The number of characters.
 */
export function countMessageCharacters(text: string): number {
  let count = 0;
  let joined = false;
  let pendingFlag = false;
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp === ZWJ) {
      joined = true;
      continue;
    }
    if (joined) {
      joined = false;
      continue;
    }
    if (joinsPrevious(cp)) continue;
    if (isRegionalIndicator(cp)) {
      // Two regional indicators make one flag.
      if (pendingFlag) {
        pendingFlag = false;
        continue;
      }
      pendingFlag = true;
    } else {
      pendingFlag = false;
    }
    count += 1;
  }
  return count;
}
