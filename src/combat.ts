import { BALANCE } from "./balance";
import type { CombatReport, CombatRound, Enemy } from "./domain";

export type CombatInput = {
  hp: number;
  maxHp: number;
  atk: number;
  armor: number;
  heal: number;
  control: number;
  enemy: Enemy;
};

export function resolveCombat(input: CombatInput): CombatReport {
  const enemyAtk = Math.max(1, input.enemy.atk - input.control);
  const takenPerRound = Math.max(0, enemyAtk - input.armor);
  let hp = input.hp;
  let enemyHp = input.enemy.hp;
  const rounds: CombatRound[] = [];

  for (let n = 1; n <= BALANCE.maxRounds; n += 1) {
    const dealt = input.atk;
    const taken = takenPerRound;
    enemyHp = Math.max(0, enemyHp - dealt);
    hp = Math.max(0, hp - taken);
    let healed = 0;
    if (hp > 0 && enemyHp > 0 && input.heal > 0) {
      const next = Math.min(input.maxHp, hp + input.heal);
      healed = next - hp;
      hp = next;
    }
    rounds.push({ n, playerHp: hp, enemyHp, dealt, taken, healed });
    if (hp <= 0 || enemyHp <= 0) {
      break;
    }
  }

  const playerHpEnd = hp;
  const enemyHpEnd = enemyHp;
  return {
    won: playerHpEnd > 0 && enemyHpEnd <= 0,
    enemyName: input.enemy.name,
    rounds,
    playerHpEnd,
    enemyHpEnd,
  };
}
