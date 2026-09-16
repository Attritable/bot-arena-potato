import { describe, expect, it } from "vitest";
import { resolveCombat } from "./combat";

describe("resolveCombat", () => {
  it("lets armor cancel equal attack", () => {
    const report = resolveCombat({
      hp: 10,
      maxHp: 10,
      atk: 5,
      armor: 4,
      heal: 0,
      control: 0,
      enemy: { name: "Dummy", hp: 5, atk: 4 },
    });
    expect(report.won).toBe(true);
    expect(report.playerHpEnd).toBe(10);
    expect(report.rounds[0]?.taken).toBe(0);
  });

  it("lets control cut enemy attack before armor", () => {
    const report = resolveCombat({
      hp: 8,
      maxHp: 8,
      atk: 3,
      armor: 0,
      heal: 0,
      control: 2,
      enemy: { name: "Dummy", hp: 3, atk: 4 },
    });
    expect(report.rounds[0]?.taken).toBe(2);
    expect(report.won).toBe(true);
    expect(report.playerHpEnd).toBe(6);
  });

  it("heals after a round if both sides still stand", () => {
    const report = resolveCombat({
      hp: 6,
      maxHp: 10,
      atk: 2,
      armor: 0,
      heal: 3,
      control: 0,
      enemy: { name: "Dummy", hp: 6, atk: 1 },
    });
    expect(report.rounds[0]?.healed).toBe(3);
    expect(report.rounds[0]?.playerHp).toBe(8);
    expect(report.won).toBe(true);
  });

  it("loses when attack cannot break the enemy before HP hits 0", () => {
    const report = resolveCombat({
      hp: 4,
      maxHp: 4,
      atk: 0,
      armor: 0,
      heal: 0,
      control: 0,
      enemy: { name: "Dummy", hp: 8, atk: 2 },
    });
    expect(report.won).toBe(false);
    expect(report.playerHpEnd).toBe(0);
  });
});
