import { BALANCE } from "./balance";
import { partById, RUN_KINDS } from "./content";
import {
  asBotId,
  asInstanceId,
  asNodeId,
  asPartId,
  NODE_KINDS,
  SLOTS,
  type BotId,
  type Command,
  type NodeKind,
  type Part,
  type Run,
  type RunKindId,
  type Slot,
  type ToolEffect,
  type WeightGate,
} from "./domain";
import {
  botKit,
  botLabel,
  canEquip,
  effectivePart,
  effectExplain,
  instanceOf,
  partyWeight,
  roleLabel,
  slotOfPart,
  spareBag,
  teamStats,
  wornSlot,
} from "./loadout";
import { nodeById } from "./map";
import { availableNodes, openNodes } from "./run";

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
  rest: "Heal or upgrade one part",
  shop: "Spend gold on a part",
  boss: "Ends the run",
};

const RUN_KIND_IDS: readonly RunKindId[] = ["patrol", "raid", "haul", "glass"];

export function mount(root: HTMLElement, send: (command: Command) => void): (run: Run) => void {
  let last: Run | null = null;
  let selected: BotId | null = null;

  const paint = (run: Run) => {
    last = run;
    if (!selected || !run.bots.some((bot) => bot.id === selected)) {
      selected = run.bots[0]?.id ?? null;
    }
    root.innerHTML = view(run, selected);
    drawMapLinks(root, run);
  };

  root.addEventListener("click", (event) => {
    const raw = event.target;
    if (!(raw instanceof Element)) {
      return;
    }
    const target = raw.closest("[data-act]");
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.act === "selectBot" && target.dataset.id) {
      selected = asBotId(target.dataset.id);
      if (last) {
        paint(last);
      }
      return;
    }
    const command = commandFrom(target, last, selected);
    if (command) {
      send(command);
    }
  });

  root.addEventListener("dragstart", (event) => {
    const raw = event.target;
    if (!(raw instanceof Element)) {
      return;
    }
    const source = raw.closest("[data-drag]");
    if (!(source instanceof HTMLElement) || !source.dataset.drag || !event.dataTransfer) {
      return;
    }
    event.dataTransfer.setData("text/plain", source.dataset.drag);
    event.dataTransfer.effectAllowed = "move";
  });

  root.addEventListener("dragover", (event) => {
    const dest = dropTarget(event.target);
    if (!dest) {
      return;
    }
    event.preventDefault();
    dest.classList.add("drop");
  });

  root.addEventListener("dragleave", (event) => {
    const dest = dropTarget(event.target);
    dest?.classList.remove("drop");
  });

  root.addEventListener("drop", (event) => {
    const dest = dropTarget(event.target);
    if (!dest || !last || !event.dataTransfer) {
      return;
    }
    event.preventDefault();
    dest.classList.remove("drop");
    const instanceId = event.dataTransfer.getData("text/plain");
    if (!instanceId) {
      return;
    }
    if (dest.dataset.dropBag === "1") {
      const worn = wornSlot(last, asInstanceId(instanceId));
      if (worn) {
        send({ kind: "unequip", botId: worn.botId, slot: worn.slot });
      }
      return;
    }
    if (dest.dataset.bot && isSlot(dest.dataset.slot)) {
      send({
        kind: "equip",
        botId: asBotId(dest.dataset.bot),
        slot: dest.dataset.slot,
        instanceId: asInstanceId(instanceId),
      });
    }
  });

  window.addEventListener("resize", () => {
    if (last) {
      drawMapLinks(root, last);
    }
  });

  return paint;
}

function dropTarget(raw: EventTarget | null): HTMLElement | null {
  if (!(raw instanceof Element)) {
    return null;
  }
  const dest = raw.closest("[data-drop-slot], [data-drop-bag]");
  return dest instanceof HTMLElement ? dest : null;
}

