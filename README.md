# Bot Arena Potato

A one-act web slice in the spirit of Bot Arena 3, with Slay the Spire path choices. You kit five bots. Each bot wears a chassis, a plate, and a role tool. Nodes have entry weight gates. Taking a room locks rooms it does not link. Fights one-tap resolve.

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

1. Start a run. The party is Defender, Striker, Leader, Controller, and a second Striker.
2. Kit on the map before you pick a room. Starters start on the bots. The bag is empty until a reward or shop part lands there. Chassis sets how much plate and tool weight that bot can carry. A heavier chassis carries more and weighs more itself.
3. Pick a room. Left rooms want a light party (`≤` gate). Right rooms want a heavy party (`≥` gate). Open rooms take any weight. A room you cannot reach from your last pick stays dark. A room whose gate you miss stays disabled until you re-kit.
4. On a fight, resolve. Combat runs without micro. The log shows HP, damage, and heal.
5. Take a part and cash, then return to the map. The boss ends the run.

## Balance levers

All tunable numbers live in `src/balance.ts`. That file holds start HP, cash, rest heal, cash rewards, enemy HP and attack, `minChip`, and the weight gates (`lightMax`, `heavyMin`, `floor1HeavyMin`, `lateHeavyMin`). Part names and tool effects live in `src/content.ts`. Combat rules live in `src/combat.ts`.

Combat order: suppress cuts enemy attack, stun zeros the first hit, armor applies, `minChip` floors leftover damage, then guard absorbs. Heal runs after both sides still stand. A stacked loadout still chips after stun and guard are spent.

## Tool families

Each tool matches one role. The extra number is a condition, not a second role.

- Controller, suppress. Cuts enemy attack. Stun Coil also zeros the first incoming hit.
- Defender, brace. Adds armor. Guard Door and Spike Guard also absorb the first points of incoming damage.
- Striker, strike. Adds attack. Burst Rail also adds damage on round one only.
- Leader, mend. Heals each round both sides still stand. Rally Flag also adds party attack.
