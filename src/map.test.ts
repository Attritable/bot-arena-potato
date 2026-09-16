import { describe, expect, it } from "vitest";
import { asNodeId } from "./domain";
import { generateMap, reachableFrom } from "./map";
import { createRng } from "./rng";

describe("generateMap", () => {
  it("anchors three opening fights, a boss, and 3-4 rooms on mid floors", () => {
    const map = generateMap(createRng(1));
    const first = map.nodes.filter((node) => node.floor === 1);
    const boss = map.nodes.filter((node) => node.floor === 6);
    expect(first.map((node) => node.kind)).toEqual(["fight", "fight", "fight"]);
    expect(boss.map((node) => node.kind)).toEqual(["boss"]);
    expect(map.entrance).toEqual(first.map((node) => node.id));
    expect(map.boss).toEqual(boss[0]?.id);
    for (let floor = 2; floor <= 5; floor += 1) {
      const count = map.nodes.filter((node) => node.floor === floor).length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(4);
    }
  });

  it("hides elites before floor 3 and keeps mid-floor kinds from repeating when it can", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const map = generateMap(createRng(seed));
      const earlyElite = map.nodes.some(
        (node) => node.floor < 3 && node.kind === "elite",
      );
      expect(earlyElite).toBe(false);
      for (const floor of [3, 4, 5]) {
        const kinds = map.nodes
          .filter((node) => node.floor === floor)
          .map((node) => node.kind);
        expect(new Set(kinds).size).toBe(kinds.length);
      }
    }
  });

  it("locks later rooms so the left opening cannot reach the far-right floor-3 room", () => {
    const map = generateMap(createRng(7));
    const left = map.entrance[0];
    expect(left).toBe(asNodeId("f1s0"));
    const reachable = reachableFrom(map, [left!]);
    expect(reachable.has(asNodeId("f3s3"))).toBe(false);
    expect(reachable.has(map.boss)).toBe(true);
    const right = map.entrance[2];
    const fromRight = reachableFrom(map, [right!]);
    expect(fromRight.has(asNodeId("f3s3"))).toBe(true);
    expect(fromRight.has(asNodeId("f2s0"))).toBe(false);
  });
});
