/* ==========================================================================
   Zoomy Moto! — Main Game State Machine, UI Controller & Fixed-Step Loop
   ========================================================================== */
(function () {
  'use strict';

  window.Zoomy = window.Zoomy || {};

  const SAVE_KEY = 'zoomy_moto_progress_v1';

  class GameApp {
    constructor() {
      this.canvas = null;
      this.ctx = null;

      // States: 'TITLE' | 'LEVELS' | 'PLAYING' | 'CELEBRATION'
      this.state = 'TITLE';
      this.currentLevelIndex = 0;
      this.level = null;

      // Run metrics (for forgiving 1-3 stars)
      this.runTime = 0;
      this.runRetries = 0;
      this.activeCheckpoint = null;

      // Persistent progress (all 5 prototype levels accessible or unlocked progressively;
      // unlock Level 1 at start + unlock next on finish, and allow playing any level in prototype!)
      this.progress = this._loadProgress();

      this.lastFrameTime = 0;
      this.accumulator = 0;
      this.finishCelebrationTimer = 0;
    }

    init() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');

      window.Zoomy.Input.init();
      window.Zoomy.DebugEditor.init(this.canvas, window.Zoomy.Camera, {
        onRequestPlaytest: () => this.restartFromStart(false),
        getCurrentLevel: () => this.level,
        replaceCurrentLevel: (lvlData) => {
          this.level = lvlData;
          this.restartFromStart(false);
        }
      });

      this._bindUIButtons();
      this._handleResize();
      window.addEventListener('resize', () => this._handleResize());
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this._handleResize(), 120);
      });

      // Load Level 1 in background for cheerful animated Title Screen!
      this.loadLevel(0, false);
      this._setState('TITLE');

      this.lastFrameTime = performance.now();
      requestAnimationFrame((ts) => this._loop(ts));
    }

    _loadProgress() {
      const def = { stars: {} };
      try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.stars === 'object') return parsed;
        }
      } catch (_) {}
      return def;
    }

    _saveProgress() {
      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.progress));
      } catch (_) {}
    }

    _handleResize() {
      if (!this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      window.Zoomy.Camera.resize(w, h);
    }

    _bindUIButtons() {
      const Audio = window.Zoomy.Audio;

      const onClick = (id, fn) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', (e) => {
          e.preventDefault();
          Audio.ensureContext();
          Audio.playClick();
          fn();
        });
      };

      onClick('btn-play', () => {
        this.loadLevel(this.currentLevelIndex, true);
        this._setState('PLAYING');
      });

      onClick('btn-open-levels', () => {
        this._populateLevelGrid();
        this._setState('LEVELS');
      });

      onClick('btn-title-audio', () => {
        const on = Audio.toggleSfx();
        Audio.musicEnabled = on;
        this._syncAudioIcons();
      });

      onClick('btn-levels-back', () => {
        this._setState('TITLE');
      });

      onClick('btn-hud-levels', () => {
        this._populateLevelGrid();
        this._setState('LEVELS');
      });

      onClick('btn-hud-retry', () => {
        this.respawnAtCheckpointOrStart();
      });

      onClick('btn-hud-sfx', () => {
        Audio.toggleSfx();
        this._syncAudioIcons();
      });

      onClick('btn-hud-music', () => {
        Audio.toggleMusic();
        this._syncAudioIcons();
      });

      onClick('btn-finish-levels', () => {
        this._populateLevelGrid();
        this._setState('LEVELS');
      });

      onClick('btn-finish-retry', () => {
        this.loadLevel(this.currentLevelIndex, true);
        this._setState('PLAYING');
      });

      onClick('btn-finish-next', () => {
        const nextIdx = (this.currentLevelIndex + 1) % window.Zoomy.Levels.count;
        this.loadLevel(nextIdx, true);
        this._setState('PLAYING');
      });

      this._syncAudioIcons();
    }

    _syncAudioIcons() {
      const Audio = window.Zoomy.Audio;
      const sfxEl = document.getElementById('icon-sfx');
      const musEl = document.getElementById('icon-music');
      const titleAud = document.getElementById('icon-title-audio');
      if (sfxEl) sfxEl.textContent = Audio.sfxEnabled ? '🔊' : '🔇';
      if (musEl) musEl.textContent = Audio.musicEnabled ? '🎵' : '🔕';
      if (titleAud) titleAud.textContent = Audio.sfxEnabled ? '🔊' : '🔇';
    }

    _populateLevelGrid() {
      const grid = document.getElementById('level-grid');
      if (!grid) return;
      grid.innerHTML = '';

      const rawLevels = window.Zoomy.Levels.getRawList();
      rawLevels.forEach((lvl, idx) => {
        const tile = document.createElement('button');
        tile.className = 'level-tile';
        tile.setAttribute('aria-label', `Level ${lvl.id}: ${lvl.name}`);

        const earned = this.progress.stars[lvl.id] || 0;
        let starsHtml = '';
        for (let s = 1; s <= 3; s++) {
          starsHtml += `<span class="${s <= earned ? 'earned' : ''}">★</span>`;
        }

        tile.innerHTML = `
          <div class="level-tile-num">${lvl.id}</div>
          <div class="level-tile-icon">${lvl.icon || '🏍️'}</div>
          <div class="level-tile-stars">${starsHtml}</div>
        `;

        tile.addEventListener('click', () => {
          window.Zoomy.Audio.ensureContext();
          window.Zoomy.Audio.playClick();
          this.loadLevel(idx, true);
          this._setState('PLAYING');
        });

        grid.appendChild(tile);
      });
    }

    _setState(newState) {
      this.state = newState;
      window.Zoomy.Input.resetAll();

      const show = (id, cond) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !cond);
      };

      show('screen-title', newState === 'TITLE');
      show('screen-levels', newState === 'LEVELS');
      show('screen-finish', newState === 'CELEBRATION');
      show('hud', newState === 'PLAYING');
      show('touch-controls', newState === 'PLAYING');

      if (newState !== 'PLAYING') {
        window.Zoomy.Audio.silenceEngine();
      }
    }

    loadLevel(index, resetMetrics = true) {
      this.currentLevelIndex = Math.max(0, Math.min(window.Zoomy.Levels.count - 1, index));
      this.level = window.Zoomy.Levels.getLevelClone(this.currentLevelIndex);
      this.activeCheckpoint = null;

      if (resetMetrics) {
        this.runTime = 0;
        this.runRetries = 0;
      }

      const numEl = document.getElementById('hud-level-num');
      if (numEl) numEl.textContent = String(this.level.id);

      this.restartFromStart(false);
    }

    restartFromStart(countAsRetry = false) {
      if (!this.level) return;
      if (countAsRetry) this.runRetries++;
      window.Zoomy.Renderer.clearEffects();
      window.Zoomy.Physics.spawnBike(this.level.start.x, this.level.start.y);
      window.Zoomy.Camera.snapToBike(window.Zoomy.Physics.bike, this.level);
    }

    respawnAtCheckpointOrStart() {
      if (!this.level) return;
      this.runRetries++;
      // Restore unbroken breakables ahead of respawn for repeated fun!
      const spawnX = this.activeCheckpoint ? this.activeCheckpoint.x : this.level.start.x;
      const spawnY = this.activeCheckpoint ? this.activeCheckpoint.y : this.level.start.y;
      (this.level.breakables || []).forEach((b) => {
        if (b.x > spawnX + 40) b.broken = false;
      });

      window.Zoomy.Physics.spawnBike(spawnX, spawnY);
      window.Zoomy.Camera.snapToBike(window.Zoomy.Physics.bike, this.level);
    }

    // -----------------------------------------------------------------------
    // Main Frame Loop (Fixed 60Hz Physics + Smooth Render)
    // -----------------------------------------------------------------------
    _loop(timestamp) {
      const rawDt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastFrameTime) / 1000));
      this.lastFrameTime = timestamp;

      const Input = window.Zoomy.Input;
      const Physics = window.Zoomy.Physics;
      const Camera = window.Zoomy.Camera;
      const Renderer = window.Zoomy.Renderer;
      const Audio = window.Zoomy.Audio;
      const DebugEditor = window.Zoomy.DebugEditor;

      DebugEditor.recordFrame(rawDt);
      Input.update();
      const oneShots = Input.consumeOneShots();

      if (oneShots.toggleDebug) DebugEditor.toggleDebug();
      if (oneShots.toggleEditor) DebugEditor.toggleEditor();
      if (oneShots.retry && this.state === 'PLAYING') {
        this.respawnAtCheckpointOrStart();
      }

      const fixedDt = Physics.constants.DT;
      this.accumulator += rawDt;

      while (this.accumulator >= fixedDt) {
        this._fixedStep(fixedDt);
        this.accumulator -= fixedDt;
      }

      // UpdateHUD & Audio
      const bike = Physics.bike;
      if (this.state === 'PLAYING' && !DebugEditor.editorActive) {
        this._updateHUD(bike);
        const speedRatio = Math.abs(bike.speed) / Physics.constants.MAX_SPEED;
        Audio.updateEngine(speedRatio, Input.accelerate, Input.brake, !bike.failed && !bike.finished);
      } else {
        Audio.silenceEngine();
      }

      // Render Scene
      Renderer.render(
        this.ctx,
        Camera,
        this.level,
        bike,
        this.state === 'PLAYING' ? Input : { accelerate: this.state === 'TITLE', brake: false },
        DebugEditor
      );

      requestAnimationFrame((ts) => this._loop(ts));
    }

    _fixedStep(dt) {
      const Input = window.Zoomy.Input;
      const Physics = window.Zoomy.Physics;
      const Camera = window.Zoomy.Camera;
      const Renderer = window.Zoomy.Renderer;
      const DebugEditor = window.Zoomy.DebugEditor;

      if (DebugEditor.editorActive) {
        Renderer.updateEffects(dt, null, null);
        return;
      }

      // Cheerful gentle demo ride in background on Title Screen!
      if (this.state === 'TITLE') {
        const demoInput = { accelerate: Physics.bike.speed < 340, brake: false };
        Physics.step(this.level, demoInput, dt);
        Physics.consumeEvents();
        if (Physics.bike.x > this.level.finish.x - 250 || Physics.bike.failed) {
          Physics.spawnBike(this.level.start.x, this.level.start.y);
          Camera.snapToBike(Physics.bike, this.level);
        }
        Camera.update(Physics.bike, this.level, dt);
        Renderer.updateEffects(dt, Physics.bike, demoInput);
        return;
      }

      if (this.state !== 'PLAYING' && this.state !== 'CELEBRATION') {
        Renderer.updateEffects(dt, null, null);
        return;
      }

      if (this.state === 'PLAYING' && !Physics.bike.finished && !Physics.bike.failed) {
        this.runTime += dt;
      }

      Physics.step(this.level, Input, dt);
      this._processPhysicsEvents(Physics.consumeEvents());

      // Fast, painless retry (~0.95s after comical splash or foam bounce!)
      if (this.state === 'PLAYING' && Physics.bike.failed && Physics.bike.failTimer >= 0.95) {
        this.respawnAtCheckpointOrStart();
      }

      // Delay modal popup slightly after crossing finish banner so child enjoys confetti & rider cheering!
      if (this.state === 'PLAYING' && Physics.bike.finished) {
        this.finishCelebrationTimer += dt;
        if (this.finishCelebrationTimer >= 0.95) {
          this._openFinishModal();
        }
      }

      Camera.update(Physics.bike, this.level, dt);
      Renderer.updateEffects(dt, Physics.bike, Input);
    }

    _processPhysicsEvents(events) {
      const Audio = window.Zoomy.Audio;
      const Renderer = window.Zoomy.Renderer;

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.type === 'jump') {
          Audio.playJump(ev.speedRatio);
        } else if (ev.type === 'land') {
          Audio.playLand(ev.intensity);
          Renderer.spawnLandingDust(ev.x, ev.y, ev.intensity);
        } else if (ev.type === 'praise') {
          Audio.playPraise();
          Renderer.spawnPraisePopup(ev.x, ev.y, ev.label, '#ffb300');
        } else if (ev.type === 'break') {
          Audio.playBreakProp();
          Renderer.spawnPropDebris(ev.x, ev.y, ev.propType, ev.vx);
        } else if (ev.type === 'checkpoint') {
          this.activeCheckpoint = { x: ev.x, y: ev.y };
          Audio.playCheckpoint();
          Renderer.spawnCheckpointBurst(ev.x, ev.y);
          Renderer.spawnPraisePopup(ev.x, ev.y - 105, '★', '#4cd964');
        } else if (ev.type === 'bonk') {
          Audio.playBonk();
          Renderer.spawnBonkStars(ev.x, ev.y);
        } else if (ev.type === 'fail') {
          if (ev.failType === 'foam') {
            Audio.playFoamPoof();
            Renderer.spawnFoamExplosion(ev.x, ev.y);
          } else {
            Audio.playSplash();
            Renderer.spawnSplash(ev.x, ev.y, ev.failType);
          }
        } else if (ev.type === 'finish') {
          this.finishCelebrationTimer = 0;
          Audio.playWin();
          Renderer.spawnConfettiBurst(window.Zoomy.Camera.viewW);
          Renderer.spawnPraisePopup(ev.x, ev.y - 125, 'YAY!', '#4cd964');
        }
      }
    }

    _openFinishModal() {
      // Forgiving Star System (Section 16):
      // 1 star = finished! 2 stars = finished reasonably well! 3 stars = smooth run!
      let stars = 1;
      if (this.runRetries <= 3) stars = 2;
      if (this.runRetries === 0 || (this.runRetries <= 1 && this.runTime <= (this.level.starTime || 35) * 1.35)) {
        stars = 3;
      }

      const prevBest = this.progress.stars[this.level.id] || 0;
      if (stars > prevBest) {
        this.progress.stars[this.level.id] = stars;
        this._saveProgress();
      }

      const starSlots = document.querySelectorAll('#finish-stars .star-slot');
      starSlots.forEach((el, idx) => {
        el.classList.remove('earned');
        if (idx < stars) {
          setTimeout(() => el.classList.add('earned'), 160 + idx * 210);
        }
      });

      this._setState('CELEBRATION');
    }

    _updateHUD(bike) {
      // Progress bar (0..100%)
      const startX = this.level.start.x;
      const endX = this.level.finish.x;
      const pct = Math.max(0, Math.min(100, ((bike.x - startX) / Math.max(1, endX - startX)) * 100));
      const fillEl = document.getElementById('progress-fill');
      const bikeIcon = document.getElementById('progress-bike');
      if (fillEl) fillEl.style.width = pct.toFixed(1) + '%';
      if (bikeIcon) bikeIcon.style.left = pct.toFixed(1) + '%';

      // Non-numerical Visual Speed Feel Meter (6 color-coded bars)
      const ratio = Math.max(0, Math.abs(bike.speed) / window.Zoomy.Physics.constants.MAX_SPEED);
      const litCount = bike.speed > 15 ? Math.min(6, Math.ceil(ratio * 6)) : 0;
      for (let i = 1; i <= 6; i++) {
        const seg = document.getElementById('spd-seg-' + i);
        if (seg) seg.classList.toggle('active', i <= litCount);
      }
    }
  }

  // =========================================================================
  // Automated Headless Playtest Verifier (Validates Section 4 & Section 22!)
  // Can be run anytime via `window.Zoomy.verifyAllLevels()` in DevTools console
  // =========================================================================
  window.Zoomy.verifyAllLevels = function () {
    const SimClass = window.Zoomy.PhysicsClass;
    const results = [];

    function runSim(levelIdx, strategyFn, maxSeconds = 60) {
      const sim = new SimClass();
      const lvl = window.Zoomy.Levels.getLevelClone(levelIdx);
      sim.spawnBike(lvl.start.x, lvl.start.y);
      const maxSteps = maxSeconds * 60;
      for (let step = 0; step < maxSteps; step++) {
        const inp = strategyFn(sim.bike, step / 60);
        sim.step(lvl, inp, 1 / 60);
        if (sim.bike.finished) return { outcome: 'WIN', x: Math.round(sim.bike.x), time: +(step / 60).toFixed(1) };
        if (sim.bike.failed) return { outcome: 'FAIL', reason: sim.bike.failReason, x: Math.round(sim.bike.x) };
      }
      return { outcome: 'TIMEOUT', x: Math.round(sim.bike.x) };
    }

    const alwaysFast = () => ({ accelerate: true, brake: false });
    const alwaysSlow = (b) => ({ accelerate: b.speed < 250, brake: b.speed > 280 });
    const capSpeed = (b, target) => ({
      accelerate: b.speed < target - 12,
      brake: b.speed > target + 22
    });

    // Level 1: Learn Acceleration
    results.push({
      level: 1,
      holdAccelerate: runSim(0, alwaysFast)
    });

    // Level 2: Long Jump (Slow must fail, Fast must win)
    results.push({
      level: 2,
      alwaysSlow: runSim(1, alwaysSlow),
      holdAccelerate: runSim(1, alwaysFast)
    });

    // Level 3: Short Jump / Drop (Hold Accelerate MUST fail too_fast; Controlled speed must win!)
    results.push({
      level: 3,
      holdAccelerate: runSim(2, alwaysFast),
      controlledSpeed: runSim(2, (b) => {
        if ((b.x > 680 && b.x < 1080) || (b.x > 2560 && b.x < 2830)) return capSpeed(b, 330);
        return alwaysFast();
      })
    });

    // Level 4: Sequential Fast -> Brake -> Slow -> Fast
    results.push({
      level: 4,
      holdAccelerate: runSim(3, alwaysFast),
      alwaysSlow: runSim(3, alwaysSlow),
      smartCombo: runSim(3, (b) => {
        if ((b.x > 1680 && b.x < 2170) || (b.x > 3300 && b.x < 3695)) return capSpeed(b, 330);
        return alwaysFast();
      })
    });

    // Level 5: Grand Course (Hill Fast -> Cliff Slow -> Tunnel Medium -> Finale Fast)
    results.push({
      level: 5,
      holdAccelerate: runSim(4, alwaysFast),
      alwaysSlow: runSim(4, alwaysSlow),
      masteryMix: runSim(4, (b) => {
        if (b.x > 1180 && b.x < 1430) return capSpeed(b, 290); // Cliff slow
        if (b.x > 2700 && b.x < 3085) return capSpeed(b, 425); // Goldilocks tunnel medium!
        return alwaysFast();
      })
    });

    return results;
  };

  window.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
    app.init();
    window.Zoomy.App = app;
  });
})();
