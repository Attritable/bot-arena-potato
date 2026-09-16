import { describe, expect, it } from "vitest";
import { asInstanceId, asNodeId, asPartId } from "./domain";
import { botKit, canEquip, partyWeight, spareBag, teamStats } from "./loadout";
import { reachableFrom } from "./map";
import { applyCommand, availableNodes, openNodes, startRun } from "./run";

describe("applyCommand", () => {
  it("starts a run with five layered bots under chassis capacity", () => {
    const run = applyCommand(startRun(11), { kind: "start" });
    expect(run.screen.kind).toBe("map");
    expect(run.bots).toHaveLength(5);
    expect(run.bots.map((bot) => bot.role)).toEqual([
      "defender",
      "striker",
      "leader",
      "controller",
      "striker",
    ]);
    expect(run.bag).toHaveLength(15);
    expect(spareBag(run)).toEqual([]);
    expect(partyWeight(run)).toBe(25);
    for (const bot of run.bots) {
      const kit = botKit(run, bot);
      expect(kit.chassis?.id).toBe("frame-light");
      expect(kit.plate?.id).toBe("mesh-skin");
      expect(kit.tool?.role).toBe(bot.role);
      expect(kit.carry).toBeLessThanOrEqual(kit.capacity);
    }
    expect(availableNodes(run)).toEqual(run.map.entrance);
    expect(openNodes(run)).toEqual(run.map.entrance);
  });

  it("rejects a plate that would exceed the bot's chassis capacity", () => {
    let run = applyCommand(startRun(3), { kind: "start" });
    const heavy = asInstanceId("heavy");
    run = {
      ...run,
      screen: { kind: "kit" },
      bag: [...run.bag, { instanceId: heavy, partId: asPartId("plate-slab"), plus: 0 }],
    };
    const defender = run.bots[0]!;
    expect(canEquip(run, defender, { instanceId: heavy, partId: asPartId("plate-slab"), plus: 0 })).toBe(
      false,
    );
    const blocked = applyCommand(run, {
      kind: "equip",
      botId: defender.id,
      slot: "plate",
      instanceId: heavy,
    });
    expect(blocked.bots[0]?.plate).toBe(defender.plate);
    expect(partyWeight(blocked)).toBe(partyWeight(run));
  });

  it("rejects a tool on the wrong role", () => {
    let run = applyCommand(startRun(3), { kind: "start" });
    const lens = run.bag.find((item) => item.partId === asPartId("focus-lens"));
    expect(lens).toBeTruthy();
    run = { ...run, screen: { kind: "kit" } };
    const defender = run.bots[0]!;
    const blocked = applyCommand(run, {
      kind: "equip",
      botId: defender.id,
      slot: "tool",
      instanceId: lens!.instanceId,
    });
    expect(blocked.bots[0]?.tool).toBe(defender.tool);
  });

  it("blocks a node when party weight misses the gate", () => {
    let run = applyCommand(startRun(4), { kind: "start" });
    run = {
      ...run,
      bots: run.bots.map((bot) => ({ ...bot, chassis: null, plate: null, tool: null })),
    };
    expect(partyWeight(run)).toBe(0);
    const heavy = run.map.entrance[2]!;
    const blocked = applyCommand(run, { kind: "pickNode", nodeId: heavy });
    expect(blocked.screen.kind).toBe("map");
    expect(blocked.current).toBeNull();
  });

  it("heals at rest and returns to the map", () => {
    let run = applyCommand(startRun(4), { kind: "start" });
    run = { ...run, hp: 6, screen: { kind: "rest" } };
    run = applyCommand(run, { kind: "restHeal" });
    expect(run.hp).toBe(14);
    expect(run.screen.kind).toBe("map");
  });

  it("buys a shop part when cash covers the cost", () => {
    let run = applyCommand(startRun(5), { kind: "start" });
    const part = {
      id: asPartId("burst-rail"),
      kind: "tool" as const,
      name: "Burst Rail",
      role: "striker" as const,
      weight: 3,
      cost: 6,
      effect: { family: "strike" as const, atk: 3, burst: 3 },
    };
    run = { ...run, cash: 6, screen: { kind: "shop", stock: [part] } };
    run = applyCommand(run, { kind: "buy", partId: part.id });
    expect(run.cash).toBe(0);
    expect(run.bag.some((item) => item.partId === part.id)).toBe(true);
    expect(run.screen.kind).toBe("shop");
    if (run.screen.kind === "shop") {
      expect(run.screen.stock).toHaveLength(0);
    }
  });

  it("walks a full act on a lockout path with the starter 5-bot kit", () => {
    let run = applyCommand(startRun(9), { kind: "start" });
    expect(run.bots).toHaveLength(5);
    for (const bot of run.bots) {
      const kit = botKit(run, bot);
      expect(kit.carry).toBeLessThanOrEqual(kit.capacity);
    }
    const left = run.map.entrance[0]!;
    const locked = asNodeId("f3s3");
    expect(reachableFrom(run.map, [left]).has(locked)).toBe(false);

    const seen = new Set<string>();
    for (let step = 0; step < 50 && run.screen.kind !== "end"; step += 1) {
      if (run.screen.kind === "map") {
        for (const id of availableNodes(run)) {
          seen.add(id);
        }
        const nodeId = openNodes(run)[0];
        if (!nodeId) {
          throw new Error("no open node");
        }
        run = applyCommand(run, { kind: "pickNode", nodeId });
        continue;
      }
      if (run.screen.kind === "kit") {
        run = applyCommand(run, { kind: "closeKit" });
        continue;
      }
      if (run.screen.kind === "loadout") {
        expect(run.bots).toHaveLength(5);
        expect(teamStats(run).weight).toBe(25);
        run = applyCommand(run, { kind: "commitFight" });
        continue;
      }
      if (run.screen.kind === "combat") {
        run = applyCommand(run, { kind: "continueAfterCombat" });
        continue;
      }
      if (run.screen.kind === "reward") {
        run = applyCommand(run, {
          kind: "takeReward",
          partId: run.screen.offers[0],
        });
        continue;
      }
      if (run.screen.kind === "rest") {
        run = applyCommand(run, { kind: "restHeal" });
        continue;
      }
      if (run.screen.kind === "shop") {
        run = applyCommand(run, { kind: "leaveShop" });
      }
    }
    expect(seen.has(locked)).toBe(false);
    expect(run.screen.kind).toBe("end");
    if (run.screen.kind === "end") {
      expect(["win", "lose"]).toContain(run.screen.outcome);
    }
  });

  it("resolves the opening fight and can reach a reward or an end", () => {
    let run = applyCommand(startRun(2), { kind: "start" });
    const nodeId = openNodes(run)[0]!;
    run = applyCommand(run, { kind: "pickNode", nodeId });
    expect(run.screen.kind).toBe("loadout");
    run = applyCommand(run, { kind: "commitFight" });
    expect(run.screen.kind).toBe("combat");
    if (run.screen.kind !== "combat") {
      throw new Error("expected combat");
    }
    expect(run.screen.report.rounds[0]?.taken).toBeGreaterThanOrEqual(0);
    run = applyCommand(run, { kind: "continueAfterCombat" });
    expect(["reward", "end"]).toContain(run.screen.kind);
  });
});
