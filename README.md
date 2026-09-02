# Dave: Reissue

A browser remake of the DOS game *Dangerous Dave*. Ten hand-authored levels
drawn entirely by hand into one `<canvas>` — no sprite files, no engine, no
physics library, no backend. Find the key, reach the door, next level.

Built with Next.js (App Router), TypeScript and Tailwind. Client-side only.

## Controls

| Action        | Keys                   | Notes           |
| ------------- | ---------------------- | --------------- |
| Move          | `A` / `D` or `←` / `→` |                 |
| Jump          | `Space`, `W` or `↑`    | Variable height |
| Shoot         | `J` or `Ctrl`          | Needs the gun   |
| Jetpack       | `Shift` or `K`         | Hold to fly     |
| Pause         | `Esc`                  |                 |
| Restart level | `R`                    |                 |

## Gear

**The gun** (level 6 on) opens timber crates, kills enemies and breaks
turrets. Ammo is capped at six but regenerates one round every 1.5s, so
wasting rounds on a crate can slow you down but can never make a level
unwinnable.

**The jetpack** (level 7 on) lifts you past walls no jump clears. A full tank
is 2.6s of thrust; it refills on the ground and from canisters, so a shaft can
always be retried. Levels 8 to 10 need both.

## The nine fixes

| # | Fix | Where it lives |
| - | --- | -------------- |
| 1 | **Smooth camera** — lerps toward the player with look-ahead, clamped to the level, never flips by a screen width | `src/game/engine.ts` (`updateCamera`, `cameraTarget`), `CAMERA` in `theme.ts` |
| 2 | **Checkpoints** — `C` tiles save your position and toast "Checkpoint saved"; death returns you there | `engine.ts` (`collectPickups`, `respawn`), `C` tiles in `levels.ts` |
| 3 | **All key bindings** — WASD, arrows, Space, J/Ctrl and Shift/K all live at once, matched on `event.code`, held in a set, with `preventDefault` on Space and the arrows | `src/game/input.ts` |
| 4 | **Not pixel art** — vector figures at device pixel ratio, built from shaded panels and round-capped limbs, with a walk cycle and squash on landing | `src/game/render.ts`, `JUICE` in `theme.ts` |
| 5 | **Real physics** — fixed 1/120s timestep with interpolated rendering, variable jump height, 100ms coyote time, 120ms jump buffer, axis-by-axis AABB collision | `src/game/physics.ts`, the loop in `engine.ts`, `PHYSICS` in `theme.ts` |
| 6 | **Tutorial** — level one is flat and safe, with hints that fire as you walk into column zones; levels 6 and 7 teach the gun and the jetpack the same way | `hints` in `levels.ts`, `src/components/ControlsPanel.tsx` |
| 7 | **Health, not instant death** — 3 hearts, knockback and 1.2s of flickering invulnerability per hit; zero hearts respawns you at the checkpoint, full | `engine.ts` (`damage`, `loseHeart`), `COMBAT` in `theme.ts`, `Hud.tsx` |
| 8 | **Saved progress** — one localStorage key for unlocked levels, pilot, gems and last checkpoint, written on checkpoint and level complete, every field validated on read | `src/game/save.ts`, `MainMenu.tsx` |
| 9 | **Character select** — Dave (baseline), Nyx (speed 320, jump −560), Bram (4 hearts, speed 210, jump −660), saved and swappable mid-run | `CHARACTERS` in `theme.ts`, `CharacterStrip.tsx` |

Every tuning number lives in `src/game/theme.ts`.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Deploy

```bash
gh repo create dave-reissue --public --source=. --remote=origin --push
npx vercel --prod          # or import the repo at vercel.com/new
```

Stock Next.js app: no environment variables, no build settings to change.

## Licence

MIT. See [LICENSE](LICENSE).