function commandFrom(
  el: HTMLElement,
  run: Run | null,
  selected: BotId | null,
): Command | null {
  const act = el.dataset.act;
  const id = el.dataset.id;
  if (act === "start") {
    return { kind: "start" };
  }
  if (act === "restart") {
    return { kind: "restart" };
  }
  if (act === "pickRun" && id && isRunKindId(id)) {
    return { kind: "pickRun", runKindId: id };
  }
  if (act === "openKit") {
    return { kind: "openKit" };
  }
  if (act === "closeKit") {
    return { kind: "closeKit" };
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
  if (act === "equip" && id && selected && run) {
    const instance = run.bag.find((item) => item.instanceId === id);
    if (!instance) {
      return null;
    }
    return {
      kind: "equip",
      botId: selected,
      slot: slotOfPart(partById(instance.partId)),
      instanceId: asInstanceId(id),
    };
  }
  if (act === "unequip" && id && isSlot(el.dataset.slot)) {
    return { kind: "unequip", botId: asBotId(id), slot: el.dataset.slot };
  }
  if (act === "takeReward" && id) {
    return { kind: "takeReward", partId: asPartId(id) };
  }
  if (act === "takePrizePart" && id) {
    return { kind: "takePrizePart", partId: asPartId(id) };
  }
  if (act === "takePrizeUpgrade" && id) {
    return { kind: "takePrizeUpgrade", instanceId: asInstanceId(id) };
  }
  if (act === "restUpgrade" && id) {
    return { kind: "restUpgrade", instanceId: asInstanceId(id) };
  }
  if (act === "buy" && id) {
    return { kind: "buy", partId: asPartId(id) };
  }
  return null;
}

function view(run: Run, selected: BotId | null): string {
  if (run.screen.kind === "title") {
    return `
      <section class="screen">
        <h1>BOT ARENA POTATO</h1>
        <p>Five bots. Each wears chassis, plate, and a role tool. Pick a run, then a path. Rooms you skip stay locked.</p>
        <p class="tip">Controller cuts enemy attack. Defender soaks hits. Striker deals damage. Leader heals. The extra bot is a second Striker.</p>
        <div class="row"><button class="primary" data-act="start">Choose a run</button></div>
      </section>`;
  }

  const body =
    run.screen.kind === "selectRun"
      ? selectRunView(run)
      : run.screen.kind === "map"
        ? mapView(run)
        : run.screen.kind === "kit" || run.screen.kind === "loadout"
          ? kitView(run, selected)
          : run.screen.kind === "combat"
            ? combatView(run)
            : run.screen.kind === "reward"
              ? rewardView(run)
              : run.screen.kind === "rest"
                ? restView(run)
                : run.screen.kind === "shop"
                  ? shopView(run)
                  : run.screen.kind === "runPrize"
                    ? prizeView(run)
                    : endView(run);

  return `${hud(run)}${body}`;
}

function hud(run: Run): string {
  const stats = teamStats(run);
  const over = stats.weight > run.weightLimit ? " over" : "";
  const extras = [
    stats.stun ? "<span>stun: first hit deals 0</span>" : "",
    stats.guard ? `<span>guard: soak first ${stats.guard} dmg</span>` : "",
    stats.burst ? `<span>burst: +${stats.burst} on round 1</span>` : "",
  ]
    .filter(Boolean)
    .join("");
  return `
    <header class="hdr">
      <div>
        <h1>BOT ARENA POTATO</h1>
        <div class="muted">HP ${run.hp}/${run.maxHp} · gold ${run.cash}</div>
      </div>
      <div class="stats">
        <span>ATK ${stats.atk}</span>
        <span>ARM ${stats.armor}</span>
        <span>HEAL ${stats.heal}</span>
        <span>SUP ${stats.suppress} (cuts enemy ATK)</span>
        <span class="bar${over}">WT ${stats.weight}/${run.weightLimit}</span>
        ${extras}
      </div>
    </header>`;
}

function selectRunView(run: Run): string {
  const cards = RUN_KINDS.map((kind) => {
    const locked = run.cash < kind.entryCost;
    const cost = kind.entryCost === 0 ? "Free" : `Pay ${kind.entryCost} gold`;
    return `
      <article class="card">
        <header>
          <strong>${kind.name}</strong>
          <span class="role">cap ${kind.weightLimit}</span>
        </header>
        <p class="tip">${kind.blurb}</p>
        <div class="nums">
          <span>${cost}</span>
          <span>win +${kind.winGold}</span>
          <span>loss ${kind.loseGold ? `-${kind.loseGold}` : "0"}</span>
          <span>prize ${kind.prize === "chassis" ? "chassis" : "upgrade"}</span>
        </div>
        <div class="row">
          <button class="primary" data-act="pickRun" data-id="${kind.id}" ${locked ? "disabled" : ""}>${
            locked ? "Need gold" : "Enter"
          }</button>
        </div>
      </article>`;
  }).join("");
  return `
    <section class="screen">
      <h2>Choose a run</h2>
      <p class="tip">Gold ${run.cash}. Patrol is free. Other acts cost gold to enter. A win pays gold and a chassis or an upgrade. A loss takes gold. Team weight must stay under that act's cap.</p>
      <div class="grid">${cards}</div>
    </section>`;
}

function mapView(run: Run): string {
  const next = new Set(availableNodes(run));
  const open = new Set(openNodes(run));
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
          const enabled = open.has(node.id);
          const linked = next.has(node.id);
          const here = run.current === node.id;
          const done = visited.has(node.id);
          const cls = [
            "node",
            node.kind,
            here ? "here" : "",
            done ? "done" : "",
            linked && !enabled ? "gated" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `<button class="${cls}" data-act="pickNode" data-id="${node.id}" ${enabled ? "" : "disabled"}>
            <span class="icon">${KIND_ICON[node.kind]}</span>
            <span>${labelKind(node.kind)}</span>
            <span class="gate">${gateLabel(node.gate)}</span>
          </button>`;
        })
        .join("");
      return `<div class="floor"><div class="floor-label">${floor}</div>${nodes}</div>`;
    })
    .join("");

  return `
    <section class="screen">
      <h2>Path</h2>
      <p class="tip">Lines are the rooms you can still reach from here. A pick locks rooms with no line. Left leans light. Right leans heavy. Kit before you pick.</p>
      <div class="map-wrap">
        <div class="map"><svg class="map-links" aria-hidden="true"></svg>${cols}</div>
      </div>
      <div class="tip">${NODE_KINDS.map(
        (kind) => `${KIND_ICON[kind]} ${labelKind(kind)}. ${KIND_TIP[kind]}`,
      ).join(" · ")}</div>
      <div class="row"><button class="primary" data-act="openKit">Kit party</button></div>
    </section>`;
}

