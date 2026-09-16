import {
  asNodeId,
  type MapGraph,
  type MapNode,
  type NodeKind,
} from "./domain";
import { pickIndex } from "./rng";

const MID_KINDS: readonly NodeKind[] = ["fight", "elite", "rest", "shop"];

export function generateMap(rng: () => number): MapGraph {
  const nodes: MapNode[] = [];
  const floors: MapNode[][] = [];

  const add = (floor: number, slot: number, kind: NodeKind): MapNode => {
    const node: MapNode = {
      id: asNodeId(`f${floor}s${slot}`),
      floor,
      slot,
      kind,
      next: [],
    };
    nodes.push(node);
    return node;
  };

  floors[1] = [add(1, 0, "fight")];
  for (let floor = 2; floor <= 6; floor += 1) {
    const pair = pickTwoKinds(rng, floor);
    floors[floor] = [add(floor, 0, pair[0]), add(floor, 1, pair[1])];
  }
  floors[7] = [add(7, 0, "shop"), add(7, 1, "elite")];
  floors[8] = [add(8, 0, "rest")];
  floors[9] = [add(9, 0, "boss")];

  for (let floor = 1; floor <= 8; floor += 1) {
    const here = floors[floor];
    const nxt = floors[floor + 1];
    if (!here || !nxt) {
      throw new Error("map floors missing");
    }
    for (const node of here) {
      node.next = nxt.map((item) => item.id);
    }
  }

  const first = floors[1];
  const last = floors[9];
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

export function siblingsUnique(map: MapGraph): boolean {
  const byFloor = new Map<number, NodeKind[]>();
  for (const node of map.nodes) {
    const list = byFloor.get(node.floor) ?? [];
    list.push(node.kind);
    byFloor.set(node.floor, list);
  }
  for (const kinds of byFloor.values()) {
    if (new Set(kinds).size !== kinds.length) {
      return false;
    }
  }
  return true;
}

function pickTwoKinds(rng: () => number, floor: number): [NodeKind, NodeKind] {
  const pool = MID_KINDS.filter((kind) => floor >= 3 || kind !== "elite");
  const first = pool[pickIndex(rng, pool.length)]!;
  const rest = pool.filter((kind) => kind !== first);
  const second = rest[pickIndex(rng, rest.length)]!;
  return [first, second];
}
