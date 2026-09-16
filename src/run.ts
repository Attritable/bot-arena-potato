import { BALANCE } from "./balance";
import { resolveCombat } from "./combat";
import {
  chassisParts,
  enemyFor,
  PARTS,
  partById,
  runKindById,
  STARTER_CHASSIS,
  STARTER_PLATE,
  STARTER_TOOL,
} from "./content";
import {
  asBotId,
  asInstanceId,
  PARTY_ROLES,
  type Bot,
  type Command,
  type NodeId,
  type PartId,
  type Run,
  type RunKindId,
  type Slot,
} from "./domain";
import {
  botById,
  botKit,
  canEquip,
  detachInstance,
  meetsGate,
  partyWeight,
  slotOfPart,
  teamStats,
} from "./loadout";
import { generateMap, nodeById } from "./map";
import { createRng, pickDistinct } from "./rng";

export function startRun(seed: number): Run {
  const map = generateMap(createRng(seed));
  const bag: Run["bag"] = [];
  const bots: Bot[] = [];
  let nextInstance = 0;

  const add = (partId: PartId) => {
    const instanceId = asInstanceId(`s${nextInstance}`);
    nextInstance += 1;
    bag.push({ instanceId, partId, plus: 0 });
    return instanceId;
  };

  PARTY_ROLES.forEach((role, index) => {
    bots.push({
      id: asBotId(`b${index}`),
      role,
      chassis: add(STARTER_CHASSIS),
      plate: add(STARTER_PLATE),
      tool: add(STARTER_TOOL[role]),
    });
  });

  return {
    seed,
    rolls: 0,
    hp: BALANCE.startHp,
    maxHp: BALANCE.startHp,
    cash: BALANCE.startCash,
    weightLimit: 32,
    runKind: null,
    bag,
    bots,
    nextInstance,
    map,
    current: null,
    visited: [],
    screen: { kind: "title" },
  };
}

