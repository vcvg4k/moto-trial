/* ==========================================================================
   Zoomy Moto! — Cross-Browser Web Audio Procedural Sound & Music Engine
   ========================================================================== */
(function () {
  'use strict';

  window.Zoomy = window.Zoomy || {};

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.sfxEnabled = true;
      this.musicEnabled = true;
      this.unlocked = false;

      // Engine synth nodes
      this.engineOsc = null;
      this.engineSub = null;
      this.engineFilter = null;
      this.engineGain = null;
      this.engineActive = false;

      // Gentle background toy marimba sequencer
      this.musicTimer = null;
      this.musicStep = 0;
      this.lastBrakeSfxTime = 0;

      this._bindUnlockEvents();
    }

    _bindUnlockEvents() {
      const unlock = () => {
        this.ensureContext();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        if (this.ctx && this.ctx.state === 'running') {
          this.unlocked = true;
        }
      };
      ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((evt) => {
        window.addEventListener(evt, unlock, { passive: true });
      });
    }

    ensureContext() {
      if (this.ctx) return true;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      try {
        this.ctx = new AudioCtx();
        this._setupEngineNodes();
        this._startMusicLoop();
        return true;
      } catch (e) {
        return false;
      }
    }

    _setupEngineNodes() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      this.engineOsc = this.ctx.createOscillator();
      this.engineSub = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineSub.type = 'triangle';
      this.engineOsc.frequency.setValueAtTime(65, now);
      this.engineSub.frequency.setValueAtTime(32.5, now);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(240, now);
      this.engineFilter.Q.setValueAtTime(2.0, now);

      this.engineGain.gain.setValueAtTime(0.0001, now);

      this.engineOsc.connect(this.engineFilter);
      this.engineSub.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start(now);
      this.engineSub.start(now);
    }

    updateEngine(speedRatio, isAccelerating, isBraking, isPlaying) {
      if (!this.ctx || !this.engineGain) return;
      const now = this.ctx.currentTime;

      if (!this.sfxEnabled || !isPlaying) {
        this.engineGain.gain.setTargetAtTime(0.0001, now, 0.06);
        return;
      }

      const clamped = Math.max(0, Math.min(1.15, speedRatio));
      // Playful toy engine pitch clearly communicates speed!
      const throttleBoost = isAccelerating ? 16 : (isBraking ? -8 : 0);
      const baseFreq = 58 + clamped * 135 + throttleBoost;
      const filterFreq = 210 + clamped * 680 + (isAccelerating ? 140 : 0);
      const targetVol = 0.032 + clamped * 0.045 + (isAccelerating ? 0.018 : 0);

      this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);
      this.engineGain.gain.setTargetAtTime(targetVol, now, 0.05);

      if (isBraking && clamped > 0.28 && now - this.lastBrakeSfxTime > 0.28) {
        this.lastBrakeSfxTime = now;
        this.playBrakeScrub();
      }
    }

    silenceEngine() {
      if (!this.ctx || !this.engineGain) return;
      this.engineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    }

    toggleSfx() {
      this.ensureContext();
      this.sfxEnabled = !this.sfxEnabled;
      if (!this.sfxEnabled) this.silenceEngine();
      else this.playClick();
      return this.sfxEnabled;
    }

    toggleMusic() {
      this.ensureContext();
      this.musicEnabled = !this.musicEnabled;
      if (this.sfxEnabled) this.playClick();
      return this.musicEnabled;
    }

    _tone(freq, endFreq, duration, type, gainVal, delay = 0) {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (endFreq && endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);
      }
      gain.gain.setValueAtTime(gainVal, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    }

    playClick() {
      this._tone(520, 760, 0.07, 'sine', 0.11);
    }

    playJump(speedRatio) {
      const pitch = 240 + Math.min(1, speedRatio) * 200;
      this._tone(pitch, pitch * 1.65, 0.19, 'sine', 0.12);
    }

    playLand(intensity = 0.5) {
      const v = Math.min(1, Math.max(0.2, intensity));
      this._tone(135, 58, 0.12, 'triangle', 0.14 * v);
      this._tone(210, 290, 0.09, 'sine', 0.06 * v, 0.04);
    }

    playBrakeScrub() {
      this._tone(190, 120, 0.11, 'triangle', 0.05);
    }

    playBreakProp() {
      // Toy wooden block pop!
      const base = 360 + Math.random() * 140;
      this._tone(base, base * 0.65, 0.09, 'triangle', 0.13);
      this._tone(base * 1.4, base * 1.1, 0.07, 'sine', 0.09, 0.03);
    }

    playSplash() {
      // Bubbly water bloops + rubber ducky squeak!
      [280, 390, 510, 440, 620].forEach((f, i) => {
        this._tone(f, f * 1.45, 0.09, 'sine', 0.12, i * 0.055);
      });
      // Cute ducky squeak
      this._tone(880, 1080, 0.08, 'triangle', 0.09, 0.30);
      this._tone(920, 760, 0.10, 'triangle', 0.09, 0.40);
    }

    playFoamPoof() {
      // Bouncy plush foam pit pops
      [220, 330, 275, 400].forEach((f, i) => {
        this._tone(f, f * 0.75, 0.12, 'sine', 0.13, i * 0.06);
      });
    }

    playBonk() {
      // Silly cartoon spring boing
      this._tone(180, 420, 0.16, 'sine', 0.15);
      this._tone(420, 230, 0.18, 'triangle', 0.12, 0.12);
    }

    playCheckpoint() {
      this._tone(523.25, 523.25, 0.12, 'triangle', 0.13, 0);
      this._tone(659.25, 659.25, 0.14, 'triangle', 0.13, 0.09);
      this._tone(783.99, 783.99, 0.22, 'sine', 0.15, 0.18);
    }

    playPraise() {
      [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
        this._tone(n, n, 0.14, 'sine', 0.10, idx * 0.055);
      });
    }

    playWin() {
      const notes = [
        { f: 523.25, d: 0.13, t: 0.00 },
        { f: 659.25, d: 0.13, t: 0.11 },
        { f: 783.99, d: 0.13, t: 0.22 },
        { f: 1046.5, d: 0.36, t: 0.34 },
        { f: 783.99, d: 0.12, t: 0.52 },
        { f: 1046.5, d: 0.48, t: 0.65 }
      ];
      notes.forEach((n) => {
        this._tone(n.f, n.f, n.d, 'triangle', 0.16, n.t);
        this._tone(n.f * 0.5, n.f * 0.5, n.d, 'sine', 0.10, n.t);
      });
    }

    _startMusicLoop() {
      if (this.musicTimer) return;
      // Cheerful pentatonic marimba notes (C major pentatonic)
      const melody = [
        523.25, 659.25, 783.99, 659.25,
        880.00, 783.99, 659.25, 587.33,
        523.25, 587.33, 659.25, 783.99,
        659.25, 587.33, 523.25, 0
      ];
      this.musicTimer = setInterval(() => {
        if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
        if (document.hidden) return;
        const freq = melody[this.musicStep % melody.length];
        this.musicStep++;
        if (freq > 0) {
          const t0 = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t0);
          gain.gain.setValueAtTime(0.026, t0);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.26);
        }
      }, 290);
    }
  }

  window.Zoomy.Audio = new AudioEngine();
})();
