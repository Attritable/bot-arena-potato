import { BALANCE } from "./balance";
import { resolveCombat } from "./combat";
import { cardById, CARDS, enemyFor, STARTER_CARD_IDS } from "./content";
import {
  asInstanceId,
  type CardId,
  type Command,
  type Equipped,
  type NodeId,
  type Run,
} from "./domain";
import { teamStats, weightIfEquip } from "./loadout";
import { generateMap, nodeById } from "./map";
import { createRng, pickDistinct } from "./rng";

export function startRun(seed: number): Run {
  const map = generateMap(createRng(seed));
  const bag = STARTER_CARD_IDS.map((cardId, index) => ({
    instanceId: asInstanceId(`s${index}`),
    cardId,
    plus: 0,
  }));
  const equipped: Equipped = {
    defender: bag[0]!.instanceId,
    striker: bag[1]!.instanceId,
    leader: bag[2]!.instanceId,
    controller: bag[3]!.instanceId,
  };
  return {
    seed,
    rolls: 0,
    hp: BALANCE.startHp,
    maxHp: BALANCE.startHp,
    cash: BALANCE.startCash,
    weightLimit: BALANCE.weightLimit,
    bag,
    equipped,
    nextInstance: bag.length,
    map,
    current: null,
    visited: [],
    screen: { kind: "title" },
  };
}

export function applyCommand(run: Run, command: Command): Run {
  switch (command.kind) {
    case "start":
      return run.screen.kind === "title" ? { ...run, screen: { kind: "map" } } : run;
    case "restart":
      return startRun(run.seed + 1);
    case "pickNode":
      return pickNode(run, command.nodeId);
    case "equip":
      return equip(run, command.instanceId);
    case "unequip":
      return unequip(run, command.role);
    case "commitFight":
      return commitFight(run);
    case "continueAfterCombat":
      return continueAfterCombat(run);
    case "takeReward":
      return takeReward(run, command.cardId);
    case "skipReward":
      return run.screen.kind === "reward" ? { ...run, screen: { kind: "map" } } : run;
    case "restHeal":
      return restHeal(run);
    case "restUpgrade":
      return restUpgrade(run, command.instanceId);
    case "buy":
      return buy(run, command.cardId);
    case "leaveShop":
      return run.screen.kind === "shop" ? { ...run, screen: { kind: "map" } } : run;
    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
}

export function availableNodes(run: Run): NodeId[] {
  if (run.current === null) {
    return run.map.entrance;
  }
  return nodeById(run.map, run.current).next;
}

function pickNode(run: Run, nodeId: NodeId): Run {
  if (run.screen.kind !== "map") {
    return run;
  }
  if (!availableNodes(run).includes(nodeId)) {
    return run;
  }
  const node = nodeById(run.map, nodeId);
  const next: Run = {
    ...run,
    current: nodeId,
    visited: [...run.visited, nodeId],
  };
  if (node.kind === "rest") {
    return { ...next, screen: { kind: "rest" } };
  }
  if (node.kind === "shop") {
    const rolled = withRng(next);
    const stock = pickDistinct(rolled.rng, CARDS, 3);
    return { ...rolled.run, screen: { kind: "shop", stock } };
  }
  return { ...next, screen: { kind: "loadout", nodeId } };
}

function equip(run: Run, instanceId: Run["bag"][number]["instanceId"]): Run {
  if (run.screen.kind !== "loadout") {
    return run;
  }
  const instance = run.bag.find((item) => item.instanceId === instanceId);
  if (!instance) {
    return run;
  }
  if (weightIfEquip(run, instance) > run.weightLimit) {
    return run;
  }
  const card = cardById(instance.cardId);
  return {
    ...run,
    equipped: { ...run.equipped, [card.role]: instance.instanceId },
  };
}

function unequip(run: Run, role: keyof Equipped): Run {
  if (run.screen.kind !== "loadout") {
    return run;
  }
  return { ...run, equipped: { ...run.equipped, [role]: null } };
}

function commitFight(run: Run): Run {
  if (run.screen.kind !== "loadout") {
    return run;
  }
  const node = nodeById(run.map, run.screen.nodeId);
  const rolled = withRng(run);
  const enemy = enemyFor(node.kind, rolled.rng());
  const stats = teamStats(rolled.run);
  const report = resolveCombat({
    hp: rolled.run.hp,
    maxHp: rolled.run.maxHp,
    atk: stats.atk,
    armor: stats.armor,
    heal: stats.heal,
    control: stats.control,
    enemy,
  });
  return {
    ...rolled.run,
    hp: report.playerHpEnd,
    screen: { kind: "combat", nodeId: run.screen.nodeId, report },
  };
}

function continueAfterCombat(run: Run): Run {
  if (run.screen.kind !== "combat") {
    return run;
  }
  const node = nodeById(run.map, run.screen.nodeId);
  if (!run.screen.report.won) {
    return { ...run, screen: { kind: "end", outcome: "lose" } };
  }
  if (node.kind === "boss") {
    return { ...run, screen: { kind: "end", outcome: "win" } };
  }
  const cash = node.kind === "elite" ? BALANCE.eliteCash : BALANCE.fightCash;
  const rolled = withRng(run);
  const offers = pickDistinct(rolled.rng, CARDS, 3).map((card) => card.id);
  if (offers.length !== 3) {
    throw new Error("reward needs 3 cards");
  }
  return {
    ...rolled.run,
    cash: rolled.run.cash + cash,
    screen: {
      kind: "reward",
      cash,
      offers: [offers[0]!, offers[1]!, offers[2]!],
    },
  };
}

function takeReward(run: Run, cardId: CardId): Run {
  if (run.screen.kind !== "reward") {
    return run;
  }
  if (!run.screen.offers.includes(cardId)) {
    return run;
  }
  return { ...addCard(run, cardId), screen: { kind: "map" } };
}

function restHeal(run: Run): Run {
  if (run.screen.kind !== "rest") {
    return run;
  }
  return {
    ...run,
    hp: Math.min(run.maxHp, run.hp + BALANCE.restHeal),
    screen: { kind: "map" },
  };
}

function restUpgrade(run: Run, instanceId: Run["bag"][number]["instanceId"]): Run {
  if (run.screen.kind !== "rest") {
    return run;
  }
  const bag = run.bag.map((item) =>
    item.instanceId === instanceId ? { ...item, plus: item.plus + 1 } : item,
  );
  if (!bag.some((item, index) => item !== run.bag[index])) {
    return run;
  }
  return { ...run, bag, screen: { kind: "map" } };
}

function buy(run: Run, cardId: CardId): Run {
  if (run.screen.kind !== "shop") {
    return run;
  }
  const card = run.screen.stock.find((item) => item.id === cardId);
  if (!card || run.cash < card.cost) {
    return run;
  }
  const next = addCard(run, cardId);
  return {
    ...next,
    cash: next.cash - card.cost,
    screen: {
      kind: "shop",
      stock: run.screen.stock.filter((item) => item.id !== cardId),
    },
  };
}

function addCard(run: Run, cardId: CardId): Run {
  cardById(cardId);
  return {
    ...run,
    nextInstance: run.nextInstance + 1,
    bag: [
      ...run.bag,
      {
        instanceId: asInstanceId(`i${run.nextInstance}`),
        cardId,
        plus: 0,
      },
    ],
  };
}

function withRng(run: Run): { run: Run; rng: () => number } {
  return {
    run: { ...run, rolls: run.rolls + 1 },
    rng: createRng(run.seed + 7919 + run.rolls),
  };
}
