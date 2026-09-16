import { describe, expect, it } from "vitest";
import { generateMap, siblingsUnique } from "./map";
import { createRng } from "./rng";

describe("generateMap", () => {
  it("anchors a fight, a pre-boss rest, and a boss", () => {
    const map = generateMap(createRng(1));
    const first = map.nodes.filter((node) => node.floor === 1);
    const rest = map.nodes.filter((node) => node.floor === 8);
    const boss = map.nodes.filter((node) => node.floor === 9);
    expect(first.map((node) => node.kind)).toEqual(["fight"]);
    expect(rest.map((node) => node.kind)).toEqual(["rest"]);
    expect(boss.map((node) => node.kind)).toEqual(["boss"]);
    expect(map.entrance).toEqual(first.map((node) => node.id));
    expect(map.boss).toEqual(boss[0]?.id);
  });

  it("keeps sibling kinds unique and hides elites before floor 3", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const map = generateMap(createRng(seed));
      expect(siblingsUnique(map)).toBe(true);
      const earlyElite = map.nodes.some(
        (node) => node.floor < 3 && node.kind === "elite",
      );
      expect(earlyElite).toBe(false);
      const floor7 = map.nodes
        .filter((node) => node.floor === 7)
        .map((node) => node.kind)
        .sort();
      expect(floor7).toEqual(["elite", "shop"]);
    }
  });

  it("walks 9 nodes from the entrance to the boss", () => {
    const map = generateMap(createRng(7));
    let steps = 0;
    let ids = map.entrance;
    while (!ids.includes(map.boss)) {
      const node = map.nodes.find((item) => item.id === ids[0]);
      expect(node).toBeTruthy();
      ids = node!.next;
      steps += 1;
    }
    expect(steps + 1).toBe(9);
  });
});
