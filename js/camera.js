/* ==========================================================================
   Zoomy Moto! — Predictive Look-Ahead & Aspect-Safe Camera System
   ========================================================================== */
(function () {
  'use strict';

  window.Zoomy = window.Zoomy || {};

  class Camera {
    constructor() {
      this.x = 400;
      this.y = 400;
      this.zoom = 1.0;
      this.baseScale = 1.0;
      this.viewW = 1280;
      this.viewH = 720;

      // Editor manual pan support
      this.editorMode = false;
    }

    resize(screenW, screenH) {
      this.viewW = Math.max(320, screenW);
      this.viewH = Math.max(240, screenH);
      // Guarantee at least ~1200px of horizontal world visibility on any aspect ratio!
      const scaleX = this.viewW / 1220;
      const scaleY = this.viewH / 690;
      this.baseScale = Math.min(scaleX, scaleY);
      this.baseScale = Math.max(0.32, Math.min(1.6, this.baseScale));
    }

    snapToBike(bike, level) {
      this.zoom = this._computeTargetZoom(bike, level);
      const effScale = this.baseScale * this.zoom;
      const worldVisW = this.viewW / effScale;
      // Place bike at ~25% from left edge so 75% of screen shows upcoming obstacles!
      this.x = bike.x + worldVisW * 0.24;
      this.y = bike.y - 35;
    }

    _computeTargetZoom(bike, level) {
      let z = 0.96;
      const spdRatio = Math.min(1, Math.abs(bike.vx || bike.speed) / 650);
      z -= spdRatio * 0.08;
      if (!bike.grounded) z -= 0.04;

      if (level && level.cameraZones) {
        for (let i = 0; i < level.cameraZones.length; i++) {
          const cz = level.cameraZones[i];
          if (bike.x >= cz.xStart && bike.x <= cz.xEnd) {
            z = Math.min(z, cz.zoom || 0.82);
          }
        }
      }
      return Math.max(0.70, Math.min(1.05, z));
    }

    update(bike, level, dt) {
      if (this.editorMode) return;

      const targetZoom = this._computeTargetZoom(bike, level);
      this.zoom += (targetZoom - this.zoom) * Math.min(1, dt * 3.2);

      const effScale = this.baseScale * this.zoom;
      const worldVisW = this.viewW / effScale;

      const velLookAhead = Math.max(0, (bike.vx || bike.speed)) * 0.22;
      const targetX = Math.max(worldVisW * 0.44, bike.x + worldVisW * 0.23 + velLookAhead);
      const targetY = Math.min(485, Math.max(240, bike.y - 38));

      this.x += (targetX - this.x) * Math.min(1, dt * 6.5);
      this.y += (targetY - this.y) * Math.min(1, dt * 5.0);
    }

    applyTransform(ctx) {
      const s = this.baseScale * this.zoom;
      ctx.translate(this.viewW * 0.5, this.viewH * 0.5);
      ctx.scale(s, s);
      ctx.translate(-this.x, -this.y);
    }

    screenToWorld(sx, sy) {
      const s = this.baseScale * this.zoom;
      return {
        x: (sx - this.viewW * 0.5) / s + this.x,
        y: (sy - this.viewH * 0.5) / s + this.y
      };
    }

    getWorldBounds() {
      const s = this.baseScale * this.zoom;
      const halfW = (this.viewW * 0.5) / s;
      const halfH = (this.viewH * 0.5) / s;
      return {
        left: this.x - halfW - 120,
        right: this.x + halfW + 120,
        top: this.y - halfH - 120,
        bottom: this.y + halfH + 120
      };
    }
  }

  window.Zoomy.Camera = new Camera();
})();
