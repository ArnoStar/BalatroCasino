// "Fill it for me": some of the player's items whose values add up to a range
// (a coinflip's or a dice game's match), as few as can be. A small search that
// tries the largest items first and stops early; it gives up after so many steps.

export interface Valued {
  id: string;
  value: number;
}

const STEPS = 200_000;

/** up to `max` of `items` worth `low` to `high` together, or null */
export function fill(items: Valued[], low: number, high: number, max: number): string[] | null {
  const sorted = items.filter((i) => i.value > 0 && i.value <= high).sort((a, b) => b.value - a.value);
  // the most `k` items from index i can add: the k largest from there
  const best_from = (i: number, k: number) => {
    let s = 0;
    for (let j = i; j < Math.min(sorted.length, i + k); j++) s += sorted[j].value;
    return s;
  };
  for (let size = 1; size <= Math.min(max, sorted.length); size++) {
    let steps = 0;
    const picked: number[] = [];
    const search = (from: number, sum: number): boolean => {
      if (++steps > STEPS) return false;
      if (picked.length === size) return sum >= low && sum <= high;
      const left = size - picked.length;
      for (let i = from; i <= sorted.length - left; i++) {
        const v = sorted[i].value;
        if (sum + v > high) continue;
        if (sum + best_from(i, left) < low) return false; // (the rest are smaller still)
        picked.push(i);
        if (search(i + 1, sum + v)) return true;
        picked.pop();
      }
      return false;
    };
    if (search(0, 0)) return picked.map((i) => sorted[i].id);
  }
  return null;
}
