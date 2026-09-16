import { BALANCE } from "./balance";
import { cardById } from "./content";
import {
  asCardId,
  asInstanceId,
  asNodeId,
  NODE_KINDS,
  ROLES,
  type Command,
  type NodeKind,
  type PartCard,
  type Role,
  type Run,
} from "./domain";
import { effectiveCard, instanceCard, teamStats } from "./loadout";
import { nodeById } from "./map";
import { availableNodes } from "./run";

const KIND_ICON: Record<NodeKind, string> = {
  fight: "F",
  elite: "E",
  rest: "R",
  shop: "$",
  boss: "B",
};

const KIND_TIP: Record<NodeKind, string> = {
  fight: "Safer loot",
  elite: "Harder fight, better part",
  rest: "Heal or upgrade one card",
  shop: "Spend cash on a part",
  boss: "Ends the run",
};

const ROLE_LABEL: Record<Role, string> = {
  defender: "Defender",
  striker: "Striker",
  leader: "Leader",
  controller: "Controller",
};

export function mount(root: HTMLElement, send: (command: Command) => void): (run: Run) => void {
  root.addEventListener("click", (event) => {
    const raw = event.target;
    if (!(raw instanceof Element)) {
      return;
    }
    const target = raw.closest("[data-act]");
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const command = commandFrom(target);
    if (command) {
      send(command);
    }
  });

  return (run) => {
    root.innerHTML = view(run);
  };
}

function commandFrom(el: HTMLElement): Command | null {
  const act = el.dataset.act;
  const id = el.dataset.id;
  if (act === "start") {
    return { kind: "start" };
  }
  if (act === "restart") {
    return { kind: "restart" };
  }
  if (act === "commitFight") {
    return { kind: "commitFight" };
  }
  if (act === "continueAfterCombat") {
    return { kind: "continueAfterCombat" };
  }
  if (act === "skipReward") {
    return { kind: "skipReward" };
  }
  if (act === "restHeal") {
    return { kind: "restHeal" };
  }
  if (act === "leaveShop") {
    return { kind: "leaveShop" };
  }
  if (act === "pickNode" && id) {
    return { kind: "pickNode", nodeId: asNodeId(id) };
  }
  if (act === "equip" && id) {
    return { kind: "equip", instanceId: asInstanceId(id) };
  }
  if (act === "unequip" && id && isRole(id)) {
    return { kind: "unequip", role: id };
  }
  if (act === "takeReward" && id) {
    return { kind: "takeReward", cardId: asCardId(id) };
  }
  if (act === "restUpgrade" && id) {
    return { kind: "restUpgrade", instanceId: asInstanceId(id) };
  }
  if (act === "buy" && id) {
    return { kind: "buy", cardId: asCardId(id) };
  }
  return null;
}

function view(run: Run): string {
  if (run.screen.kind === "title") {
    return `
      <section class="screen">
        <h1>BOT ARENA POTATO</h1>
        <p>Four roles. Parts are cards. One short act. Pick a path, kit a loadout under a weight budget, then one-tap the fight.</p>
        <p class="tip">Defender absorbs. Striker hits. Leader repairs. Controller cuts enemy attack.</p>
        <div class="row"><button class="primary" data-act="start">Start run</button></div>
      </section>`;
  }

  const body =
    run.screen.kind === "map"
      ? mapView(run)
      : run.screen.kind === "loadout"
        ? loadoutView(run)
        : run.screen.kind === "combat"
          ? combatView(run)
          : run.screen.kind === "reward"
            ? rewardView(run)
            : run.screen.kind === "rest"
              ? restView(run)
              : run.screen.kind === "shop"
                ? shopView(run)
                : endView(run);

  return `${hud(run)}${body}`;
}

function hud(run: Run): string {
  const stats = teamStats(run);
  const over = stats.weight > run.weightLimit ? " over" : "";
  return `
    <header class="hdr">
      <div>
        <h1>BOT ARENA POTATO</h1>
        <div class="muted">HP ${run.hp}/${run.maxHp} · cash ${run.cash}</div>
      </div>
      <div class="stats">
        <span>ATK ${stats.atk}</span>
        <span>ARM ${stats.armor}</span>
        <span>HEAL ${stats.heal}</span>
        <span>CTL ${stats.control}</span>
        <span class="bar${over}">WT ${stats.weight}/${run.weightLimit}</span>
      </div>
    </header>`;
}

