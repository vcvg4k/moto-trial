/* ==========================================================================
   Zoomy Moto! — Cross-Browser Keyboard, Multi-Touch & Gamepad Input
   ========================================================================== */
(function () {
  'use strict';

  window.Zoomy = window.Zoomy || {};

  class InputManager {
    constructor() {
      this.keys = new Set();
      this.accelPointers = new Set();
      this.brakePointers = new Set();

      this.accelerate = false;
      this.brake = false;

      // One-shot triggers
      this.retryPressed = false;
      this.toggleDebugPressed = false;
      this.toggleEditorPressed = false;
      this._prevGamepadRetry = false;

      this.accelBtn = null;
      this.brakeBtn = null;
    }

    init() {
      this.accelBtn = document.getElementById('pedal-accel');
      this.brakeBtn = document.getElementById('pedal-brake');

      this._bindKeyboard();
      this._bindPedal(this.accelBtn, this.accelPointers);
      this._bindPedal(this.brakeBtn, this.brakePointers);
      this._bindCanvasCornerZones();

      window.addEventListener('blur', () => this.resetAll());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.resetAll();
      });
    }

    resetAll() {
      this.keys.clear();
      this.accelPointers.clear();
      this.brakePointers.clear();
      this.accelerate = false;
      this.brake = false;
      this._syncButtonVisuals();
    }

    _bindKeyboard() {
      window.addEventListener('keydown', (e) => {
        // Ignore if typing in an import prompt or form input
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

        const code = e.code;
        if (
          code === 'ArrowRight' || code === 'KeyD' || code === 'Space' ||
          code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowDown' || code === 'KeyS'
        ) {
          e.preventDefault();
          this.keys.add(code);
        } else if (code === 'KeyR') {
          if (!e.repeat) this.retryPressed = true;
        } else if (code === 'F1') {
          e.preventDefault();
          if (!e.repeat) this.toggleDebugPressed = true;
        } else if (code === 'F2') {
          e.preventDefault();
          if (!e.repeat) this.toggleEditorPressed = true;
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });
    }

    _bindPedal(btn, pointerSet) {
      if (!btn) return;

      btn.addEventListener('contextmenu', (e) => e.preventDefault());

      if (window.PointerEvent) {
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          pointerSet.add(e.pointerId);
          try { btn.setPointerCapture(e.pointerId); } catch (_) {}
          this._syncButtonVisuals();
        });

        const release = (e) => {
          pointerSet.delete(e.pointerId);
          this._syncButtonVisuals();
        };
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('lostpointercapture', release);
      } else {
        // Fallback for older browsers without PointerEvent
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          for (let i = 0; i < e.changedTouches.length; i++) {
            pointerSet.add('t' + e.changedTouches[i].identifier);
          }
          this._syncButtonVisuals();
        }, { passive: false });

        const touchEnd = (e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            pointerSet.delete('t' + e.changedTouches[i].identifier);
          }
          this._syncButtonVisuals();
        };
        btn.addEventListener('touchend', touchEnd);
        btn.addEventListener('touchcancel', touchEnd);

        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          pointerSet.add('mouse');
          this._syncButtonVisuals();
        });
        window.addEventListener('mouseup', () => {
          pointerSet.delete('mouse');
          this._syncButtonVisuals();
        });
      }
    }

    _bindCanvasCornerZones() {
      // Forgiving touch hit-zones around bottom corners for small hands on touchscreens!
      const canvas = document.getElementById('game-canvas');
      if (!canvas || !window.PointerEvent) return;

      canvas.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Bottom 45% of screen: left 36% = Brake, right 36% = Accelerate
        if (e.clientY > h * 0.55) {
          if (e.clientX < w * 0.36) {
            this.brakePointers.add('c_' + e.pointerId);
            this._syncButtonVisuals();
          } else if (e.clientX > w * 0.64) {
            this.accelPointers.add('c_' + e.pointerId);
            this._syncButtonVisuals();
          }
        }
      });

      const releaseCanvasTouch = (e) => {
        this.brakePointers.delete('c_' + e.pointerId);
        this.accelPointers.delete('c_' + e.pointerId);
        this._syncButtonVisuals();
      };
      window.addEventListener('pointerup', releaseCanvasTouch);
      window.addEventListener('pointercancel', releaseCanvasTouch);
    }

    _pollGamepad() {
      let gpAccel = false;
      let gpBrake = false;
      let gpRetry = false;

      if (navigator.getGamepads) {
        try {
          const pads = navigator.getGamepads();
          for (let i = 0; i < pads.length; i++) {
            const gp = pads[i];
            if (!gp || !gp.connected) continue;

            const b = gp.buttons;
            // Primary accelerate: A (0), R2/RT (7), R1 (5), D-Pad Right (15)
            if (
              (b[0] && b[0].pressed) ||
              (b[7] && (b[7].pressed || b[7].value > 0.2)) ||
              (b[5] && b[5].pressed) ||
              (b[15] && b[15].pressed) ||
              (gp.axes && gp.axes[0] > 0.4)
            ) {
              gpAccel = true;
            }

            // Secondary brake: B (1), X (2), L2/LT (6), L1 (4), D-Pad Left (14)
            if (
              (b[1] && b[1].pressed) ||
              (b[2] && b[2].pressed) ||
              (b[6] && (b[6].pressed || b[6].value > 0.2)) ||
              (b[4] && b[4].pressed) ||
              (b[14] && b[14].pressed) ||
              (gp.axes && gp.axes[0] < -0.4)
            ) {
              gpBrake = true;
            }

            // Y / Triangle (3) for quick retry
            if (b[3] && b[3].pressed) {
              gpRetry = true;
            }
          }
        } catch (_) {}
      }

      if (gpRetry && !this._prevGamepadRetry) {
        this.retryPressed = true;
      }
      this._prevGamepadRetry = gpRetry;

      return { gpAccel, gpBrake };
    }

    update() {
      const keyAccel =
        this.keys.has('ArrowRight') ||
        this.keys.has('KeyD') ||
        this.keys.has('Space');

      const keyBrake =
        this.keys.has('ArrowLeft') ||
        this.keys.has('KeyA') ||
        this.keys.has('ArrowDown') ||
        this.keys.has('KeyS');

      const { gpAccel, gpBrake } = this._pollGamepad();

      this.accelerate = keyAccel || gpAccel || this.accelPointers.size > 0;
      this.brake = keyBrake || gpBrake || this.brakePointers.size > 0;

      // If both pressed simultaneously, Brake wins slightly so child can always slow down safely!
      if (this.brake && this.accelerate && this.brakePointers.size > 0 && this.accelPointers.size > 0) {
        this.accelerate = false;
      }

      this._syncButtonVisuals();
    }

    _syncButtonVisuals() {
      if (this.accelBtn) {
        this.accelBtn.classList.toggle('pressed', this.accelerate || this.accelPointers.size > 0);
      }
      if (this.brakeBtn) {
        this.brakeBtn.classList.toggle('pressed', this.brake || this.brakePointers.size > 0);
      }
    }

    consumeOneShots() {
      const out = {
        retry: this.retryPressed,
        toggleDebug: this.toggleDebugPressed,
        toggleEditor: this.toggleEditorPressed
      };
      this.retryPressed = false;
      this.toggleDebugPressed = false;
      this.toggleEditorPressed = false;
      return out;
    }
  }

  window.Zoomy.Input = new InputManager();
})();
