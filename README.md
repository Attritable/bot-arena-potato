# Bot Arena Potato

A one-act web slice in the spirit of Bot Arena 3, with Slay the Spire path choices. You kit four bot roles (Defender, Striker, Leader, Controller) from part-cards under a weight budget, pick iconed map nodes, and one-tap auto-resolve fights.

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

1. Start a run and pick the next node. Floor siblings are different types. Elite is optional risk. Rest before the boss is heal or upgrade.
2. On a fight node, equip one part per role. Weight is the budget.
3. Resolve. Combat runs without micro. The log shows HP, damage, and heal.
4. Take a part-card and cash, then return to the map. The boss ends the run.

## Balance levers

All tunable numbers live in `src/balance.ts` (start HP, cash, weight limit, rest heal, cash rewards, enemy HP and attack). Card and enemy names live in `src/content.ts`. Combat rules live in `src/combat.ts` (control cuts enemy attack, then armor cuts the rest).