function mapView(run: Run): string {
  const next = new Set(availableNodes(run));
  const visited = new Set(run.visited);
  const byFloor = new Map<number, typeof run.map.nodes>();
  for (const node of run.map.nodes) {
    const list = byFloor.get(node.floor) ?? [];
    list.push(node);
    byFloor.set(node.floor, list);
  }
  const floors = [...byFloor.keys()].sort((a, b) => a - b);
  const cols = floors
    .map((floor) => {
      const nodes = (byFloor.get(floor) ?? [])
        .sort((a, b) => a.slot - b.slot)
        .map((node) => {
          const enabled = next.has(node.id);
          const here = run.current === node.id;
          const done = visited.has(node.id);
          const cls = ["node", node.kind, here ? "here" : "", done ? "done" : ""]
            .filter(Boolean)
            .join(" ");
          return `<button class="${cls}" data-act="pickNode" data-id="${node.id}" ${enabled ? "" : "disabled"}>
            <span class="icon">${KIND_ICON[node.kind]}</span>
            <span>${labelKind(node.kind)}</span>
          </button>`;
        })
        .join("");
      return `<div class="floor"><div class="floor-label">${floor}</div>${nodes}</div>`;
    })
    .join("");

  return `
    <section class="screen">
      <h2>Path</h2>
      <p class="tip">Siblings on a floor are different types. Elite is optional risk. Rest before the boss is heal or upgrade.</p>
      <div class="map">${cols}</div>
      <div class="tip">${NODE_KINDS.map(
        (kind) => `${KIND_ICON[kind]} ${labelKind(kind)}. ${KIND_TIP[kind]}`,
      ).join(" · ")}</div>
    </section>`;
}

function loadoutView(run: Run): string {
  if (run.screen.kind !== "loadout") {
    return "";
  }
  const node = nodeById(run.map, run.screen.nodeId);
  const slots = ROLES.map((role) => {
    const found = instanceCard(run.bag, run.equipped[role]);
    const body = found
      ? cardBlock(effectiveCard(found.card, found.instance.plus), found.instance.plus, {
          act: "unequip",
          id: role,
          label: "Unequip",
        })
      : `<div class="card ${role}"><div class="role">${ROLE_LABEL[role]}</div><p class="muted">Empty</p></div>`;
    return body;
  }).join("");

  const bag = run.bag
    .map((item) => {
      const card = effectiveCard(cardById(item.cardId), item.plus);
      const equipped = Object.values(run.equipped).includes(item.instanceId);
      return cardBlock(card, item.plus, {
        act: "equip",
        id: item.instanceId,
        label: equipped ? "Equipped" : "Equip",
        disabled: equipped,
      });
    })
    .join("");

  return `
    <section class="screen">
      <h2>Loadout · ${labelKind(node.kind)}</h2>
      <p class="tip">One part per role. Weight is the budget. Empty slots contribute nothing.</p>
      <div class="grid">${slots}</div>
      <h2>Bag</h2>
      <div class="grid">${bag}</div>
      <div class="row"><button class="primary" data-act="commitFight">Resolve fight</button></div>
    </section>`;
}

function combatView(run: Run): string {
  if (run.screen.kind !== "combat") {
    return "";
  }
  const report = run.screen.report;
  const rows = report.rounds
    .map(
      (round) =>
        `<div>R${round.n} deal ${round.dealt} take ${round.taken}${round.healed ? ` heal ${round.healed}` : ""} · you ${round.playerHp} / them ${round.enemyHp}</div>`,
    )
    .join("");
  const result = report.won
    ? `<p class="win">Win. ${report.enemyName} down. HP ${report.playerHpEnd}.</p>`
    : `<p class="lose">Loss. ${report.enemyName} stands at ${report.enemyHpEnd}. HP ${report.playerHpEnd}.</p>`;
  return `
    <section class="screen">
      <h2>Resolve · ${report.enemyName}</h2>
      ${result}
      <div class="log">${rows}</div>
      <div class="row"><button class="primary" data-act="continueAfterCombat">Continue</button></div>
    </section>`;
}

