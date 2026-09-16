export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickIndex(rng: () => number, length: number): number {
  return Math.floor(rng() * length);
}

export function pickDistinct<T>(
  rng: () => number,
  items: readonly T[],
  count: number,
): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const i = pickIndex(rng, pool.length);
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}
