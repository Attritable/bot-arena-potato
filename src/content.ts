import { BALANCE } from "./balance";
import { asCardId, type CardId, type Enemy, type NodeKind, type PartCard } from "./domain";

export const CARDS: readonly PartCard[] = [
  {
    id: asCardId("plate-hull"),
    name: "Plate Hull",
    role: "defender",
    weight: 2,
    cost: 3,
    atk: 0,
    armor: 2,
    heal: 0,
    control: 0,
  },
  {
    id: asCardId("slab-plate"),
    name: "Slab Plate",
    role: "defender",
    weight: 4,
    cost: 6,
    atk: 0,
    armor: 4,
    heal: 0,
    control: 0,
  },
  {
    id: asCardId("spike-guard"),
    name: "Spike Guard",
    role: "defender",
    weight: 3,
    cost: 5,
    atk: 1,
    armor: 2,
    heal: 0,
    control: 0,
  },
  {
    id: asCardId("ablative-shell"),
    name: "Ablative Shell",
    role: "defender",
    weight: 5,
    cost: 7,
    atk: 0,
    armor: 5,
    heal: 0,
    control: 0,
  },
  {
    id: asCardId("spike-arm"),
    name: "Spike Arm",
    role: "striker",
    weight: 2,
    cost: 3,
    atk: 3,
    armor: 0,
    heal: 0,
    control: 0,
  },
  {
    id: asCardId("rail-spike"),
    name: "Rail Spike",
    role: "striker",
    weight: 4,
    cost: 6,
    atk: 5,
    armor: 0,
    heal: 0,
    control: 0,
  },
  {
    id: asCardId("glass-lance"),
    name: "Glass Lance",
    role: "striker",
    weight: 3,
    cost: 5,
    atk: 6,
    armor: 0,
    heal: 0,
    control: 0,
  },
  {
    id: asCardId("cleaver"),
    name: "Cleaver",
    role: "striker",
    weight: 5,
    cost: 7,
    atk: 4,
    armor: 1,
    heal: 0,
    control: 0,
  },
  {
    id: asCardId("patch-kit"),
    name: "Patch Kit",
    role: "leader",
    weight: 2,
    cost: 3,
    atk: 0,
    armor: 0,
    heal: 2,
    control: 0,
  },
  {
    id: asCardId("med-pump"),
    name: "Med Pump",
    role: "leader",
    weight: 4,
    cost: 6,
    atk: 0,
    armor: 0,
    heal: 4,
    control: 0,
  },
  {
    id: asCardId("ward-beacon"),
    name: "Ward Beacon",
    role: "leader",
    weight: 3,
    cost: 5,
    atk: 0,
    armor: 1,
    heal: 2,
    control: 0,
  },
  {
    id: asCardId("overclock-serum"),
    name: "Overclock Serum",
    role: "leader",
    weight: 3,
    cost: 5,
    atk: 1,
    armor: 0,
    heal: 1,
    control: 0,
  },
  {
    id: asCardId("focus-lens"),
    name: "Focus Lens",
    role: "controller",
    weight: 2,
    cost: 3,
    atk: 0,
    armor: 0,
    heal: 0,
    control: 2,
  },
  {
    id: asCardId("stun-coil"),
    name: "Stun Coil",
    role: "controller",
    weight: 4,
    cost: 6,
    atk: 0,
    armor: 0,
    heal: 0,
    control: 4,
  },
  {
    id: asCardId("priority-flag"),
    name: "Priority Flag",
    role: "controller",
    weight: 3,
    cost: 5,
    atk: 1,
    armor: 0,
    heal: 0,
    control: 2,
  },
  {
    id: asCardId("jammer"),
    name: "Jammer",
    role: "controller",
    weight: 5,
    cost: 7,
    atk: 0,
    armor: 0,
    heal: 0,
    control: 5,
  },
];

export const STARTER_CARD_IDS: readonly CardId[] = [
  asCardId("plate-hull"),
  asCardId("spike-arm"),
  asCardId("patch-kit"),
  asCardId("focus-lens"),
];

const CARD_BY_ID = new Map(CARDS.map((card) => [card.id, card]));

export function cardById(id: CardId): PartCard {
  const card = CARD_BY_ID.get(id);
  if (!card) {
    throw new Error(`unknown card ${id}`);
  }
  return card;
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

export function enemyFor(kind: NodeKind, roll: number): Enemy {
  if (kind === "elite") {
    return roll < 0.5 ? ELITE_ENEMIES[0]! : ELITE_ENEMIES[1]!;
  }
  if (kind === "boss") {
    return BOSS_ENEMY;
  }
  return roll < 0.5 ? FIGHT_ENEMIES[0]! : FIGHT_ENEMIES[1]!;
}