function rewardView(run: Run): string {
  if (run.screen.kind !== "reward") {
    return "";
  }
  const cards = run.screen.offers
    .map((id) => {
      const card = cardById(id);
      return cardBlock(card, 0, { act: "takeReward", id: card.id, label: "Take" });
    })
    .join("");
  return `
    <section class="screen">
      <h2>Reward · +${run.screen.cash} cash</h2>
      <p class="tip">Take one part-card.</p>
      <div class="grid">${cards}</div>
      <div class="row"><button data-act="skipReward">Skip card</button></div>
    </section>`;
}

function restView(run: Run): string {
  const cards = run.bag
    .map((item) => {
      const card = effectiveCard(cardById(item.cardId), item.plus);
      return cardBlock(card, item.plus, {
        act: "restUpgrade",
        id: item.instanceId,
        label: "Upgrade +1",
      });
    })
    .join("");
  return `
    <section class="screen">
      <h2>Rest</h2>
      <p class="tip">Heal ${BALANCE.restHeal} HP or add +1 to one card's role stat.</p>
      <div class="row"><button class="primary" data-act="restHeal">Heal</button></div>
      <div class="grid">${cards}</div>
    </section>`;
}

function shopView(run: Run): string {
  if (run.screen.kind !== "shop") {
    return "";
  }
  const stock = run.screen.stock
    .map((card) =>
      cardBlock(card, 0, {
        act: "buy",
        id: card.id,
        label: `Buy ${card.cost}`,
        disabled: run.cash < card.cost,
      }),
    )
    .join("");
  return `
    <section class="screen">
      <h2>Shop</h2>
      <p class="tip">Cash ${run.cash}. Bought parts go to the bag.</p>
      <div class="grid">${stock || `<p class="muted">Sold out.</p>`}</div>
      <div class="row"><button class="primary" data-act="leaveShop">Leave</button></div>
    </section>`;
}

function endView(run: Run): string {
  if (run.screen.kind !== "end") {
    return "";
  }
  const text =
    run.screen.outcome === "win"
      ? `<p class="win">Core Warden down. The act is over.</p>`
      : `<p class="lose">The line failed. The act is over.</p>`;
  return `
    <section class="screen">
      <h2>${run.screen.outcome === "win" ? "Win" : "Loss"}</h2>
      ${text}
      <div class="row"><button class="primary" data-act="restart">New run</button></div>
    </section>`;
}

function cardBlock(
  card: PartCard,
  plus: number,
  action: { act: string; id: string; label: string; disabled?: boolean },
): string {
  const plusMark = plus > 0 ? ` +${plus}` : "";
  return `
    <article class="card ${card.role}">
      <header>
        <strong>${card.name}${plusMark}</strong>
        <span class="role">${ROLE_LABEL[card.role]}</span>
      </header>
      <div class="nums">${statBits(card)}</div>
      <div class="row">
        <button data-act="${action.act}" data-id="${action.id}" ${action.disabled ? "disabled" : ""}>${action.label}</button>
      </div>
    </article>`;
}

function statBits(card: PartCard): string {
  const bits = [`wt ${card.weight}`];
  if (card.atk) {
    bits.push(`atk ${card.atk}`);
  }
  if (card.armor) {
    bits.push(`arm ${card.armor}`);
  }
  if (card.heal) {
    bits.push(`heal ${card.heal}`);
  }
  if (card.control) {
    bits.push(`ctl ${card.control}`);
  }
  if (card.cost) {
    bits.push(`$ ${card.cost}`);
  }
  return bits.map((bit) => `<span>${bit}</span>`).join("");
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function labelKind(kind: NodeKind): string {
  switch (kind) {
    case "fight":
      return "Fight";
    case "elite":
      return "Elite";
    case "rest":
      return "Rest";
    case "shop":
      return "Shop";
    case "boss":
      return "Boss";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
