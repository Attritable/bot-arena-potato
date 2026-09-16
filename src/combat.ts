import { BALANCE } from "./balance";
import type { CombatReport, CombatRound, Enemy } from "./domain";

export type CombatInput = {
  hp: number;
  maxHp: number;
  atk: number;
  armor: number;
  heal: number;
  suppress: number;
  stun: boolean;
  guard: number;
  burst: number;
  enemy: Enemy;
};

export function resolveCombat(input: CombatInput): CombatReport {
  const enemyAtk = Math.max(1, input.enemy.atk - input.suppress);
  let hp = input.hp;
  let enemyHp = input.enemy.hp;
  let guardLeft = input.guard;
  const rounds: CombatRound[] = [];

  for (let n = 1; n <= BALANCE.maxRounds; n += 1) {
    const dealt = input.atk + (n === 1 ? input.burst : 0);
    const taken = incomingTaken({
      n,
      enemyAtk,
      armor: input.armor,
      stun: input.stun,
      guardLeft,
    });
    guardLeft = taken.nextGuard;
    enemyHp = Math.max(0, enemyHp - dealt);
    hp = Math.max(0, hp - taken.amount);
    let healed = 0;
    if (hp > 0 && enemyHp > 0 && input.heal > 0) {
      const next = Math.min(input.maxHp, hp + input.heal);
      healed = next - hp;
      hp = next;
    }
    rounds.push({ n, playerHp: hp, enemyHp, dealt, taken: taken.amount, healed });
    if (hp <= 0 || enemyHp <= 0) {
      break;
    }
  }

  return {
    won: hp > 0 && enemyHp <= 0,
    enemyName: input.enemy.name,
    rounds,
    playerHpEnd: hp,
    enemyHpEnd: enemyHp,
  };
}

function incomingTaken(input: {
  n: number;
  enemyAtk: number;
  armor: number;
  stun: boolean;
  guardLeft: number;
}): { amount: number; nextGuard: number } {
  if (input.stun && input.n === 1) {
    return { amount: 0, nextGuard: input.guardLeft };
  }
  let taken = Math.max(BALANCE.minChip, input.enemyAtk - input.armor);
  let guardLeft = input.guardLeft;
  if (guardLeft > 0) {
    const absorb = Math.min(guardLeft, taken);
    taken -= absorb;
    guardLeft -= absorb;
  }
  return { amount: taken, nextGuard: guardLeft };
}
