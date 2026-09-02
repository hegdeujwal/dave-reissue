# Dave: Reissue

A small browser remake of the DOS game *Dangerous Dave*. Five hand-authored
levels, drawn entirely by hand into one `<canvas>` as flat vector shapes — no
sprites, no engine, no physics library, no backend. Collect the key, reach the
door, next level.

Built with Next.js (App Router), TypeScript and Tailwind. Client-side only.

## Controls

| Action        | Keys                     |
| ------------- | ------------------------ |
| Move          | `A` / `D` or `←` / `→`   |
| Jump          | `Space`, `W` or `↑`      |
| Pause         | `Esc`                    |
| Restart level | `R`                      |

## The nine fixes

| # | Fix | Where it lives |
| - | --- | -------------- |
| 1 | **Smooth camera** — lerps toward the player with look-ahead, clamped to the level, never flips by a screen width | `src/game/engine.ts` (`updateCamera`, `cameraTarget`), `CAMERA` in `src/game/theme.ts` |
| 2 | **Checkpoints** — `C` tiles save your position and toast "Checkpoint saved"; death returns you there | `src/game/engine.ts` (`collectPickups`, `respawn`), `C` tiles in `src/game/levels.ts` |
| 3 | **All key bindings** — WASD, arrows and Space all live at once, matched on `event.code`, held in a set, with `preventDefault` on Space and the arrows | `src/game/input.ts` |
| 4 | **Not pixel art** — flat vector shapes at device pixel ratio, with squash on landing and stretch on the way up | `src/game/render.ts`, `JUICE` in `src/game/theme.ts` |
| 5 | **Real physics** — fixed 1/120s timestep with interpolated rendering, variable jump height, 100ms coyote time, 120ms jump buffer, axis-by-axis AABB collision | `src/game/physics.ts`, the loop in `src/game/engine.ts`, `PHYSICS` in `src/game/theme.ts` |
| 6 | **Tutorial** — level one is flat and safe, with hints that fire as you walk into column zones; a Controls panel sits on the menu and the pause screen | `hints` in `src/game/levels.ts`, `src/components/ControlsPanel.tsx` |
| 7 | **Health, not instant death** — 3 hearts, knockback and 1.2s of flickering invulnerability per hit; zero hearts respawns you at the checkpoint, full | `src/game/engine.ts` (`damage`, `loseHeart`), `COMBAT` in `src/game/theme.ts`, `src/components/Hud.tsx` |
| 8 | **Saved progress** — one localStorage key for unlocked levels, character, gems and last checkpoint, written on checkpoint and level complete, every field validated on read | `src/game/save.ts`, `src/components/MainMenu.tsx` |
| 9 | **Character select** — Dave (baseline), Nyx (speed 320, jump −560), Bram (4 hearts, speed 210, jump −660), saved and swappable mid-run | `CHARACTERS` in `src/game/theme.ts`, `src/components/CharacterStrip.tsx` |

Every tuning number lives in `src/game/theme.ts`.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Deploy

Push to GitHub, then import the repository at
[vercel.com/new](https://vercel.com/new). It is a stock Next.js app, so the
defaults are correct — no environment variables and no build settings to
change. Or from this directory: `npx vercel --prod`.

## Licence

MIT. See [LICENSE](LICENSE).