export function applyCommand(run: Run, command: Command): Run {
  switch (command.kind) {
    case "start":
      return run.screen.kind === "title" ? { ...run, screen: { kind: "selectRun" } } : run;
    case "pickRun":
      return pickRun(run, command.runKindId);
    case "restart":
      return continueCampaign(run);
    case "pickNode":
      return pickNode(run, command.nodeId);
    case "openKit":
      return run.screen.kind === "map" ? { ...run, screen: { kind: "kit" } } : run;
    case "closeKit":
      return run.screen.kind === "kit" ? { ...run, screen: { kind: "map" } } : run;
    case "equip":
      return equip(run, command.botId, command.slot, command.instanceId);
    case "unequip":
      return unequip(run, command.botId, command.slot);
    case "commitFight":
      return commitFight(run);
    case "continueAfterCombat":
      return continueAfterCombat(run);
    case "takeReward":
      return takeReward(run, command.partId);
    case "skipReward":
      return run.screen.kind === "reward" ? { ...run, screen: { kind: "map" } } : run;
    case "restHeal":
      return restHeal(run);
    case "restUpgrade":
      return restUpgrade(run, command.instanceId);
    case "buy":
      return buy(run, command.partId);
    case "leaveShop":
      return run.screen.kind === "shop" ? { ...run, screen: { kind: "map" } } : run;
    case "takePrizePart":
      return takePrizePart(run, command.partId);
    case "takePrizeUpgrade":
      return takePrizeUpgrade(run, command.instanceId);
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

export function openNodes(run: Run): NodeId[] {
  const weight = partyWeight(run);
  return availableNodes(run).filter((id) =>
    meetsGate(weight, nodeById(run.map, id).gate),
  );
}

function pickRun(run: Run, runKindId: RunKindId): Run {
  if (run.screen.kind !== "selectRun") {
    return run;
  }
  const kind = runKindById(runKindId);
  if (run.cash < kind.entryCost) {
    return run;
  }
  return {
    ...run,
    seed: run.seed + 1,
    rolls: 0,
    hp: BALANCE.startHp,
    cash: run.cash - kind.entryCost,
    weightLimit: kind.weightLimit,
    runKind: kind.id,
    map: generateMap(createRng(run.seed + 1)),
    current: null,
    visited: [],
    screen: { kind: "map" },
  };
}

function continueCampaign(run: Run): Run {
  if (run.screen.kind !== "end") {
    return run;
  }
  return { ...run, screen: { kind: "selectRun" } };
}

function pickNode(run: Run, nodeId: NodeId): Run {
  if (run.screen.kind !== "map") {
    return run;
  }
  if (!openNodes(run).includes(nodeId)) {
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
    const stock = pickDistinct(rolled.rng, PARTS, 3);
    return { ...rolled.run, screen: { kind: "shop", stock } };
  }
  return { ...next, screen: { kind: "loadout", nodeId } };
}

function kitScreen(run: Run): boolean {
  return run.screen.kind === "kit" || run.screen.kind === "loadout";
}

function equip(
  run: Run,
  botId: Bot["id"],
  slot: Slot,
  instanceId: Run["bag"][number]["instanceId"],
): Run {
  if (!kitScreen(run)) {
    return run;
  }
  const instance = run.bag.find((item) => item.instanceId === instanceId);
  if (!instance) {
    return run;
  }
  if (slotOfPart(partById(instance.partId)) !== slot) {
    return run;
  }
  const bot = botById(run, botId);
  if (!canEquip(run, bot, instance)) {
    return run;
  }
  const detached = detachInstance(run, instance.instanceId);
  return {
    ...detached,
    bots: detached.bots.map((item) =>
      item.id === botId ? { ...item, [slot]: instance.instanceId } : item,
    ),
  };
}

function unequip(run: Run, botId: Bot["id"], slot: Slot): Run {
  if (!kitScreen(run)) {
    return run;
  }
  return {
    ...run,
    bots: run.bots.map((item) => {
      if (item.id !== botId) {
        return item;
      }
      if (slot === "chassis") {
        return { ...item, chassis: null, plate: null, tool: null };
      }
      return { ...item, [slot]: null };
    }),
  };
}

function commitFight(run: Run): Run {
  if (run.screen.kind !== "loadout") {
    return run;
  }
  if (run.bots.some((bot) => botKit(run, bot).carry > botKit(run, bot).capacity)) {
    return run;
  }
  if (partyWeight(run) > run.weightLimit) {
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
    suppress: stats.suppress,
    stun: stats.stun,
    guard: stats.guard,
    burst: stats.burst,
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
    return settleAct(run, "lose");
  }
  if (node.kind === "boss") {
    return settleAct(run, "win");
  }
  const cash = node.kind === "elite" ? BALANCE.eliteCash : BALANCE.fightCash;
  const rolled = withRng(run);
  const offers = pickDistinct(rolled.rng, PARTS, 3).map((part) => part.id);
  if (offers.length !== 3) {
    throw new Error("reward needs 3 parts");
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

function settleAct(run: Run, outcome: "win" | "lose"): Run {
  const kind = run.runKind ? runKindById(run.runKind) : null;
  const delta = outcome === "win" ? (kind?.winGold ?? 0) : -(kind?.loseGold ?? 0);
  const cash = Math.max(0, run.cash + delta);
  const next = { ...run, cash };
  if (outcome === "win" && kind) {
    return openPrize(next, kind.prize);
  }
  return { ...next, screen: { kind: "end", outcome, goldDelta: delta } };
}

function openPrize(run: Run, prize: "chassis" | "upgrade"): Run {
  if (prize === "upgrade") {
    return { ...run, screen: { kind: "runPrize", prize: "upgrade" } };
  }
  const rolled = withRng(run);
  const offers = pickDistinct(rolled.rng, chassisParts(), 2).map((part) => part.id);
  if (offers.length !== 2) {
    throw new Error("chassis prize needs 2 parts");
  }
  return {
    ...rolled.run,
    screen: { kind: "runPrize", prize: "chassis", offers: [offers[0]!, offers[1]!] },
  };
}

function takePrizePart(run: Run, partId: PartId): Run {
  if (run.screen.kind !== "runPrize" || run.screen.prize !== "chassis") {
    return run;
  }
  if (!run.screen.offers.includes(partId)) {
    return run;
  }
  return { ...addPart(run, partId), screen: { kind: "selectRun" } };
}

function takePrizeUpgrade(run: Run, instanceId: Run["bag"][number]["instanceId"]): Run {
  if (run.screen.kind !== "runPrize" || run.screen.prize !== "upgrade") {
    return run;
  }
  const bag = run.bag.map((item) =>
    item.instanceId === instanceId ? { ...item, plus: item.plus + 1 } : item,
  );
  if (!bag.some((item, index) => item !== run.bag[index])) {
    return run;
  }
  return { ...run, bag, screen: { kind: "selectRun" } };
}

function takeReward(run: Run, partId: PartId): Run {
  if (run.screen.kind !== "reward") {
    return run;
  }
  if (!run.screen.offers.includes(partId)) {
    return run;
  }
  return { ...addPart(run, partId), screen: { kind: "map" } };
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

function buy(run: Run, partId: PartId): Run {
  if (run.screen.kind !== "shop") {
    return run;
  }
  const part = run.screen.stock.find((item) => item.id === partId);
  if (!part || run.cash < part.cost) {
    return run;
  }
  const next = addPart(run, partId);
  return {
    ...next,
    cash: next.cash - part.cost,
    screen: {
      kind: "shop",
      stock: run.screen.stock.filter((item) => item.id !== partId),
    },
  };
}

function addPart(run: Run, partId: PartId): Run {
  partById(partId);
  return {
    ...run,
    nextInstance: run.nextInstance + 1,
    bag: [
      ...run.bag,
      {
        instanceId: asInstanceId(`i${run.nextInstance}`),
        partId,
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
