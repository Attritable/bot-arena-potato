import { describe, expect, it } from "vitest";
import { asCardId, asInstanceId } from "./domain";
import { teamStats } from "./loadout";
import { nodeById } from "./map";
import { applyCommand, availableNodes, startRun } from "./run";

describe("applyCommand", () => {
  it("starts a run with four equipped starters under the weight limit", () => {
    const run = applyCommand(startRun(11), { kind: "start" });
    expect(run.screen.kind).toBe("map");
    expect(run.bag).toHaveLength(4);
    expect(teamStats(run).weight).toBe(8);
    expect(teamStats(run).weight).toBeLessThanOrEqual(run.weightLimit);
    expect(availableNodes(run)).toEqual(run.map.entrance);
  });

  it("rejects an equip that would exceed the weight budget", () => {
    let run = applyCommand(startRun(3), { kind: "start" });
    const heavy = asInstanceId("heavy");
    run = {
      ...run,
      weightLimit: 8,
      screen: { kind: "loadout", nodeId: run.map.entrance[0]! },
      bag: [
        ...run.bag,
        { instanceId: heavy, cardId: asCardId("jammer"), plus: 0 },
      ],
    };
    const blocked = applyCommand(run, { kind: "equip", instanceId: heavy });
    expect(blocked.equipped.controller).toBe(run.equipped.controller);
    expect(teamStats(blocked).weight).toBe(teamStats(run).weight);
  });

  it("heals at rest and returns to the map", () => {
    let run = applyCommand(startRun(4), { kind: "start" });
    run = { ...run, hp: 6, screen: { kind: "rest" } };
    run = applyCommand(run, { kind: "restHeal" });
    expect(run.hp).toBe(16);
    expect(run.screen.kind).toBe("map");
  });

  it("buys a shop card when cash covers the cost", () => {
    let run = applyCommand(startRun(5), { kind: "start" });
    const card = {
      id: asCardId("rail-spike"),
      name: "Rail Spike",
      role: "striker" as const,
      weight: 4,
      cost: 6,
      atk: 5,
      armor: 0,
      heal: 0,
      control: 0,
    };
    run = { ...run, cash: 6, screen: { kind: "shop", stock: [card] } };
    run = applyCommand(run, { kind: "buy", cardId: card.id });
    expect(run.cash).toBe(0);
    expect(run.bag.some((item) => item.cardId === card.id)).toBe(true);
    expect(run.screen.kind).toBe("shop");
    if (run.screen.kind === "shop") {
      expect(run.screen.stock).toHaveLength(0);
    }
  });

  it("walks a full act to a boss win or loss", () => {
    let run = applyCommand(startRun(9), { kind: "start" });
    for (let step = 0; step < 40 && run.screen.kind !== "end"; step += 1) {
      if (run.screen.kind === "map") {
        const nodeId = availableNodes(run)[0]!;
        run = applyCommand(run, { kind: "pickNode", nodeId });
        continue;
      }
      if (run.screen.kind === "loadout") {
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
          cardId: run.screen.offers[0],
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
    expect(run.screen.kind).toBe("end");
    if (run.screen.kind === "end") {
      expect(["win", "lose"]).toContain(run.screen.outcome);
    }
  });

  it("resolves the opening fight and can reach a reward or an end", () => {
    let run = applyCommand(startRun(2), { kind: "start" });
    const nodeId = availableNodes(run)[0]!;
    expect(nodeById(run.map, nodeId).kind).toBe("fight");
    run = applyCommand(run, { kind: "pickNode", nodeId });
    expect(run.screen.kind).toBe("loadout");
    run = applyCommand(run, { kind: "commitFight" });
    expect(run.screen.kind).toBe("combat");
    if (run.screen.kind !== "combat") {
      throw new Error("expected combat");
    }
    run = applyCommand(run, { kind: "continueAfterCombat" });
    expect(["reward", "end"]).toContain(run.screen.kind);
  });
});

