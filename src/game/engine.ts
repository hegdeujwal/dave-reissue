import {
  CAMERA,
  CHARACTERS,
  COLORS,
  COMBAT,
  FIXED_DT,
  JETPACK,
  MAX_FRAME_DT,
  PHYSICS,
  SHAKE,
  TILE,
  TOAST_TIME,
  TURRET,
  VIEW_W,
  WEAPON,
  type CharacterId,
} from "./theme";
import {
  drawBackdrop,
  drawBullet,
  drawCheckpoint,
  drawDoor,
  drawEnemy,
  drawFuel,
  drawFuelPip,
  drawGem,
  drawGunPickup,
  drawHitFlash,
  drawJetpackPickup,
  drawKey,
  drawParticles,
  drawPlayer,
  drawTiles,
  drawTurret,
  drawVignette,
  setupCanvas,
} from "./render";
import {
  BREAKABLE,
  LEVELS,
  Level,
  SPIKE,
  tileBox,
  tileToBox,
  type Cell,
  type Point,
} from "./levels";
import { Input } from "./input";
import { loadSave, patchSave } from "./save";
import {
  approach,
  clamp,
  createBullet,
  createEnemy,
  createPlayer,
  landSquash,
  overlaps,
  resolveX,
  resolveY,
  stepBullet,
  stepCoyote,
  stepEnemy,
  stepGravity,
  stepHorizontal,
  stepJetpack,
  stepJump,
  stepSquash,
  type Bullet,
  type Enemy,
  type Intent,
  type Player,
  type Stats,
} from "./physics";

/** Particle palettes, kept next to the effects that use them. */
const COLORS_FLAME = [COLORS.flameHot, COLORS.flame, COLORS.orange];
const CRATE_DEBRIS = [COLORS.crateLight, COLORS.crate, COLORS.crateDark];
const DUST = [COLORS.dim, COLORS.wallEdge];
const SPARKS = [COLORS.flameHot, COLORS.steel, COLORS.ink];
const EXPLOSION = [COLORS.flameHot, COLORS.flame, COLORS.pink, COLORS.ink];

function statsFor(id: CharacterId): Stats {
  const character = CHARACTERS[id];
  return {
    maxSpeed: character.maxSpeed,
    jumpVelocity: character.jumpVelocity,
    hearts: character.hearts,
  };
}

export type Mode = "playing" | "paused" | "levelComplete" | "runComplete";

/** A wall turret. Stationary, fires along its row, takes two hits. */
export type Turret = {
  cell: Cell;
  x: number;
  y: number;
  w: number;
  h: number;
  dir: 1 | -1;
  cooldown: number;
  hp: number;
};

/** Purely cosmetic debris. Sparks, dust, flame and gem shards. */
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
};

/** What the React layer needs in order to draw the HUD and the menus. */
export type Snapshot = {
  mode: Mode;
  levelIndex: number;
  levelName: string;
  levelCount: number;
  characterId: CharacterId;
  hearts: number;
  maxHearts: number;
  gems: number;
  gemsTotal: number;
  hasKey: boolean;
  hasGun: boolean;
  ammo: number;
  maxAmmo: number;
  hasJetpack: boolean;
  /** Fuel left, 0 to 1. */
  fuel: number;
  time: number;
  /** Short-lived message such as "Checkpoint saved". */
  toast: string | null;
  /** Tutorial hint for the zone the player is standing in. */
  hint: string | null;
};

export type GameOptions = {
  onSnapshot: (snapshot: Snapshot) => void;
  /** Where a Continue drops the player back in. */
  startLevel?: number;
  startCheckpoint?: Point | null;
  character?: CharacterId;
};

/**
 * The game loop. Physics runs on a fixed 1/120s step and rendering
 * interpolates between the last two steps, so behaviour does not change
 * with the refresh rate.
 */