function kitView(run: Run, selected: BotId | null): string {
  const node = run.screen.kind === "loadout" ? nodeById(run.map, run.screen.nodeId) : null;
  const fight = node !== null;
  const overCap = partyWeight(run) > run.weightLimit;
  const bots = run.bots
    .map((bot) => {
      const kit = botKit(run, bot);
      const over = kit.carry > kit.capacity;
      const active = bot.id === selected ? " active" : "";
      const slots = SLOTS.map((slot) => {
        const found = instanceOf(run.bag, bot[slot]);
        if (!found) {
          return `<div class="slot" data-drop-slot="1" data-bot="${bot.id}" data-slot="${slot}">
            <div class="role">${slot}</div>
            <p class="muted">Empty. Drop a ${slot} here.</p>
          </div>`;
        }
        const part = effectivePart(found.part, found.instance.plus);
        return `<div class="slot" data-drop-slot="1" data-bot="${bot.id}" data-slot="${slot}">
          <div class="role">${slot}</div>
          <div class="worn" draggable="true" data-drag="${found.instance.instanceId}">
            <strong>${part.name}${found.instance.plus ? ` +${found.instance.plus}` : ""}</strong>
            <div class="nums">${statBits(part)}</div>
            ${part.kind === "tool" ? `<p class="tip">${effectExplain(part.effect).join(" ")}</p>` : ""}
          </div>
          <button data-act="unequip" data-id="${bot.id}" data-slot="${slot}">Unequip</button>
        </div>`;
      }).join("");
      return `<article class="bot${active}" data-act="selectBot" data-id="${bot.id}">
        <header>
          <strong>${botLabel(run.bots, bot)}</strong>
          <span class="role">${roleLabel(bot.role)}</span>
        </header>
        <div class="muted${over ? " over" : ""}">carry ${kit.carry}/${kit.capacity} · wt ${kit.weight}</div>
        ${slots}
      </article>`;
    })
    .join("");

  const bag = spareBag(run)
    .map((item) => {
      const part = effectivePart(partById(item.partId), item.plus);
      const bot = selected ? run.bots.find((itemBot) => itemBot.id === selected) : undefined;
      const ok = !!bot && canEquip(run, bot, item);
      return partBlock(part, item.plus, {
        act: "equip",
        id: item.instanceId,
        label: ok ? `Equip ${botLabel(run.bots, bot!)}` : "Cannot",
        disabled: !ok,
        drag: item.instanceId,
      });
    })
    .join("");

  const title = fight && node ? `Loadout · ${labelKind(node.kind)}` : "Kit party";
  const action = fight
    ? `<button class="primary" data-act="commitFight" ${overCap ? "disabled" : ""}>Resolve fight</button>`
    : `<button class="primary" data-act="closeKit">Done</button>`;

  return `
    <section class="screen">
      <h2>${title}</h2>
      <p class="tip">Drag a part onto a slot, or onto the bag to unequip. Tools must match the bot's role. Team weight ${partyWeight(run)}/${run.weightLimit}.</p>
      <div class="bots">${bots}</div>
      <h2>Bag</h2>
      <div class="grid bag" data-drop-bag="1">${bag || `<p class="muted">Empty. Drop a worn part here, or earn one on the path.</p>`}</div>
      <div class="row">${action}</div>
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
  const parts = run.screen.offers
    .map((id) => {
      const part = partById(id);
      return partBlock(part, 0, { act: "takeReward", id: part.id, label: "Take" });
    })
    .join("");
  return `
    <section class="screen">
      <h2>Reward · +${run.screen.cash} gold</h2>
      <p class="tip">Take one part.</p>
      <div class="grid">${parts}</div>
      <div class="row"><button data-act="skipReward">Skip part</button></div>
    </section>`;
}

function restView(run: Run): string {
  const parts = run.bag
    .map((item) => {
      const part = effectivePart(partById(item.partId), item.plus);
      return partBlock(part, item.plus, {
        act: "restUpgrade",
        id: item.instanceId,
        label: "Upgrade +1",
      });
    })
    .join("");
  return `
    <section class="screen">
      <h2>Rest</h2>
      <p class="tip">Heal ${BALANCE.restHeal} HP or add +1 to one part's main stat.</p>
      <div class="row"><button class="primary" data-act="restHeal">Heal</button></div>
      <div class="grid">${parts}</div>
    </section>`;
}

function shopView(run: Run): string {
  if (run.screen.kind !== "shop") {
    return "";
  }
  const stock = run.screen.stock
    .map((part) =>
      partBlock(part, 0, {
        act: "buy",
        id: part.id,
        label: `Buy ${part.cost}`,
        disabled: run.cash < part.cost,
      }),
    )
    .join("");
  return `
    <section class="screen">
      <h2>Shop</h2>
      <p class="tip">Gold ${run.cash}. Bought parts go to the bag.</p>
      <div class="grid">${stock || `<p class="muted">Sold out.</p>`}</div>
      <div class="row"><button class="primary" data-act="leaveShop">Leave</button></div>
    </section>`;
}

function prizeView(run: Run): string {
  if (run.screen.kind !== "runPrize") {
    return "";
  }
  if (run.screen.prize === "chassis") {
    const parts = run.screen.offers
      .map((id) => {
        const part = partById(id);
        return partBlock(part, 0, { act: "takePrizePart", id: part.id, label: "Take chassis" });
      })
      .join("");
    return `
      <section class="screen">
        <h2>Act prize · chassis</h2>
        <p class="tip">This chassis stays in your bag for the next run.</p>
        <div class="grid">${parts}</div>
      </section>`;
  }
  const parts = run.bag
    .map((item) => {
      const part = effectivePart(partById(item.partId), item.plus);
      return partBlock(part, item.plus, {
        act: "takePrizeUpgrade",
        id: item.instanceId,
        label: "Upgrade +1",
      });
    })
    .join("");
  return `
    <section class="screen">
      <h2>Act prize · upgrade</h2>
      <p class="tip">Add +1 to one part's main stat. It stays for the next run.</p>
      <div class="grid">${parts}</div>
    </section>`;
}

function endView(run: Run): string {
  if (run.screen.kind !== "end") {
    return "";
  }
  const delta = run.screen.goldDelta;
  const gold =
    delta === 0 ? "Gold unchanged." : delta > 0 ? `Gold +${delta}.` : `Gold ${delta}.`;
  const text =
    run.screen.outcome === "win"
      ? `<p class="win">Core Warden down. ${gold}</p>`
      : `<p class="lose">The line failed. ${gold}</p>`;
  return `
    <section class="screen">
      <h2>${run.screen.outcome === "win" ? "Win" : "Loss"}</h2>
      ${text}
      <p class="tip">Gold ${run.cash}. Your kit stays. Pick another run.</p>
      <div class="row"><button class="primary" data-act="restart">Choose a run</button></div>
    </section>`;
}

function partBlock(
  part: Part,
  plus: number,
  action: { act: string; id: string; label: string; disabled?: boolean; drag?: string },
): string {
  const plusMark = plus > 0 ? ` +${plus}` : "";
  const drag = action.drag
    ? ` draggable="true" data-drag="${action.drag}"`
    : "";
  const why =
    part.kind === "tool"
      ? `<p class="tip">${effectExplain(part.effect).join(" ")}</p>`
      : part.kind === "chassis"
        ? `<p class="tip">Carry cap ${part.capacity}. Heavier frame, more carry, more weight.</p>`
        : `<p class="tip">Armor ${part.armor}. Cuts incoming hits after suppress.</p>`;
  return `
    <article class="card ${partKindClass(part)}"${drag}>
      <header>
        <strong>${part.name}${plusMark}</strong>
        <span class="role">${partKindLabel(part)}</span>
      </header>
      <div class="nums">${statBits(part)}</div>
      ${why}
      <div class="row">
        <button data-act="${action.act}" data-id="${action.id}" ${action.disabled ? "disabled" : ""}>${action.label}</button>
      </div>
    </article>`;
}

function statBits(part: Part): string {
  const bits = [`wt ${part.weight}`];
  if (part.kind === "chassis") {
    bits.push(`cap ${part.capacity}`);
  }
  if (part.kind === "plate") {
    bits.push(`arm ${part.armor}`);
  }
  if (part.kind === "tool") {
    bits.push(...effectBits(part.effect));
  }
  if (part.cost) {
    bits.push(`gold ${part.cost}`);
  }
  return bits.map((bit) => `<span>${bit}</span>`).join("");
}

function effectBits(effect: ToolEffect): string[] {
  if (effect.family === "suppress") {
    return [`sup ${effect.amount}`, ...(effect.stun ? ["stun"] : [])];
  }
  if (effect.family === "brace") {
    return [`arm ${effect.armor}`, ...(effect.guard ? [`guard ${effect.guard}`] : [])];
  }
  if (effect.family === "strike") {
    return [`atk ${effect.atk}`, ...(effect.burst ? [`burst ${effect.burst}`] : [])];
  }
  return [`heal ${effect.heal}`, ...(effect.rally ? [`rally ${effect.rally}`] : [])];
}

function partKindClass(part: Part): string {
  if (part.kind === "tool") {
    return part.role;
  }
  return part.kind;
}

function partKindLabel(part: Part): string {
  if (part.kind === "tool") {
    return roleLabel(part.role);
  }
  if (part.kind === "chassis") {
    return "Chassis";
  }
  return "Plate";
}

function gateLabel(gate: WeightGate): string {
  if (gate.kind === "max") {
    return `≤${gate.weight}`;
  }
  if (gate.kind === "min") {
    return `≥${gate.weight}`;
  }
  return "open";
}

function isSlot(value: string | undefined): value is Slot {
  return value !== undefined && (SLOTS as readonly string[]).includes(value);
}

function isRunKindId(value: string): value is RunKindId {
  return (RUN_KIND_IDS as readonly string[]).includes(value);
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

function drawMapLinks(root: HTMLElement, run: Run): void {
  const map = root.querySelector(".map");
  const svg = root.querySelector("svg.map-links");
  if (!(map instanceof HTMLElement) || !(svg instanceof SVGElement)) {
    return;
  }
  const mapBox = map.getBoundingClientRect();
  svg.setAttribute("width", String(map.scrollWidth));
  svg.setAttribute("height", String(map.scrollHeight));
  svg.setAttribute("viewBox", `0 0 ${map.scrollWidth} ${map.scrollHeight}`);
  const lines: string[] = [];
  for (const node of run.map.nodes) {
    const from = map.querySelector(`[data-id="${node.id}"]`);
    if (!(from instanceof HTMLElement)) {
      continue;
    }
    const a = from.getBoundingClientRect();
    for (const nextId of node.next) {
      const to = map.querySelector(`[data-id="${nextId}"]`);
      if (!(to instanceof HTMLElement)) {
        continue;
      }
      const b = to.getBoundingClientRect();
      const x1 = a.right - mapBox.left + map.scrollLeft;
      const y1 = a.top + a.height / 2 - mapBox.top + map.scrollTop;
      const x2 = b.left - mapBox.left + map.scrollLeft;
      const y2 = b.top + b.height / 2 - mapBox.top + map.scrollTop;
      lines.push(
        `<path d="M ${x1} ${y1} C ${x1 + 18} ${y1}, ${x2 - 18} ${y2}, ${x2} ${y2}" fill="none" stroke="#5a5e68" stroke-width="1.5" />`,
      );
    }
  }
  svg.innerHTML = lines.join("");
}
