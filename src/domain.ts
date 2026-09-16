export type Role = "controller" | "defender" | "striker" | "leader";

export type NodeKind = "fight" | "elite" | "rest" | "shop" | "boss";

export type CardId = string & { readonly __brand: "CardId" };
export type NodeId = string & { readonly __brand: "NodeId" };
export type InstanceId = string & { readonly __brand: "InstanceId" };

export function asCardId(id: string): CardId {
  return id as CardId;
}

export function asNodeId(id: string): NodeId {
  return id as NodeId;
}

export function asInstanceId(id: string): InstanceId {
  return id as InstanceId;
}

export type PartCard = {
  id: CardId;
  name: string;
  role: Role;
  weight: number;
  cost: number;
  atk: number;
  armor: number;
  heal: number;
  control: number;
};

export type CardInstance = {
  instanceId: InstanceId;
  cardId: CardId;
  plus: number;
};

export type MapNode = {
  id: NodeId;
  floor: number;
  slot: number;
  kind: NodeKind;
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
  | { kind: "loadout"; nodeId: NodeId }
  | { kind: "combat"; nodeId: NodeId; report: CombatReport }
  | { kind: "reward"; cash: number; offers: [CardId, CardId, CardId] }
  | { kind: "rest" }
  | { kind: "shop"; stock: PartCard[] }
  | { kind: "end"; outcome: "win" | "lose" };

export type Equipped = Record<Role, InstanceId | null>;

export type Run = {
  seed: number;
  rolls: number;
  hp: number;
  maxHp: number;
  cash: number;
  weightLimit: number;
  bag: CardInstance[];
  equipped: Equipped;
  nextInstance: number;
  map: MapGraph;
  current: NodeId | null;
  visited: NodeId[];
  screen: Screen;
};

export type Command =
  | { kind: "start" }
  | { kind: "pickNode"; nodeId: NodeId }
  | { kind: "equip"; instanceId: InstanceId }
  | { kind: "unequip"; role: Role }
  | { kind: "commitFight" }
  | { kind: "continueAfterCombat" }
  | { kind: "takeReward"; cardId: CardId }
  | { kind: "skipReward" }
  | { kind: "restHeal" }
  | { kind: "restUpgrade"; instanceId: InstanceId }
  | { kind: "buy"; cardId: CardId }
  | { kind: "leaveShop" }
  | { kind: "restart" };

export const ROLES: readonly Role[] = [
  "defender",
  "striker",
  "leader",
  "controller",
];

export const NODE_KINDS: readonly NodeKind[] = [
  "fight",
  "elite",
  "rest",
  "shop",
  "boss",
];
