export type Role = "controller" | "defender" | "striker" | "leader";

export type NodeKind = "fight" | "elite" | "rest" | "shop" | "boss";

export type Slot = "chassis" | "plate" | "tool";

export type PartId = string & { readonly __brand: "PartId" };
export type NodeId = string & { readonly __brand: "NodeId" };
export type InstanceId = string & { readonly __brand: "InstanceId" };
export type BotId = string & { readonly __brand: "BotId" };

export function asPartId(id: string): PartId {
  return id as PartId;
}

export function asNodeId(id: string): NodeId {
  return id as NodeId;
}

export function asInstanceId(id: string): InstanceId {
  return id as InstanceId;
}

export function asBotId(id: string): BotId {
  return id as BotId;
}

export type WeightGate =
  | { kind: "any" }
  | { kind: "max"; weight: number }
  | { kind: "min"; weight: number };

export type ToolEffect =
  | { family: "suppress"; amount: number; stun: boolean }
  | { family: "brace"; armor: number; guard: number }
  | { family: "strike"; atk: number; burst: number }
  | { family: "mend"; heal: number; rally: number };

export type ChassisPart = {
  id: PartId;
  kind: "chassis";
  name: string;
  weight: number;
  capacity: number;
  cost: number;
};

export type PlatePart = {
  id: PartId;
  kind: "plate";
  name: string;
  weight: number;
  armor: number;
  cost: number;
};

export type ToolPart = {
  id: PartId;
  kind: "tool";
  name: string;
  role: Role;
  weight: number;
  cost: number;
  effect: ToolEffect;
};

export type Part = ChassisPart | PlatePart | ToolPart;

export type PartInstance = {
  instanceId: InstanceId;
  partId: PartId;
  plus: number;
};

export type Bot = {
  id: BotId;
  role: Role;
  chassis: InstanceId | null;
  plate: InstanceId | null;
  tool: InstanceId | null;
};

export type MapNode = {
  id: NodeId;
  floor: number;
  slot: number;
  kind: NodeKind;
  gate: WeightGate;
  next: NodeId[];
};

export type MapGraph = {
  nodes: MapNode[];
  entrance: NodeId[];
  boss: NodeId;
};

export type Enemy = {
  name: string;
  hp: number;
  atk: number;
};

export type CombatRound = {
  n: number;
  playerHp: number;
  enemyHp: number;
  dealt: number;
  taken: number;
  healed: number;
};

export type CombatReport = {
  won: boolean;
  enemyName: string;
  rounds: CombatRound[];
  playerHpEnd: number;
  enemyHpEnd: number;
};

export type Screen =
  | { kind: "title" }
  | { kind: "map" }
  | { kind: "kit" }
  | { kind: "loadout"; nodeId: NodeId }
  | { kind: "combat"; nodeId: NodeId; report: CombatReport }
  | { kind: "reward"; cash: number; offers: [PartId, PartId, PartId] }
  | { kind: "rest" }
  | { kind: "shop"; stock: Part[] }
  | { kind: "end"; outcome: "win" | "lose" };

export type Run = {
  seed: number;
  rolls: number;
  hp: number;
  maxHp: number;
  cash: number;
  bag: PartInstance[];
  bots: Bot[];
  nextInstance: number;
  map: MapGraph;
  current: NodeId | null;
  visited: NodeId[];
  screen: Screen;
};

export type Command =
  | { kind: "start" }
  | { kind: "pickNode"; nodeId: NodeId }
  | { kind: "openKit" }
  | { kind: "closeKit" }
  | { kind: "equip"; botId: BotId; slot: Slot; instanceId: InstanceId }
  | { kind: "unequip"; botId: BotId; slot: Slot }
  | { kind: "commitFight" }
  | { kind: "continueAfterCombat" }
  | { kind: "takeReward"; partId: PartId }
  | { kind: "skipReward" }
  | { kind: "restHeal" }
  | { kind: "restUpgrade"; instanceId: InstanceId }
  | { kind: "buy"; partId: PartId }
  | { kind: "leaveShop" }
  | { kind: "restart" };

export const ROLES: readonly Role[] = [
  "defender",
  "striker",
  "leader",
  "controller",
];

export const PARTY_ROLES: readonly Role[] = [
  "defender",
  "striker",
  "leader",
  "controller",
  "striker",
];

export const SLOTS: readonly Slot[] = ["chassis", "plate", "tool"];

export const NODE_KINDS: readonly NodeKind[] = [
  "fight",
  "elite",
  "rest",
  "shop",
  "boss",
];