export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private raf = 0;
  private lastTime = 0;
  private accumulator = 0;

  /** Elapsed simulated time, used by cosmetic animations. */
  private clock = 0;
  private camX = 0;
  private prevCamX = 0;

  private levelIndex = 0;
  private level: Level;
  private readonly player: Player;
  private characterId: CharacterId = "dave";
  private stats: Stats = statsFor("dave");
  private readonly input = new Input();
  private mode: Mode = "playing";
  private elapsed = 0;
  private hearts: number = COMBAT.hearts;
  /** Seconds of flickering invulnerability left after taking a hit. */
  private invuln = 0;

  /** Per-level run state. */
  private gemsTaken: boolean[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private turrets: Turret[] = [];
  private particles: Particle[] = [];
  /** Crates that have been shot out, keyed by row * cols + col. */
  private broken = new Set<number>();
  /** Countdown before each spent fuel canister comes back. */
  private fuelTimers: number[] = [];
  private hasKey = false;
  private gunTaken = false;
  private jetpackTaken = false;
  private hasGun = false;
  private hasJetpack = false;
  private ammo = WEAPON.maxAmmo;
  private reloadTimer = 0;
  private shotTimer = 0;
  private fuel = 0;
  /** True on the steps the pack is actually firing, for the renderer. */
  private thrusting = false;
  private shake = 0;
  private hitFlash = 0;
  /** Index of the checkpoint the player has touched, -1 for none. */
  private activeCheckpoint = -1;
  private checkpoint: Point | null = null;
  private toast: string | null = null;
  private toastTimer = 0;
  private hint: string | null = null;

  private lastSignature = "";

  private readonly intent: Intent = {
    left: false,
    right: false,
    jumpHeld: false,
    jumpBuffer: 0,
  };
  private shootHeld = false;
  private jetHeld = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: GameOptions,
  ) {
    this.ctx = setupCanvas(canvas);
    this.characterId = options.character ?? "dave";
    this.stats = statsFor(this.characterId);
    this.levelIndex = clamp(options.startLevel ?? 0, 0, LEVELS.length - 1);
    this.level = new Level(LEVELS[this.levelIndex]);
    this.player = createPlayer(this.level.spawn.x, this.level.spawn.y);
    this.loadLevel(this.levelIndex, options.startCheckpoint ?? null);
  }

  start() {
    if (this.raf) return;
    this.input.attach();
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.input.detach();
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /**
   * Collision against the level, with crates removed once they are shot out.
   * Everything that moves uses this rather than Level.isSolid.
   */
  private readonly solid = (col: number, row: number) => {
    if (col < 0 || col >= this.level.cols) return true;
    const tile = this.level.at(col, row);
    if (tile === BREAKABLE) return !this.broken.has(this.cellKey(col, row));
    return tile === "#";
  };

  private cellKey(col: number, row: number) {
    return row * this.level.cols + col;
  }

  /** Re-measure after a device pixel ratio change. */
  resize() {
    setupCanvas(this.canvas);
  }

  loadLevel(index: number, checkpoint: Point | null = null) {
    this.levelIndex = clamp(index, 0, LEVELS.length - 1);
    this.level = new Level(LEVELS[this.levelIndex]);
    this.gemsTaken = this.level.gems.map(() => false);
    this.enemies = this.level.enemies.map((c) => createEnemy(c.col, c.row));
    this.turrets = this.level.turrets.map((cell) => ({
      cell,
      x: cell.col * TILE + (TILE - TURRET.w) / 2,
      y: (cell.row + 1) * TILE - TURRET.h,
      w: TURRET.w,
      h: TURRET.h,
      dir: 1 as 1 | -1,
      cooldown: TURRET.interval * 0.5,
      hp: 2,
    }));
    this.bullets = [];
    this.particles = [];
    this.broken.clear();
    this.fuelTimers = this.level.fuels.map(() => 0);
    this.hasKey = false;
    this.gunTaken = false;
    this.jetpackTaken = false;
    this.hasGun = false;
    this.hasJetpack = false;
    this.ammo = WEAPON.maxAmmo;
    this.reloadTimer = 0;
    this.shotTimer = 0;
    this.fuel = 0;
    this.thrusting = false;
    this.shake = 0;
    this.hitFlash = 0;
    this.activeCheckpoint = -1;
    this.checkpoint = checkpoint;
    this.toast = null;
    this.toastTimer = 0;
    this.hint = null;
    this.hearts = this.stats.hearts;
    this.invuln = 0;
    this.elapsed = 0;
    this.mode = "playing";
    this.respawn();
    this.publish(true);
  }

  nextLevel() {
    if (this.levelIndex + 1 < LEVELS.length) this.loadLevel(this.levelIndex + 1);
  }

  /** R drops the player back at the start of the level. */
  restartLevel() {
    this.loadLevel(this.levelIndex);
  }

  /** Put the player back at the last checkpoint, or the level start. */
  private respawn() {
    const p = this.player;
    const at = this.checkpoint ?? this.level.spawn;
    p.x = p.px = at.x;
    p.y = p.py = at.y;
    p.vx = 0;
    p.vy = 0;
    p.grounded = false;
    p.coyote = 0;
    p.rising = false;
    p.facing = 1;
    p.sx = 1;
    p.sy = 1;
    this.snapCamera();
  }

  /**
   * Swapping character mid-run keeps the player where they are and never
   * hands out free hearts.
   */
  setCharacter(id: CharacterId) {
    this.characterId = id;
    this.stats = statsFor(id);
    this.hearts = Math.min(this.hearts, this.stats.hearts);
    patchSave({ character: id });
    this.publish(true);
  }

  setPaused(paused: boolean) {
    if (this.mode !== "playing" && this.mode !== "paused") return;
    this.mode = paused ? "paused" : "playing";
    this.publish();
  }

  private readFromKeys() {
    this.intent.left = this.input.isDown("left");
    this.intent.right = this.input.isDown("right");
    this.intent.jumpHeld = this.input.isDown("jump");
    this.shootHeld = this.input.isDown("shoot");
    this.jetHeld = this.input.isDown("jet");
    if (this.input.consumeJumpPress()) {
      this.intent.jumpBuffer = PHYSICS.jumpBuffer;
    }

    if (this.input.consumePause()) this.setPaused(this.mode === "playing");
    if (this.input.consumeRestart()) this.restartLevel();
  }

  private readonly frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);

    const frameDt = Math.min((now - this.lastTime) / 1000, MAX_FRAME_DT);
    this.lastTime = now;
    this.accumulator += frameDt;

    this.readFromKeys();

    if (this.mode !== "playing") {
      this.accumulator = 0;
      this.draw(1);
      return;
    }

    while (this.accumulator >= FIXED_DT) {
      this.savePrevious();
      this.fixedUpdate(FIXED_DT);
      this.clock += FIXED_DT;
      this.elapsed += FIXED_DT;
      this.accumulator -= FIXED_DT;
    }

    this.draw(this.accumulator / FIXED_DT);
    this.publish();
  };

  /** Snapshot the values the renderer interpolates from. */
  private savePrevious() {
    this.prevCamX = this.camX;
    this.player.px = this.player.x;
    this.player.py = this.player.y;
    for (const e of this.enemies) {
      e.px = e.x;
      e.py = e.y;
    }
    for (const b of this.bullets) {
      b.px = b.x;
      b.py = b.y;
    }
  }

  private fixedUpdate(dt: number) {
    const p = this.player;

    stepHorizontal(p, this.intent, this.stats, dt);
    stepJump(p, this.intent, this.stats);
    stepGravity(p, dt);

    this.thrusting = this.hasJetpack && this.jetHeld && this.fuel > 0;
    this.fuel = stepJetpack(p, this.thrusting, this.fuel, dt);
    if (this.thrusting) this.emitThrust(p);

    const wasGrounded = p.grounded;
    p.x += p.vx * dt;
    resolveX(p, this.solid);
    p.y += p.vy * dt;
    resolveY(p, this.solid);
    if (p.grounded && !wasGrounded) {
      landSquash(p);
      if (p.vy === 0) this.shake = Math.max(this.shake, SHAKE.land);
      this.emitDust(p);
    }

    if (p.grounded && !this.thrusting && this.hasJetpack) {
      this.fuel = Math.min(JETPACK.maxFuel, this.fuel + JETPACK.recharge * dt);
    }

    stepCoyote(p, dt);
    stepSquash(p, dt);
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - dt);
      if (this.toastTimer === 0) this.toast = null;
    }
    // A jump pressed just before touchdown stays alive until the player lands.
    this.intent.jumpBuffer = Math.max(0, this.intent.jumpBuffer - dt);

    for (const enemy of this.enemies) stepEnemy(enemy, this.solid, dt);

    this.stepWeapon(dt);
    this.stepBullets(dt);
    this.stepTurrets(dt);
    this.stepParticles(dt);
    for (let i = 0; i < this.fuelTimers.length; i++) {
      if (this.fuelTimers[i] > 0) {
        this.fuelTimers[i] = Math.max(0, this.fuelTimers[i] - dt);
      }
    }
    this.shake = Math.max(0, this.shake - SHAKE.decay * dt * this.shake);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.2);

    this.collectPickups();
    this.checkHazards();
    this.updateHint();
    this.updateCamera(dt);
  }

  /* ------------------------------------------------------------------ */
  /* The gun                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Ammo is capped but trickles back on its own, so wasting every round on a
   * crate can slow you down but can never make a level unwinnable.
   */
  private stepWeapon(dt: number) {
    this.shotTimer = Math.max(0, this.shotTimer - dt);

    if (this.hasGun && this.ammo < WEAPON.maxAmmo) {
      this.reloadTimer += dt;
      if (this.reloadTimer >= WEAPON.reload) {
        this.reloadTimer = 0;
        this.ammo += 1;
      }
    }

    if (!this.hasGun || !this.shootHeld || this.shotTimer > 0 || this.ammo <= 0) {
      return;
    }

    const p = this.player;
    this.ammo -= 1;
    this.shotTimer = WEAPON.cooldown;
    this.bullets.push(
      createBullet(
        p.x + p.w / 2 + WEAPON.muzzle * p.facing,
        p.y + p.h * 0.42,
        p.facing,
        WEAPON.bulletSpeed,
        WEAPON.bulletW,
        WEAPON.bulletH,
        WEAPON.life,
        true,
      ),
    );
    // A little kick, so shooting has weight.
    p.vx -= p.facing * WEAPON.kick;
    this.shake = Math.max(this.shake, 2.5);
    this.spawnParticles(
      p.x + p.w / 2 + WEAPON.muzzle * p.facing,
      p.y + p.h * 0.42,
      4,
      COLORS_FLAME,
      { spread: 70, speed: 120, life: 0.12, size: 3, gravity: 0 },
    );
  }

  private stepBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.px = b.x;
      b.py = b.y;
      stepBullet(b, dt);

      let spent = b.life <= 0;

      if (!spent) {
        const nose = b.vx > 0 ? b.x + b.w : b.x;
        const col = Math.floor(nose / TILE);
        const row = Math.floor((b.y + b.h / 2) / TILE);
        const tile = this.level.at(col, row);

        if (tile === BREAKABLE && !this.broken.has(this.cellKey(col, row))) {
          if (b.friendly) {
            this.broken.add(this.cellKey(col, row));
            this.shake = Math.max(this.shake, SHAKE.explosion);
            this.spawnParticles(
              col * TILE + TILE / 2,
              row * TILE + TILE / 2,
              14,
              CRATE_DEBRIS,
              { spread: 360, speed: 190, life: 0.5, size: 4, gravity: 900 },
            );
          }
          spent = true;
        } else if (this.solid(col, row)) {
          this.sparks(nose, b.y + b.h / 2);
          spent = true;
        }
      }

      if (!spent && b.friendly) {
        const hitIndex = this.enemies.findIndex((e) => overlaps(b, e));
        if (hitIndex >= 0) {
          const enemy = this.enemies[hitIndex];
          this.enemies.splice(hitIndex, 1);
          this.explode(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
          spent = true;
        }
        const turret = this.turrets.find((t) => overlaps(b, t));
        if (!spent && turret) {
          turret.hp -= 1;
          this.sparks(b.x, b.y + b.h / 2);
          if (turret.hp <= 0) {
            this.turrets = this.turrets.filter((t) => t !== turret);
            this.explode(turret.x + turret.w / 2, turret.y + turret.h / 2);
          }
          spent = true;
        }
      }

      if (!spent && !b.friendly && this.invuln <= 0 && overlaps(this.player, b)) {
        this.damage(b.x + b.w / 2);
        spent = true;
      }

      if (spent) this.bullets.splice(i, 1);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Turrets                                                             */
  /* ------------------------------------------------------------------ */

  private stepTurrets(dt: number) {
    const p = this.player;
    for (const turret of this.turrets) {
      turret.cooldown -= dt;
      const dx = p.x + p.w / 2 - (turret.x + turret.w / 2);
      const dy = p.y + p.h / 2 - (turret.y + turret.h / 2);
      if (Math.abs(dy) < TILE) turret.dir = dx < 0 ? -1 : 1;
      if (turret.cooldown > 0) continue;
      if (Math.abs(dx) > TURRET.range || Math.abs(dy) > TILE) continue;

      turret.cooldown = TURRET.interval;
      this.bullets.push(
        createBullet(
          turret.x + turret.w / 2 + turret.dir * (turret.w / 2 + 4),
          turret.y + turret.h * 0.4,
          turret.dir,
          TURRET.boltSpeed,
          TURRET.boltW,
          TURRET.boltH,
          TURRET.life,
          false,
        ),
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* Particles                                                           */
  /* ------------------------------------------------------------------ */

  private spawnParticles(
    x: number,
    y: number,
    count: number,
    palette: string[],
    opts: {
      spread: number;
      speed: number;
      life: number;
      size: number;
      gravity: number;
      bias?: number;
    },
  ) {
    if (this.particles.length > 400) return;
    for (let i = 0; i < count; i++) {
      const angle =
        ((opts.bias ?? -90) + (Math.random() - 0.5) * opts.spread) *
        (Math.PI / 180);
      const speed = opts.speed * (0.45 + Math.random() * 0.75);
      const life = opts.life * (0.6 + Math.random() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: opts.size * (0.6 + Math.random() * 0.8),
        color: palette[(Math.random() * palette.length) | 0],
        gravity: opts.gravity,
      });
    }
  }

  private stepParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.vy += q.gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.life -= dt;
      if (q.life <= 0) this.particles.splice(i, 1);
    }
  }

  private emitThrust(p: Player) {
    this.spawnParticles(p.x + p.w / 2, p.y + p.h - 2, 2, COLORS_FLAME, {
      spread: 46,
      speed: 190,
      life: 0.22,
      size: 4,
      gravity: 240,
      bias: 90,
    });
  }

  private emitDust(p: Player) {
    this.spawnParticles(p.x + p.w / 2, p.y + p.h, 5, DUST, {
      spread: 150,
      speed: 90,
      life: 0.26,
      size: 3,
      gravity: 200,
    });
  }

  private sparks(x: number, y: number) {
    this.spawnParticles(x, y, 5, SPARKS, {
      spread: 200,
      speed: 150,
      life: 0.2,
      size: 3,
      gravity: 500,
    });
  }

  private explode(x: number, y: number) {
    this.shake = Math.max(this.shake, SHAKE.explosion);
    this.spawnParticles(x, y, 16, EXPLOSION, {
      spread: 360,
      speed: 210,
      life: 0.42,
      size: 4,
      gravity: 620,
    });
  }

  /** Gems, the key, and the door that only opens once the key is held. */
  private collectPickups() {
    const p = this.player;

    this.level.gems.forEach((cell, i) => {
      if (this.gemsTaken[i]) return;
      if (overlaps(p, tileBox(cell, 6))) this.gemsTaken[i] = true;
    });

    if (this.level.key && !this.hasKey) {
      if (overlaps(p, tileBox(this.level.key, 5))) {
        this.hasKey = true;
        this.showToast("Key");
      }
    }

    if (this.level.guns.length && !this.gunTaken) {
      const cell = this.level.guns[0];
      if (overlaps(p, tileBox(cell, 4))) {
        this.gunTaken = true;
        this.hasGun = true;
        this.ammo = WEAPON.maxAmmo;
        this.showToast("Gun. Shoot with J or Ctrl");
      }
    }

    if (this.level.jetpacks.length && !this.jetpackTaken) {
      const cell = this.level.jetpacks[0];
      if (overlaps(p, tileBox(cell, 4))) {
        this.jetpackTaken = true;
        this.hasJetpack = true;
        this.fuel = JETPACK.maxFuel;
        this.showToast("Jetpack. Hold Shift or K");
      }
    }

    this.level.fuels.forEach((cell, i) => {
      if (this.fuelTimers[i] > 0) return;
      if (!overlaps(p, tileBox(cell, 5))) return;
      this.fuelTimers[i] = JETPACK.canisterRespawn;
      this.fuel = JETPACK.maxFuel;
      if (this.hasJetpack) this.showToast("Fuel");
    });

    this.level.checkpoints.forEach((cell, i) => {
      if (this.activeCheckpoint === i) return;
      if (!overlaps(p, tileBox(cell, 4))) return;
      this.activeCheckpoint = i;
      this.checkpoint = tileToBox(cell.col, cell.row);
      this.saveCheckpoint();
      this.showToast("Checkpoint saved");
    });

    if (this.level.door && this.hasKey) {
      if (overlaps(p, tileBox(this.level.door, 4))) {
        this.mode =
          this.levelIndex + 1 < LEVELS.length ? "levelComplete" : "runComplete";
        this.saveCompletion();
        this.publish(true);
      }
    }
  }

  /** Tutorial hints fire from column ranges the player walks into. */
  private updateHint() {
    const zones = this.level.data.hints;
    if (!zones) {
      this.hint = null;
      return;
    }
    const col = Math.floor((this.player.x + this.player.w / 2) / TILE);
    const zone = zones.find((z) => col >= z.from && col <= z.to);
    this.hint = zone ? zone.text : null;
  }

  /** Progress is written at exactly two moments: a checkpoint and a finish. */
  private saveCheckpoint() {
    if (!this.checkpoint) return;
    patchSave({
      checkpoint: {
        level: this.levelIndex,
        x: this.checkpoint.x,
        y: this.checkpoint.y,
      },
    });
  }

  private saveCompletion() {
    const current = loadSave();
    patchSave({
      unlockedLevels: Math.max(
        current.unlockedLevels,
        Math.min(this.levelIndex + 2, LEVELS.length),
      ),
      gems: current.gems + this.gemsTaken.filter(Boolean).length,
      checkpoint: null,
    });
  }

  private showToast(message: string) {
    this.toast = message;
    this.toastTimer = TOAST_TIME;
    this.publish(true);
  }

  /**
   * Spikes and enemies cost one heart, never the whole run. A hit knocks the
   * player back and grants 1.2s of flickering invulnerability. Hearts only
   * run out into a respawn, and the respawn hands them all back.
   */
  private checkHazards() {
    const p = this.player;

    if (p.y > this.level.heightPx + TILE * 2) {
      this.loseHeart();
      this.respawn();
      this.invuln = COMBAT.invulnTime;
      return;
    }

    if (this.invuln > 0) return;

    const spikeX = this.spikeContactX();
    if (spikeX !== null) {
      this.damage(spikeX);
      return;
    }

    const enemy = this.enemies.find((e) => overlaps(p, e));
    if (enemy) {
      this.damage(enemy.x + enemy.w / 2);
      return;
    }

    const turret = this.turrets.find((t) => overlaps(p, t));
    if (turret) this.damage(turret.x + turret.w / 2);
  }

  private damage(fromX: number) {
    const p = this.player;
    this.invuln = COMBAT.invulnTime;
    this.shake = Math.max(this.shake, SHAKE.hit);
    this.hitFlash = 1;
    this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 10, EXPLOSION, {
      spread: 360,
      speed: 180,
      life: 0.3,
      size: 3,
      gravity: 500,
    });

    const away = p.x + p.w / 2 < fromX ? -1 : 1;
    p.vx = away * COMBAT.knockbackX;
    p.vy = COMBAT.knockbackY;
    p.grounded = false;
    p.coyote = 0;
    p.rising = false;

    if (this.loseHeart()) this.respawn();
  }

  /** Returns true when that was the last heart. */
  private loseHeart() {
    this.hearts -= 1;
    if (this.hearts > 0) return false;
    this.hearts = this.stats.hearts;
    return true;
  }

  /** Centre x of the spike the player is standing in, or null. */
  private spikeContactX(): number | null {
    const p = this.player;
    const c0 = Math.floor(p.x / TILE);
    const c1 = Math.floor((p.x + p.w - 1) / TILE);
    const r0 = Math.floor(p.y / TILE);
    const r1 = Math.floor((p.y + p.h - 1) / TILE);

    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (this.level.at(col, row) !== SPIKE) continue;
        if (overlaps(p, tileBox({ col, row }, 6))) return col * TILE + TILE / 2;
      }
    }
    return null;
  }

  /**
   * Smooth camera. It eases toward the player with a frame-rate independent
   * lerp and looks a little way ahead of the direction of travel. The target
   * is clamped to the level bounds, so the view never leaves the map and
   * never flips forward by a whole screen the way the original did.
   */
  private updateCamera(dt: number) {
    this.camX = approach(this.camX, this.cameraTarget(), CAMERA.lerp, dt);
  }

  private cameraTarget() {
    const p = this.player;
    const wanted = p.x + p.w / 2 + CAMERA.lookahead * p.facing - VIEW_W / 2;
    return clamp(wanted, 0, Math.max(0, this.level.widthPx - VIEW_W));
  }

  /** Jump the camera straight to the target, for level loads and respawns. */
  private snapCamera() {
    this.camX = this.cameraTarget();
    this.prevCamX = this.camX;
  }

  private draw(alpha: number) {
    const camX = lerp(this.prevCamX, this.camX, alpha);
    const ctx = this.ctx;
    const level = this.level;

    ctx.save();
    if (this.shake > 0.15) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
    }

    drawBackdrop(ctx, camX, this.clock);
    drawTiles(ctx, level, camX, this.broken);

    level.checkpoints.forEach((cell, i) => {
      drawCheckpoint(
        ctx,
        cell.col * TILE - camX,
        cell.row * TILE,
        this.activeCheckpoint === i,
        this.clock,
      );
    });

    if (level.door) {
      drawDoor(
        ctx,
        level.door.col * TILE - camX,
        level.door.row * TILE,
        this.hasKey,
        this.clock,
      );
    }

    level.gems.forEach((cell, i) => {
      if (this.gemsTaken[i]) return;
      drawGem(ctx, cell.col * TILE - camX, cell.row * TILE, this.clock);
    });

    if (level.key && !this.hasKey) {
      drawKey(ctx, level.key.col * TILE - camX, level.key.row * TILE, this.clock);
    }

    if (!this.gunTaken) {
      for (const cell of level.guns) {
        drawGunPickup(ctx, cell.col * TILE - camX, cell.row * TILE, this.clock);
      }
    }

    if (!this.jetpackTaken) {
      for (const cell of level.jetpacks) {
        drawJetpackPickup(ctx, cell.col * TILE - camX, cell.row * TILE, this.clock);
      }
    }

    level.fuels.forEach((cell, i) => {
      drawFuel(
        ctx,
        cell.col * TILE - camX,
        cell.row * TILE,
        this.clock,
        this.fuelTimers[i] <= 0,
      );
    });

    for (const turret of this.turrets) drawTurret(ctx, turret, camX, this.clock);
    for (const enemy of this.enemies) drawEnemy(ctx, enemy, alpha, camX, this.clock);
    for (const bullet of this.bullets) drawBullet(ctx, bullet, alpha, camX);

    drawPlayer(ctx, this.player, alpha, camX, {
      character: CHARACTERS[this.characterId],
      hasGun: this.hasGun,
      hasJetpack: this.hasJetpack,
      thrusting: this.thrusting,
      sinceShot: WEAPON.cooldown - this.shotTimer,
      invulnerable: this.invuln > 0,
      maxSpeed: this.stats.maxSpeed,
    }, this.clock);

    if (this.hasJetpack && !this.player.grounded) {
      drawFuelPip(ctx, this.player, alpha, camX, this.fuel);
    }

    drawParticles(ctx, this.particles, camX);
    ctx.restore();

    drawVignette(ctx);
    drawHitFlash(ctx, this.hitFlash);
  }

  private snapshot(): Snapshot {
    return {
      mode: this.mode,
      levelIndex: this.levelIndex,
      levelName: this.level.data.name,
      levelCount: LEVELS.length,
      characterId: this.characterId,
      hearts: this.hearts,
      maxHearts: this.stats.hearts,
      gems: this.gemsTaken.filter(Boolean).length,
      gemsTotal: this.level.gems.length,
      hasKey: this.hasKey,
      hasGun: this.hasGun,
      ammo: this.ammo,
      maxAmmo: WEAPON.maxAmmo,
      hasJetpack: this.hasJetpack,
      fuel: this.hasJetpack ? this.fuel / JETPACK.maxFuel : 0,
      time: this.elapsed,
      toast: this.toast,
      hint: this.hint,
    };
  }

  /** Push to React only when something visible actually changed. */
  private publish(force = false) {
    const snapshot = this.snapshot();
    const signature = [
      snapshot.mode,
      snapshot.levelIndex,
      snapshot.characterId,
      snapshot.hearts,
      snapshot.gems,
      snapshot.hasKey,
      snapshot.hasGun,
      snapshot.ammo,
      snapshot.hasJetpack,
      // One decimal is exactly the resolution of the HUD fuel bar, which
      // keeps a long burn from re-rendering React on every frame.
      snapshot.fuel.toFixed(1),
      snapshot.time.toFixed(1),
      snapshot.toast ?? "",
      snapshot.hint ?? "",
    ].join("|");
    if (!force && signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.options.onSnapshot(snapshot);
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
