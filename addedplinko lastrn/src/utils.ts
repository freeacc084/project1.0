/**
 * Parses numeric inputs containing gamer abbreviations (K, M, B) into standard integers.
 */
export function parseGems(value: string | number): number {
  let s = String(value).toUpperCase().replace(/,/g, '').trim();
  let multiplier = 1;
  if (s.endsWith('K')) {
    multiplier = 1e3;
    s = s.slice(0, -1);
  } else if (s.endsWith('M')) {
    multiplier = 1e6;
    s = s.slice(0, -1);
  } else if (s.endsWith('B')) {
    multiplier = 1e9;
    s = s.slice(0, -1);
  }
  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : Math.round(parsed * multiplier);
}

/**
 * Formats values to a human-readable format.
 */
export function formatGems(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(2).replace(/\.00$/, '') + 'K';
  }
  return num.toString();
}
