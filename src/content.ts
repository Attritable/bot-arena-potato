import { BALANCE } from "./balance";
import {
  asPartId,
  type Enemy,
  type NodeKind,
  type Part,
  type PartId,
  type Role,
  type RunKind,
  type RunKindId,
} from "./domain";

export const PARTS: readonly Part[] = [
  {
    id: asPartId("frame-light"),
    kind: "chassis",
    name: "Light Frame",
    weight: 2,
    capacity: 4,
    cost: 2,
  },
  {
    id: asPartId("frame-mid"),
    kind: "chassis",
    name: "Mid Frame",
    weight: 4,
    capacity: 8,
    cost: 5,
  },
  {
    id: asPartId("frame-heavy"),
    kind: "chassis",
    name: "Heavy Frame",
    weight: 6,
    capacity: 12,
    cost: 8,
  },
  {
    id: asPartId("mesh-skin"),
    kind: "plate",
    name: "Skin Mesh",
    weight: 1,
    armor: 1,
    cost: 2,
  },
  {
    id: asPartId("plate-rivet"),
    kind: "plate",
    name: "Rivet Plate",
    weight: 3,
    armor: 3,
    cost: 5,
  },
  {
    id: asPartId("plate-slab"),
    kind: "plate",
    name: "Slab Plate",
    weight: 5,
    armor: 5,
    cost: 8,
  },
  {
    id: asPartId("plate-shield"),
    kind: "plate",
    name: "Shield Plate",
    weight: 4,
    armor: 2,
    cost: 6,
  },
  {
    id: asPartId("focus-lens"),
    kind: "tool",
    name: "Focus Lens",
    role: "controller",
    weight: 2,
    cost: 3,
    effect: { family: "suppress", amount: 2, stun: false },
  },
  {
    id: asPartId("stun-coil"),
    kind: "tool",
    name: "Stun Coil",
    role: "controller",
    weight: 3,
    cost: 6,
    effect: { family: "suppress", amount: 2, stun: true },
  },
  {
    id: asPartId("jammer"),
    kind: "tool",
    name: "Jammer",
    role: "controller",
    weight: 4,
    cost: 7,
    effect: { family: "suppress", amount: 4, stun: false },
  },
  {
    id: asPartId("brace-kit"),
    kind: "tool",
    name: "Brace Kit",
    role: "defender",
    weight: 2,
    cost: 3,
    effect: { family: "brace", armor: 2, guard: 0 },
  },
  {
    id: asPartId("guard-door"),
    kind: "tool",
    name: "Guard Door",
    role: "defender",
    weight: 3,
    cost: 6,
    effect: { family: "brace", armor: 1, guard: 4 },
  },
  {
    id: asPartId("spike-guard"),
    kind: "tool",
    name: "Spike Guard",
    role: "defender",
    weight: 4,
    cost: 7,
    effect: { family: "brace", armor: 3, guard: 2 },
  },
  {
    id: asPartId("spike-arm"),
    kind: "tool",
    name: "Spike Arm",
    role: "striker",
    weight: 2,
    cost: 3,
    effect: { family: "strike", atk: 3, burst: 0 },
  },
  {
    id: asPartId("burst-rail"),
    kind: "tool",
    name: "Burst Rail",
    role: "striker",
    weight: 3,
    cost: 6,
    effect: { family: "strike", atk: 3, burst: 3 },
  },
  {
    id: asPartId("cleaver"),
    kind: "tool",
    name: "Cleaver",
    role: "striker",
    weight: 4,
    cost: 7,
    effect: { family: "strike", atk: 5, burst: 0 },
  },
  {
    id: asPartId("patch-kit"),
    kind: "tool",
    name: "Patch Kit",
    role: "leader",
    weight: 2,
    cost: 3,
    effect: { family: "mend", heal: 1, rally: 0 },
  },
  {
    id: asPartId("rally-flag"),
    kind: "tool",
    name: "Rally Flag",
    role: "leader",
    weight: 3,
    cost: 6,
    effect: { family: "mend", heal: 1, rally: 2 },
  },
  {
    id: asPartId("med-pump"),
    kind: "tool",
    name: "Med Pump",
    role: "leader",
    weight: 4,
    cost: 7,
    effect: { family: "mend", heal: 3, rally: 0 },
  },
];

