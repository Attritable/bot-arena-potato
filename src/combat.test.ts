import { describe, expect, it } from "vitest";
import { resolveCombat } from "./combat";

describe("resolveCombat", () => {
  it("applies min chip when armor would zero the hit", () => {
    const report = resolveCombat({
      hp: 10,
      maxHp: 10,
      atk: 5,
      armor: 8,
      heal: 0,
      suppress: 0,
      stun: false,
      guard: 0,
      burst: 0,
      enemy: { name: "Dummy", hp: 5, atk: 4 },
    });
    expect(report.won).toBe(true);
    expect(report.rounds[0]?.taken).toBe(2);
    expect(report.playerHpEnd).toBe(8);
  });

  it("lets suppress cut enemy attack before armor", () => {
    const report = resolveCombat({
      hp: 8,
      maxHp: 8,
      atk: 3,
      armor: 0,
      heal: 0,
      suppress: 2,
      stun: false,
      guard: 0,
      burst: 0,
      enemy: { name: "Dummy", hp: 3, atk: 5 },
    });
    expect(report.rounds[0]?.taken).toBe(3);
    expect(report.won).toBe(true);
    expect(report.playerHpEnd).toBe(5);
  });

  it("lets stun zero the first hit and then chips", () => {
    const report = resolveCombat({
      hp: 10,
      maxHp: 10,
      atk: 3,
      armor: 0,
      heal: 0,
      suppress: 0,
      stun: true,
      guard: 0,
      burst: 0,
      enemy: { name: "Dummy", hp: 6, atk: 4 },
    });
    expect(report.rounds[0]?.taken).toBe(0);
    expect(report.rounds[1]?.taken).toBe(4);
    expect(report.won).toBe(true);
    expect(report.playerHpEnd).toBe(6);
  });

  it("lets guard absorb chip then leaves later hits", () => {
    const report = resolveCombat({
      hp: 10,
      maxHp: 10,
      atk: 3,
      armor: 8,
      heal: 0,
      suppress: 0,
      stun: false,
      guard: 2,
      burst: 0,
      enemy: { name: "Dummy", hp: 6, atk: 4 },
    });
    expect(report.rounds[0]?.taken).toBe(0);
    expect(report.rounds[1]?.taken).toBe(2);
    expect(report.playerHpEnd).toBe(8);
  });

  it("adds burst only on the first round", () => {
    const report = resolveCombat({
      hp: 10,
      maxHp: 10,
      atk: 2,
      armor: 0,
      heal: 0,
      suppress: 0,
      stun: true,
      guard: 0,
      burst: 3,
      enemy: { name: "Dummy", hp: 7, atk: 1 },
    });
    expect(report.rounds[0]?.dealt).toBe(5);
    expect(report.rounds[1]?.dealt).toBe(2);
    expect(report.won).toBe(true);
  });

  it("heals after a round if both sides still stand", () => {
    const report = resolveCombat({
      hp: 6,
      maxHp: 10,
      atk: 2,
      armor: 0,
      heal: 3,
      suppress: 0,
      stun: false,
      guard: 0,
      burst: 0,
      enemy: { name: "Dummy", hp: 6, atk: 1 },
    });
    expect(report.rounds[0]?.healed).toBe(3);
    expect(report.rounds[0]?.playerHp).toBe(7);
    expect(report.won).toBe(true);
  });

  it("loses when attack cannot break the enemy before HP hits 0", () => {
    const report = resolveCombat({
      hp: 4,
      maxHp: 4,
      atk: 0,
      armor: 0,
      heal: 0,
      suppress: 0,
      stun: false,
      guard: 0,
      burst: 0,
      enemy: { name: "Dummy", hp: 8, atk: 2 },
    });
    expect(report.won).toBe(false);
    expect(report.playerHpEnd).toBe(0);
  });
});
