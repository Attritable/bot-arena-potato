import { partById } from "./content";
import {
  type Bot,
  type ChassisPart,
  type Part,
  type PartInstance,
  type PlatePart,
  type Role,
  type Run,
  type Slot,
  type ToolEffect,
  type ToolPart,
  type WeightGate,
} from "./domain";

export type TeamStats = {
  atk: number;
  armor: number;
  heal: number;
  suppress: number;
  stun: boolean;
  guard: number;
  burst: number;
  weight: number;
};

export type BotKit = {
  chassis: ChassisPart | null;
  plate: PlatePart | null;
  tool: ToolPart | null;
  carry: number;
  capacity: number;
  weight: number;
};

export function instanceOf(
  bag: PartInstance[],
  instanceId: PartInstance["instanceId"] | null,
): { instance: PartInstance; part: Part } | null {
  if (!instanceId) {
    return null;
  }
  const instance = bag.find((item) => item.instanceId === instanceId);
  if (!instance) {
    return null;
  }
  return { instance, part: partById(instance.partId) };
}

export function effectivePart(part: Part, plus: number): Part {
  if (plus === 0) {
    return part;
  }
  if (part.kind === "chassis") {
    return { ...part, capacity: part.capacity + plus };
  }
  if (part.kind === "plate") {
    return { ...part, armor: part.armor + plus };
  }
  return { ...part, effect: bumpEffect(part.effect, plus) };
}

function bumpEffect(effect: ToolEffect, plus: number): ToolEffect {
  if (effect.family === "suppress") {
    return { ...effect, amount: effect.amount + plus };
  }
  if (effect.family === "brace") {
    return { ...effect, armor: effect.armor + plus };
  }
  if (effect.family === "strike") {
    return { ...effect, atk: effect.atk + plus };
  }
  return { ...effect, heal: effect.heal + plus };
}

export function botById(run: Run, botId: Bot["id"]): Bot {
  const bot = run.bots.find((item) => item.id === botId);
  if (!bot) {
    throw new Error(`unknown bot ${botId}`);
  }
  return bot;
}

export function botKit(run: Run, bot: Bot): BotKit {
  const chassisFound = instanceOf(run.bag, bot.chassis);
  const plateFound = instanceOf(run.bag, bot.plate);
  const toolFound = instanceOf(run.bag, bot.tool);
  const chassisPart = chassisFound
    ? effectivePart(chassisFound.part, chassisFound.instance.plus)
    : null;
  const platePart = plateFound
    ? effectivePart(plateFound.part, plateFound.instance.plus)
    : null;
  const toolPart = toolFound
    ? effectivePart(toolFound.part, toolFound.instance.plus)
    : null;
  const chassis = chassisPart && chassisPart.kind === "chassis" ? chassisPart : null;
  const plate = platePart && platePart.kind === "plate" ? platePart : null;
  const tool = toolPart && toolPart.kind === "tool" ? toolPart : null;
  const carry = (plate?.weight ?? 0) + (tool?.weight ?? 0);
  const capacity = chassis?.capacity ?? 0;
  const weight = (chassis?.weight ?? 0) + carry;
  return { chassis, plate, tool, carry, capacity, weight };
}

export function teamStats(run: Run): TeamStats {
  const stats: TeamStats = {
    atk: 0,
    armor: 0,
    heal: 0,
    suppress: 0,
    stun: false,
    guard: 0,
    burst: 0,
    weight: 0,
  };
  for (const bot of run.bots) {
    const kit = botKit(run, bot);
    stats.weight += kit.weight;
    if (kit.plate) {
      stats.armor += kit.plate.armor;
    }
    if (!kit.tool) {
      continue;
    }
    const effect = kit.tool.effect;
    if (effect.family === "suppress") {
      stats.suppress += effect.amount;
      stats.stun = stats.stun || effect.stun;
    } else if (effect.family === "brace") {
      stats.armor += effect.armor;
      stats.guard += effect.guard;
    } else if (effect.family === "strike") {
      stats.atk += effect.atk;
      stats.burst += effect.burst;
    } else {
      stats.heal += effect.heal;
      stats.atk += effect.rally;
    }
  }
  return stats;
}

export function partyWeight(run: Run): number {
  return teamStats(run).weight;
}

export function meetsGate(weight: number, gate: WeightGate): boolean {
  if (gate.kind === "max") {
    return weight <= gate.weight;
  }
  if (gate.kind === "min") {
    return weight >= gate.weight;
  }
  return true;
}

export function equippedInstanceIds(run: Run): Set<PartInstance["instanceId"]> {
  const ids = new Set<PartInstance["instanceId"]>();
  for (const bot of run.bots) {
    if (bot.chassis) {
      ids.add(bot.chassis);
    }
    if (bot.plate) {
      ids.add(bot.plate);
    }
    if (bot.tool) {
      ids.add(bot.tool);
    }
  }
  return ids;
}

export function slotOfPart(part: Part): Slot {
  return part.kind;
}

export function toolFitsBot(part: Part, role: Role): boolean {
  return part.kind !== "tool" || part.role === role;
}

export function canEquip(run: Run, bot: Bot, instance: PartInstance): boolean {
  const part = effectivePart(partById(instance.partId), instance.plus);
  if (!toolFitsBot(part, bot.role)) {
    return false;
  }
  const worn = equippedInstanceIds(run);
  if (worn.has(instance.instanceId) && bot[slotOfPart(part)] !== instance.instanceId) {
    return false;
  }
  const kit = botKit(run, bot);
  if (part.kind === "chassis") {
    return kit.carry <= part.capacity;
  }
  if (!kit.chassis) {
    return false;
  }
  const other =
    part.kind === "plate" ? (kit.tool?.weight ?? 0) : (kit.plate?.weight ?? 0);
  return other + part.weight <= kit.capacity;
}

export function botLabel(bots: Bot[], bot: Bot): string {
  const same = bots.filter((item) => item.role === bot.role);
  if (same.length === 1) {
    return roleLabel(bot.role);
  }
  return `${roleLabel(bot.role)} ${same.indexOf(bot) + 1}`;
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "defender":
      return "Defender";
    case "striker":
      return "Striker";
    case "leader":
      return "Leader";
    case "controller":
      return "Controller";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