export const STARTER_CHASSIS = asPartId("frame-light");
export const STARTER_PLATE = asPartId("mesh-skin");

export const STARTER_TOOL: Record<Role, PartId> = {
  defender: asPartId("brace-kit"),
  striker: asPartId("spike-arm"),
  leader: asPartId("patch-kit"),
  controller: asPartId("focus-lens"),
};

const PART_BY_ID = new Map(PARTS.map((part) => [part.id, part]));

export function partById(id: PartId): Part {
  const part = PART_BY_ID.get(id);
  if (!part) {
    throw new Error(`unknown part ${id}`);
  }
  return part;
}

const FIGHT_ENEMIES: readonly Enemy[] = [
  { name: "Scrap Drone", hp: BALANCE.fightHp[0], atk: BALANCE.fightAtk[0] },
  { name: "Rust Walker", hp: BALANCE.fightHp[1], atk: BALANCE.fightAtk[1] },
];

const ELITE_ENEMIES: readonly Enemy[] = [
  { name: "Riot Frame", hp: BALANCE.eliteHp[0], atk: BALANCE.eliteAtk[0] },
  { name: "Kiln Brute", hp: BALANCE.eliteHp[1], atk: BALANCE.eliteAtk[1] },
];

const BOSS_ENEMY: Enemy = {
  name: "Core Warden",
  hp: BALANCE.bossHp,
  atk: BALANCE.bossAtk,
};

export const RUN_KINDS: readonly RunKind[] = [
  {
    id: "patrol",
    name: "Patrol",
    blurb: "Free starter act. Team weight cap 32. Win pays 6 gold. Loss is free. Prize is one part upgrade.",
    weightLimit: 32,
    entryCost: 0,
    winGold: 6,
    loseGold: 0,
    prize: "upgrade",
  },
  {
    id: "raid",
    name: "Raid",
    blurb: "Pay 6 gold. Cap 44. Win pays 12. Loss costs 4. Prize is a chassis.",
    weightLimit: 44,
    entryCost: 6,
    winGold: 12,
    loseGold: 4,
    prize: "chassis",
  },
  {
    id: "haul",
    name: "Haul",
    blurb: "Pay 10 gold. Cap 60. Win pays 18. Loss costs 8. Prize is a chassis.",
    weightLimit: 60,
    entryCost: 10,
    winGold: 18,
    loseGold: 8,
    prize: "chassis",
  },
  {
    id: "glass",
    name: "Glass",
    blurb: "Pay 8 gold. Cap 28. Win pays 16. Loss costs 6. Prize is one part upgrade.",
    weightLimit: 28,
    entryCost: 8,
    winGold: 16,
    loseGold: 6,
    prize: "upgrade",
  },
];

const RUN_BY_ID = new Map(RUN_KINDS.map((kind) => [kind.id, kind]));

export function runKindById(id: RunKindId): RunKind {
  const kind = RUN_BY_ID.get(id);
  if (!kind) {
    throw new Error(`unknown run ${id}`);
  }
  return kind;
}

export function chassisParts(): Part[] {
  return PARTS.filter((part) => part.kind === "chassis");
}

export function enemyFor(kind: NodeKind, roll: number): Enemy {
  if (kind === "elite") {
    return roll < 0.5 ? ELITE_ENEMIES[0]! : ELITE_ENEMIES[1]!;
  }
  if (kind === "boss") {
    return BOSS_ENEMY;
  }
  return roll < 0.5 ? FIGHT_ENEMIES[0]! : FIGHT_ENEMIES[1]!;
}
