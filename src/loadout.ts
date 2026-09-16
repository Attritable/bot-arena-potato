import { cardById } from "./content";
import {
  ROLES,
  type CardInstance,
  type PartCard,
  type Role,
  type Run,
} from "./domain";

export type TeamStats = {
  atk: number;
  armor: number;
  heal: number;
  control: number;
  weight: number;
};

export function instanceCard(bag: CardInstance[], instanceId: Run["equipped"][Role]): { instance: CardInstance; card: PartCard } | null {
  if (!instanceId) {
    return null;
  }
  const instance = bag.find((item) => item.instanceId === instanceId);
  if (!instance) {
    return null;
  }
  return { instance, card: cardById(instance.cardId) };
}

export function effectiveCard(card: PartCard, plus: number): PartCard {
  if (plus === 0) {
    return card;
  }
  if (card.role === "defender") {
    return { ...card, armor: card.armor + plus };
  }
  if (card.role === "striker") {
    return { ...card, atk: card.atk + plus };
  }
  if (card.role === "leader") {
    return { ...card, heal: card.heal + plus };
  }
  return { ...card, control: card.control + plus };
}

export function teamStats(run: Run): TeamStats {
  const stats: TeamStats = { atk: 0, armor: 0, heal: 0, control: 0, weight: 0 };
  for (const role of ROLES) {
    const found = instanceCard(run.bag, run.equipped[role]);
    if (!found) {
      continue;
    }
    const card = effectiveCard(found.card, found.instance.plus);
    stats.atk += card.atk;
    stats.armor += card.armor;
    stats.heal += card.heal;
    stats.control += card.control;
    stats.weight += card.weight;
  }
  return stats;
}

export function weightIfEquip(run: Run, instance: CardInstance): number {
  const card = cardById(instance.cardId);
  const current = instanceCard(run.bag, run.equipped[card.role]);
  const currentWeight = current ? current.card.weight : 0;
  return teamStats(run).weight - currentWeight + card.weight;
}
