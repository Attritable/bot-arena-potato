import { BALANCE } from "./balance";
import {
  asNodeId,
  type MapGraph,
  type MapNode,
  type NodeKind,
  type WeightGate,
} from "./domain";
import { pickIndex } from "./rng";

const FLOOR_SIZES = [0, 3, 4, 4, 3, 3, 1] as const;

const LINKS: readonly (readonly (readonly number[])[])[] = [
  [],
  [[0, 1], [1, 2], [2]],
  [[0, 1], [1, 2], [2, 3], [3]],
  [[0], [0, 1], [1, 2], [2]],
  [[0, 1], [1], [1, 2]],
  [[0], [0], [0]],
];

const MID_KINDS: readonly NodeKind[] = ["fight", "elite", "rest", "shop"];

export function generateMap(rng: () => number): MapGraph {
  const nodes: MapNode[] = [];
  const floors: MapNode[][] = [];

  const add = (floor: number, slot: number, kind: NodeKind, gate: WeightGate): MapNode => {
    const node: MapNode = {
      id: asNodeId(`f${floor}s${slot}`),
      floor,
      slot,
      kind,
      gate,
      next: [],
    };
    nodes.push(node);
    return node;
  };

  floors[1] = [
    add(1, 0, "fight", { kind: "max", weight: BALANCE.lightMax }),
    add(1, 1, "fight", { kind: "any" }),
    add(1, 2, "fight", { kind: "min", weight: BALANCE.floor1HeavyMin }),
  ];

  for (let floor = 2; floor <= 5; floor += 1) {
    const size = FLOOR_SIZES[floor];
    if (size === undefined) {
      throw new Error("map floor size missing");
    }
    const kinds = pickUniqueKinds(rng, size, floor);
    floors[floor] = kinds.map((kind, slot) => add(floor, slot, kind, gateFor(floor, slot, kind)));
  }

  floors[6] = [add(6, 0, "boss", { kind: "any" })];

  for (let floor = 1; floor <= 5; floor += 1) {
    const here = floors[floor];
    const nxt = floors[floor + 1];
    const links = LINKS[floor];
    if (!here || !nxt || !links) {
      throw new Error("map floors missing");
    }
    here.forEach((node, slot) => {
      const targets = links[slot];
      if (!targets) {
        throw new Error("map link missing");
      }
      node.next = targets.map((nextSlot) => {
        const dest = nxt[nextSlot];
        if (!dest) {
          throw new Error("map link target missing");
        }
        return dest.id;
      });
    });
  }

  const first = floors[1];
  const last = floors[6];
  if (!first || !last || !last[0]) {
    throw new Error("map anchors missing");
  }

  return {
    nodes,
    entrance: first.map((node) => node.id),
    boss: last[0].id,
  };
}

export function nodeById(map: MapGraph, id: ReturnType<typeof asNodeId>): MapNode {
  const node = map.nodes.find((item) => item.id === id);
  if (!node) {
    throw new Error(`unknown node ${id}`);
  }
  return node;
}

export function reachableFrom(map: MapGraph, start: MapNode["id"][]): Set<MapNode["id"]> {
  const seen = new Set<MapNode["id"]>();
  const queue = [...start];
  while (queue.length > 0) {
    const id = queue.pop();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    queue.push(...nodeById(map, id).next);
  }
  return seen;
}

function gateFor(floor: number, slot: number, kind: NodeKind): WeightGate {
  if (kind === "rest" || kind === "boss") {
    return { kind: "any" };
  }
  if (slot === 0) {
    return { kind: "max", weight: BALANCE.lightMax };
  }
  if (slot >= 2) {
    return {
      kind: "min",
      weight: floor >= 4 ? BALANCE.lateHeavyMin : BALANCE.heavyMin,
    };
  }
  return { kind: "any" };
}

function pickUniqueKinds(rng: () => number, count: number, floor: number): NodeKind[] {
  const pool = MID_KINDS.filter((kind) => floor >= 3 || kind !== "elite");
  const picked: NodeKind[] = [];
  const remain = [...pool];
  while (picked.length < count && remain.length > 0) {
    const i = pickIndex(rng, remain.length);
    picked.push(remain.splice(i, 1)[0]!);
  }
  while (picked.length < count) {
    picked.push("fight");
  }
  return picked;
}
