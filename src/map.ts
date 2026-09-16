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
  [[0, 1], [1, 2], [2, 3]],
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

  const map = {
    nodes,
    entrance: first.map((node) => node.id),
    boss: last[0].id,
  };
  if (!mapWiringOk(map)) {
    throw new Error("map wiring missing an entry or an exit");
  }
  return map;
}

export function nodeById(map: MapGraph, id: ReturnType<typeof asNodeId>): MapNode {
  const node = map.nodes.find((item) => item.id === id);
  if (!node) {
    throw new Error(`unknown node ${id}`);
  }
  return node;
}

export function mapWiringOk(map: MapGraph): boolean {
  const incoming = new Map<MapNode["id"], number>();
  for (const node of map.nodes) {
    incoming.set(node.id, 0);
  }
  for (const node of map.nodes) {
    for (const id of node.next) {
      incoming.set(id, (incoming.get(id) ?? 0) + 1);
    }
  }
  const lastFloor = Math.max(...map.nodes.map((node) => node.floor));
  const exits = map.nodes.filter((node) => node.floor === lastFloor - 1);
  if (exits.length === 0) {
    return false;
  }
  if (!exits.every((node) => node.next.includes(map.boss))) {
    return false;
  }
  for (const node of map.nodes) {
    const inn = incoming.get(node.id) ?? 0;
    if (node.id === map.boss) {
      if (node.next.length !== 0 || inn < 1) {
        return false;
      }
      continue;
    }
    if (map.entrance.includes(node.id)) {
      if (node.next.length < 1) {
        return false;
      }
      continue;
    }
    if (inn < 1 || node.next.length < 1) {
      return false;
    }
  }
  if (reachableFrom(map, map.entrance).size !== map.nodes.length) {
    return false;
  }
  return map.nodes.every(
    (node) => node.id === map.boss || reachableFrom(map, [node.id]).has(map.boss),
  );
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
