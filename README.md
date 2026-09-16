# Bot Arena Potato

A one-act web slice in the spirit of Bot Arena 3, with Slay the Spire path choices. You kit five bots. Each bot wears a chassis, a plate, and a role tool. You pick an act with its own team weight cap. Rooms have entry weight gates. Lines show which rooms still link. Taking a room locks rooms with no line. Fights one-tap resolve.

## Run it locally

You need Node 20 or newer.

```bash
npm install
npm test
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

`npm run preview` serves `dist`. `npx --yes serve dist` does the same if you want a static host.

GitHub Pages is not wired. The build uses a relative `base`, so you can drop `dist` on any static host.

## Play

1. Choose a run. Patrol is free. Raid, Haul, and Glass cost gold. Each act has its own team weight cap. A win pays gold. A loss takes gold. A win also gives a chassis or a part upgrade that stays for the next act.
2. Kit on the map. Starters start on the bots. The bag stays empty until a reward, shop part, or act prize lands there. Drag a part onto a slot, or onto the bag to unequip. Chassis sets how much plate and tool weight that bot can carry. A heavier chassis carries more and weighs more itself.
3. Pick a room. Lines are the links. Left rooms want a light party (`≤` gate). Right rooms want a heavy party (`≥` gate). Open rooms take any weight. A room you cannot reach from your last pick stays dark. A room whose gate you miss stays disabled until you re-kit.
4. On a fight, resolve. Combat runs without micro. The log shows HP, damage, and heal.
5. Take a part and gold, then return to the map. The boss ends the act.

## Balance levers

All tunable numbers live in `src/balance.ts`. That file holds start HP, gold, rest heal, gold rewards, enemy HP and attack, `minChip`, and the room weight gates (`lightMax`, `heavyMin`, `floor1HeavyMin`, `lateHeavyMin`). Act caps, entry costs, win and loss gold, and prizes live on `RUN_KINDS` in `src/content.ts`. Part names and tool effects also live there. Combat rules live in `src/combat.ts`.

Combat order: suppress cuts enemy attack, stun zeros the first hit, armor applies, `minChip` floors leftover damage, then guard absorbs. Heal runs after both sides still stand. A stacked loadout still chips after stun and guard are spent.

## Tool families

Each tool matches one role. The extra clause is a condition, not a second role. The kit screen writes the full sentence, not just the keyword.

- Controller, suppress. Cuts enemy attack by its number. Stun Coil also makes the first hit this fight deal 0.
- Defender, brace. Adds armor. Guard Door and Spike Guard also soak the first points of incoming damage this fight.
- Striker, strike. Adds attack. Burst Rail also adds damage on round one only.
- Leader, mend. Heals each round both sides still stand. Rally Flag also adds party attack.
