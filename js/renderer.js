/* ==========================================================================
   Zoomy Moto! — Toy Playset 2D Canvas Renderer & Particle VFX System
   ========================================================================== */
(function () {
  'use strict';

  window.Zoomy = window.Zoomy || {};

  const THEMES = {
    sunny: {
      skyTop: '#56ccf2',
      skyBot: '#ccf2ff',
      hillFar: '#a8e6cf',
      hillNear: '#7ed99a',
      sunColor: '#ffe066'
    },
    backyard: {
      skyTop: '#4facfe',
      skyBot: '#d4fcff',
      hillFar: '#b8e994',
      hillNear: '#78e08f',
      sunColor: '#ffd166'
    },
    playroom: {
      skyTop: '#74b9ff',
      skyBot: '#fff6e5',
      hillFar: '#ffeaa7',
      hillNear: '#fab1a0',
      sunColor: '#ffeaa7'
    }
  };

  function roundRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  class Renderer {
    constructor() {
      this.particles = [];
      this.debris = [];
      this.popups = [];
      this.confetti = [];
      this.time = 0;
      this.exhaustTimer = 0;
    }

    clearEffects() {
      this.particles = [];
      this.debris = [];
      this.popups = [];
      this.confetti = [];
    }

    // -----------------------------------------------------------------------
    // VFX Spawners
    // -----------------------------------------------------------------------
    spawnLandingDust(x, y, intensity = 0.6) {
      const count = Math.round(6 + intensity * 8);
      for (let i = 0; i < count; i++) {
        const dir = i % 2 === 0 ? -1 : 1;
        this.particles.push({
          x: x + dir * (10 + Math.random() * 18),
          y: y - 3,
          vx: dir * (40 + Math.random() * 110 * intensity),
          vy: -(25 + Math.random() * 75 * intensity),
          r: 5 + Math.random() * 7,
          color: '#fff8e1',
          alpha: 0.85,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.25,
          gravity: 120,
          shape: 'circle'
        });
      }
    }

    spawnSplash(x, y, hazardType) {
      const isMud = hazardType === 'mud';
      const colors = isMud
        ? ['#8d6e63', '#6d4c41', '#a1887f']
        : ['#29b6f6', '#81d4fa', '#ffffff', '#4fc3f7'];
      for (let i = 0; i < 24; i++) {
        const angle = -Math.PI * (0.12 + Math.random() * 0.76);
        const spd = 110 + Math.random() * 250;
        this.particles.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          r: 5 + Math.random() * 8,
          color: colors[i % colors.length],
          alpha: 1,
          life: 0,
          maxLife: 0.55 + Math.random() * 0.35,
          gravity: 560,
          shape: 'circle'
        });
      }
    }

    spawnFoamExplosion(x, y) {
      const foamColors = ['#ff80ab', '#80d8ff', '#ffd54f', '#b9f6ca', '#ea80fc'];
      for (let i = 0; i < 26; i++) {
        const angle = -Math.PI * (0.05 + Math.random() * 0.9);
        const spd = 90 + Math.random() * 260;
        this.particles.push({
          x: x + (Math.random() - 0.5) * 40,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 40,
          r: 9 + Math.random() * 7,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 10,
          color: foamColors[i % foamColors.length],
          alpha: 1,
          life: 0,
          maxLife: 0.75 + Math.random() * 0.35,
          gravity: 440,
          shape: 'cube'
        });
      }
    }

    spawnBonkStars(x, y) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * 140,
          vy: Math.sin(a) * 140,
          r: 7,
          color: i % 2 === 0 ? '#ffd54f' : '#ff8a65',
          alpha: 1,
          life: 0,
          maxLife: 0.45,
          gravity: 80,
          shape: 'circle'
        });
      }
    }

    spawnPropDebris(x, y, propType, bikeVx) {
      const palettes = {
        boxes: ['#d7a86e', '#c68b59', '#e6be8a'],
        blocks: ['#ff5252', '#448aff', '#ffd740', '#69f0ae'],
        cone: ['#ff6d00', '#ffffff', '#ff9100']
      };
      const cols = palettes[propType] || palettes.boxes;
      const count = propType === 'cone' ? 3 : 5;

      for (let i = 0; i < count; i++) {
        this.debris.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y - i * 10,
          vx: bikeVx * (0.45 + Math.random() * 0.45) + (Math.random() - 0.2) * 90,
          vy: -(140 + Math.random() * 190),
          rot: Math.random() * 3,
          vrot: (Math.random() - 0.5) * 14,
          size: propType === 'cone' ? 16 : 20,
          color: cols[i % cols.length],
          propType,
          life: 0,
          maxLife: 1.1
        });
      }
    }

    spawnPraisePopup(x, y, text, color = '#ffca28') {
      this.popups.push({
        x,
        y,
        text,
        color,
        life: 0,
        maxLife: 0.95
      });
    }

    spawnCheckpointBurst(x, y) {
      const cols = ['#4cd964', '#ffd54f', '#4fc3f7', '#ff80ab'];
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI * Math.random();
        const s = 90 + Math.random() * 180;
        this.particles.push({
          x,
          y: y - 55,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 40,
          r: 6,
          color: cols[i % cols.length],
          alpha: 1,
          life: 0,
          maxLife: 0.65,
          gravity: 320,
          shape: 'cube'
        });
      }
    }

    spawnConfettiBurst(screenW) {
      const cols = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#ea80fc', '#ffab40'];
      for (let i = 0; i < 75; i++) {
        this.confetti.push({
          x: Math.random() * screenW,
          y: -20 - Math.random() * 180,
          vx: (Math.random() - 0.5) * 120,
          vy: 140 + Math.random() * 210,
          w: 9 + Math.random() * 7,
          h: 6 + Math.random() * 5,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 9,
          color: cols[i % cols.length]
        });
      }
    }

    updateEffects(dt, bike, input) {
      this.time += dt;

      // Exhaust puffs & tire dust while accelerating
      if (bike && !bike.failed) {
        this.exhaustTimer += dt;
        const interval = input && input.accelerate ? 0.065 : 0.16;
        if (this.exhaustTimer >= interval) {
          this.exhaustTimer = 0;
          const cos = Math.cos(bike.angle);
          const sin = Math.sin(bike.angle);
          const ex = bike.x - cos * 38 + sin * 18;
          const ey = bike.y - 18 - sin * 38 - cos * 18;
          this.particles.push({
            x: ex,
            y: ey,
            vx: -cos * (45 + (input && input.accelerate ? 55 : 15)),
            vy: -25 - Math.random() * 20,
            r: input && input.accelerate ? 6.5 : 4.5,
            color: '#ffffff',
            alpha: 0.65,
            life: 0,
            maxLife: 0.42,
            gravity: -35,
            shape: 'circle'
          });

          if (bike.grounded && input && input.accelerate && bike.speed > 120) {
            this.particles.push({
              x: bike.x - cos * 30,
              y: bike.y - 3,
              vx: -cos * 80 + (Math.random() - 0.5) * 30,
              vy: -(20 + Math.random() * 35),
              r: 4 + Math.random() * 4,
              color: '#ffe082',
              alpha: 0.7,
              life: 0,
              maxLife: 0.28,
              gravity: 140,
              shape: 'circle'
            });
          }
        }
      }

      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          this.particles.splice(i, 1);
          continue;
        }
        p.vy += (p.gravity || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.vrot) p.rot += p.vrot * dt;
      }

      // Update broken prop debris
      for (let i = this.debris.length - 1; i >= 0; i--) {
        const d = this.debris[i];
        d.life += dt;
        if (d.life >= d.maxLife) {
          this.debris.splice(i, 1);
          continue;
        }
        d.vy += 680 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rot += d.vrot * dt;
      }

      // Update praise popups
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pop = this.popups[i];
        pop.life += dt;
        pop.y -= 42 * dt;
        if (pop.life >= pop.maxLife) {
          this.popups.splice(i, 1);
        }
      }

      // Update screen-space confetti
      for (let i = this.confetti.length - 1; i >= 0; i--) {
        const c = this.confetti[i];
        c.x += c.vx * dt + Math.sin(this.time * 5 + i) * 25 * dt;
        c.y += c.vy * dt;
        c.rot += c.vrot * dt;
        if (c.y > 1400) {
          this.confetti.splice(i, 1);
        }
      }
    }

    // -----------------------------------------------------------------------
    // Main Render Pass
    // -----------------------------------------------------------------------
    render(ctx, camera, level, bike, input, debugEditor) {
      const w = camera.viewW;
      const h = camera.viewH;
      const theme = THEMES[level.theme] || THEMES.sunny;

      // 1. Sky & Parallax Toy Background
      this._drawBackground(ctx, w, h, camera, theme);

      // 2. World-Space Scene
      ctx.save();
      camera.applyTransform(ctx);
      const bounds = camera.getWorldBounds();

      // Background support pillars for elevated foam catchers (behind road & bike!)
      this._drawElevatedCatcherSupports(ctx, level, bounds);

      // Environmental non-verbal speed hints / signs
      this._drawHints(ctx, level, bounds, bike);

      // Checkpoints & Finish Banner (back layer)
      this._drawCheckpoints(ctx, level, bounds);
      this._drawFinishBack(ctx, level.finish);

      // Hazards (Duck ponds, mud puddles, elevated foam cube tubs)
      this._drawHazards(ctx, level, bounds);

      // Driveable Toy Surfaces (Roads, Hills, Ramps, Cozy Pads)
      this._drawSurfaces(ctx, level, bounds);

      // Soft Foam Ceilings / Backstops
      this._drawCeilings(ctx, level, bounds);

      // Breakable Toy Props & Debris
      this._drawBreakables(ctx, level, bounds);
      this._drawDebris(ctx);

      // Toy Motorcycle & Friendly Rider
      if (bike) {
        this._drawBikeAndRider(ctx, bike, input);
      }

      // Finish Banner Front Post & Ribbon
      this._drawFinishFront(ctx, level.finish, bike && bike.finished);

      // World Particles & Praise Popups
      this._drawParticles(ctx);
      this._drawPopups(ctx);

      // Comical Zero-Reading Failure Hint Cloud
      if (bike && bike.failed) {
        this._drawFailHintBubble(ctx, bike);
      }

      // Developer Debug Geometry / Editor Handles (hidden in production)
      if (debugEditor) {
        debugEditor.renderWorldOverlay(ctx, level, bike);
      }

      ctx.restore();

      // 3. Screen-space Confetti & Debug Telemetry
      this._drawConfetti(ctx);
      if (debugEditor) {
        debugEditor.renderScreenOverlay(ctx, level, bike);
      }
    }

    // -----------------------------------------------------------------------
    // Background & Parallax Scenery
    // -----------------------------------------------------------------------
    _drawBackground(ctx, w, h, camera, theme) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, theme.skyTop);
      grad.addColorStop(1, theme.skyBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Cheerful Sun
      const sunX = w * 0.84;
      const sunY = h * 0.16;
      ctx.save();
      ctx.translate(sunX, sunY);
      ctx.rotate(this.time * 0.18);
      ctx.fillStyle = 'rgba(255, 238, 130, 0.32)';
      for (let i = 0; i < 10; i++) {
        ctx.rotate((Math.PI * 2) / 10);
        ctx.beginPath();
        ctx.moveTo(0, -44);
        ctx.lineTo(12, -68);
        ctx.lineTo(-12, -68);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = theme.sunColor;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Fluffy Clouds (parallax 0.12)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const cloudSpan = 420;
      const cloudOffset = ((camera.x * 0.12 + this.time * 12) % cloudSpan + cloudSpan) % cloudSpan;
      for (let cx = -cloudOffset; cx < w + 220; cx += cloudSpan) {
        const cy = h * 0.18 + Math.sin(cx * 0.01) * 26;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.arc(cx + 26, cy - 10, 34, 0, Math.PI * 2);
        ctx.arc(cx + 56, cy, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distant Toy Rolling Hills (parallax 0.22)
      ctx.fillStyle = theme.hillFar;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let sx = 0; sx <= w + 60; sx += 60) {
        const wx = sx + camera.x * 0.20;
        const hy = h * 0.74 + Math.sin(wx * 0.0032) * 52 + Math.cos(wx * 0.0017) * 28;
        ctx.lineTo(sx, hy);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Closer Toy Hills + Pastel Play Blocks (parallax 0.38)
      ctx.fillStyle = theme.hillNear;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let sx = 0; sx <= w + 50; sx += 50) {
        const wx = sx + camera.x * 0.36;
        const hy = h * 0.84 + Math.sin(wx * 0.0048 + 1.4) * 38;
        ctx.lineTo(sx, hy);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    // -----------------------------------------------------------------------
    // Surfaces (Wooden Toy Blocks, Felt Turf, Boost & Slow Ramps)
    // -----------------------------------------------------------------------
    _drawSurfaces(ctx, level, bounds) {
      for (let i = 0; i < level.surfaces.length; i++) {
        const surf = level.surfaces[i];
        const pts = surf.points;
        if (!pts || pts.length < 2) continue;

        const xFirst = pts[0][0];
        const xLast = pts[pts.length - 1][0];
        if (xLast < bounds.left || xFirst > bounds.right) continue;

        const isRamp = surf.type === 'ramp';
        const depth = isRamp ? 72 : 165;

        // 1. Solid Wooden Block / Foam Wedge Body
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) {
          ctx.lineTo(pts[k][0], pts[k][1]);
        }
        const baseBottom = Math.max(pts[0][1], pts[pts.length - 1][1]) + depth;
        ctx.lineTo(xLast, baseBottom);
        ctx.lineTo(xFirst, baseBottom);
        ctx.closePath();

        if (isRamp) {
          if (surf.speedHint === 'slow') {
            ctx.fillStyle = '#4fc3f7';
          } else if (surf.speedHint === 'medium') {
            ctx.fillStyle = '#26c6da';
          } else {
            ctx.fillStyle = '#ff8f00';
          }
        } else {
          ctx.fillStyle = '#dfb178'; // Warm wooden playset block
        }
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = isRamp ? '#e65100' : '#a67644';
        ctx.stroke();

        // Decorative wooden dowels on road blocks
        if (!isRamp) {
          ctx.fillStyle = 'rgba(166, 118, 68, 0.28)';
          for (let wx = xFirst + 55; wx < xLast - 40; wx += 130) {
            const sample = window.Zoomy.Physics.sampleSurfaceAt(surf, wx);
            if (sample) {
              ctx.beginPath();
              ctx.arc(wx, sample.y + 46, 9, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // 2. Ramp Animated Chevrons (Visual Speed Communication!)
        if (isRamp) {
          this._drawRampChevrons(ctx, surf);
        }

        // 3. Top Driveable Surface Cap (Distinct, High-Contrast Silhouette!)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) {
          ctx.lineTo(pts[k][0], pts[k][1]);
        }

        // Dark under-border for crisp contrast
        ctx.lineWidth = 20;
        ctx.strokeStyle = isRamp
          ? (surf.speedHint === 'slow' ? '#0277bd' : '#d84315')
          : '#218c53';
        ctx.stroke();

        // Bright top running strip
        ctx.lineWidth = 13;
        if (isRamp) {
          ctx.strokeStyle = surf.speedHint === 'slow' ? '#fff176' : '#ffca28';
        } else {
          ctx.strokeStyle = '#4cd964';
        }
        ctx.stroke();

        // Cozy Island Landing Target Stripes (First 210px of 'island' surfaces!)
        if (surf.type === 'island') {
          ctx.beginPath();
          ctx.moveTo(pts[0][0] + 8, pts[0][1]);
          ctx.lineTo(pts[1][0] - 8, pts[1][1]);
          ctx.lineWidth = 11;
          ctx.setLineDash([18, 14]);
          ctx.strokeStyle = '#fff59d';
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Caution Slow Stripes on approach roads marked speedHint === 'slow'
        if (!isRamp && surf.speedHint === 'slow') {
          const sx0 = Math.max(xFirst + 20, xLast - 280);
          ctx.beginPath();
          ctx.moveTo(sx0, pts[pts.length - 1][1]);
          ctx.lineTo(xLast - 8, pts[pts.length - 1][1]);
          ctx.lineWidth = 11;
          ctx.setLineDash([16, 16]);
          ctx.strokeStyle = '#ffca28';
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      }
    }

    _drawRampChevrons(ctx, surf) {
      const pts = surf.points;
      const x0 = pts[0][0];
      const y0 = pts[0][1];
      const x1 = pts[pts.length - 1][0];
      const y1 = pts[pts.length - 1][1];
      const cx = (x0 + x1) * 0.5;
      const cy = (y0 + y1) * 0.5 + 24;
      const ang = Math.atan2(y1 - y0, x1 - x0);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);

      const isSlow = surf.speedHint === 'slow';
      const pulse = (this.time * (isSlow ? 1.8 : 4.5)) % 1;

      for (let i = -1; i <= 1; i++) {
        const ox = i * 28 + (isSlow ? 0 : pulse * 14);
        ctx.strokeStyle = isSlow ? '#ffffff' : '#fffde7';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (isSlow) {
          // Gentle slow vertical bars
          ctx.moveTo(ox, -10);
          ctx.lineTo(ox, 10);
        } else {
          // Fast forward chevrons >>>
          ctx.moveTo(ox - 8, -10);
          ctx.lineTo(ox + 6, 0);
          ctx.lineTo(ox - 8, 10);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // Hazards (Duck Ponds, Mud Puddles, Plush Foam Catcher Tubs)
    // -----------------------------------------------------------------------
    _drawElevatedCatcherSupports(ctx, level, bounds) {
      if (!level.hazards) return;
      for (let i = 0; i < level.hazards.length; i++) {
        const h = level.hazards[i];
        if (!h.elevated) continue;
        if (h.x + h.w < bounds.left || h.x > bounds.right) continue;

        // Cute pastel toy bridge posts clearly in background behind the underpass!
        ctx.fillStyle = 'rgba(144, 164, 174, 0.35)';
        ctx.fillRect(h.x + 14, h.y + h.h, 16, 260);
        ctx.fillRect(h.x + h.w - 30, h.y + h.h, 16, 260);
      }
    }

    _drawHazards(ctx, level, bounds) {
      if (!level.hazards) return;
      for (let i = 0; i < level.hazards.length; i++) {
        const h = level.hazards[i];
        if (h.x + h.w < bounds.left || h.x > bounds.right) continue;

        if (h.type === 'water') {
          this._drawDuckPond(ctx, h);
        } else if (h.type === 'foam') {
          this._drawFoamTub(ctx, h);
        } else {
          this._drawMudPit(ctx, h);
        }
      }
    }

    _drawDuckPond(ctx, h) {
      ctx.save();
      // Water body
      const grad = ctx.createLinearGradient(0, h.y, 0, h.y + h.h + 60);
      grad.addColorStop(0, '#29b6f6');
      grad.addColorStop(1, '#0277bd');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(h.x - 6, h.y + 8);
      for (let wx = h.x; wx <= h.x + h.w; wx += 22) {
        const wy = h.y + Math.sin(wx * 0.06 + this.time * 4.2) * 4.5;
        ctx.lineTo(wx, wy);
      }
      ctx.lineTo(h.x + h.w + 6, h.y + h.h + 80);
      ctx.lineTo(h.x - 6, h.y + h.h + 80);
      ctx.closePath();
      ctx.fill();

      // White foamy wave crest
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let wx = h.x; wx <= h.x + h.w; wx += 18) {
        const wy = h.y + Math.sin(wx * 0.06 + this.time * 4.2) * 4.5;
        if (wx === h.x) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();

      // Cute Floating Yellow Rubber Duckies!
      const duckCount = Math.max(1, Math.floor(h.w / 150));
      for (let d = 0; d < duckCount; d++) {
        const dx = h.x + (h.w / (duckCount + 1)) * (d + 1) + Math.sin(this.time * 1.6 + d * 2) * 12;
        const dy = h.y + Math.sin(dx * 0.06 + this.time * 4.2) * 4 - 4;
        this._drawRubberDucky(ctx, dx, dy);
      }
      ctx.restore();
    }

    _drawRubberDucky(ctx, x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(this.time * 3 + x * 0.02) * 0.1);
      // Body
      ctx.fillStyle = '#ffeb3b';
      ctx.strokeStyle = '#f57f17';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Head
      ctx.beginPath();
      ctx.arc(-8, -10, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Orange beak
      ctx.fillStyle = '#ff6d00';
      ctx.beginPath();
      ctx.moveTo(-14, -11);
      ctx.lineTo(-20, -9);
      ctx.lineTo(-14, -7);
      ctx.closePath();
      ctx.fill();
      // Eye
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(-10, -11.5, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    _drawFoamTub(ctx, h) {
      ctx.save();
      const foamPalette = ['#ff80ab', '#80d8ff', '#ffd54f', '#b9f6ca', '#ce93d8'];

      // Overflowing pile of colorful pastel foam cubes along the top!
      const cols = Math.floor(h.w / 26);
      for (let c = 0; c < cols; c++) {
        const fx = h.x + 14 + c * 26;
        const fy = h.y + 8 + ((c * 7) % 14);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(((c % 5) - 2) * 0.16);
        ctx.fillStyle = foamPalette[c % foamPalette.length];
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        roundRectPath(ctx, -12, -12, 24, 24, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Plush Striped Catcher Tub Container
      roundRectPath(ctx, h.x, h.y + 18, h.w, h.h - 18, 16);
      ctx.fillStyle = '#ff7043';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Cheerful soft stripes & non-verbal "Overshoot Catcher" icon on tub front
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      for (let sx = h.x + 24; sx < h.x + h.w - 30; sx += 48) {
        roundRectPath(ctx, sx, h.y + 28, 20, h.h - 38, 6);
        ctx.fill();
      }

      // Friendly visual pill in center of tub showing soft foam cubes + turtle hint
      ctx.fillStyle = '#fffdf7';
      roundRectPath(ctx, h.x + h.w * 0.5 - 46, h.y + h.h * 0.5 - 12, 92, 38, 19);
      ctx.fill();
      ctx.font = '24px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧸 🐢', h.x + h.w * 0.5, h.y + h.h * 0.5 + 8);

      ctx.restore();
    }

    _drawMudPit(ctx, h) {
      ctx.save();
      ctx.fillStyle = '#795548';
      ctx.beginPath();
      ctx.moveTo(h.x - 6, h.y + 6);
      ctx.lineTo(h.x + h.w + 6, h.y + 6);
      ctx.lineTo(h.x + h.w + 6, h.y + h.h + 70);
      ctx.lineTo(h.x - 6, h.y + h.h + 70);
      ctx.closePath();
      ctx.fill();

      // Blooping mud bubbles
      ctx.fillStyle = '#a1887f';
      for (let bx = h.x + 18; bx < h.x + h.w - 14; bx += 32) {
        const r = 5 + Math.sin(this.time * 4 + bx) * 2.5;
        ctx.beginPath();
        ctx.arc(bx, h.y + 7, Math.max(2, r), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // Soft Foam Ceilings / Backstops
    // -----------------------------------------------------------------------
    _drawCeilings(ctx, level, bounds) {
      if (!level.ceilings) return;
      for (let i = 0; i < level.ceilings.length; i++) {
        const c = level.ceilings[i];
        if (c.x + c.w < bounds.left || c.x > bounds.right) continue;

        ctx.save();
        roundRectPath(ctx, c.x, c.y, c.w, c.h, 14);
        ctx.fillStyle = '#ffca28';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Candy-cane soft cushion stripes
        ctx.fillStyle = '#29b6f6';
        for (let sy = c.y + 14; sy < c.y + c.h - 18; sy += 32) {
          roundRectPath(ctx, c.x + 5, sy, c.w - 10, 14, 5);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // -----------------------------------------------------------------------
    // Non-Verbal Environmental Signs (Zero-Reading Child UX)
    // -----------------------------------------------------------------------
    _drawHints(ctx, level, bounds, bike) {
      if (!level.hints) return;
      for (let i = 0; i < level.hints.length; i++) {
        const hint = level.hints[i];
        if (hint.x < bounds.left - 80 || hint.x > bounds.right + 80) continue;

        const x = hint.x;
        const y = hint.y;
        ctx.save();

        // Wooden signpost
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(x - 5, y - 92, 10, 92);

        const bob = Math.sin(this.time * 4.5 + i) * 3;
        ctx.translate(x, y - 112 + bob);

        if (hint.type === 'fast' || hint.type === 'go_tutorial') {
          roundRectPath(ctx, -46, -30, 92, 60, 18);
          ctx.fillStyle = '#2ecc71';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Animated triple white chevrons >>>
          const shift = (this.time * 24) % 12;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (let k = -1; k <= 1; k++) {
            const cx = k * 18 - 6 + shift * 0.5;
            ctx.beginPath();
            ctx.moveTo(cx - 7, -13);
            ctx.lineTo(cx + 7, 0);
            ctx.lineTo(cx - 7, 13);
            ctx.stroke();
          }
        } else if (hint.type === 'slow') {
          roundRectPath(ctx, -48, -32, 96, 64, 18);
          ctx.fillStyle = '#ff7043';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Big clear Brake / Slow icon + Friendly Turtle!
          ctx.font = '32px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🐢', 0, 2);
        } else if (hint.type === 'medium') {
          roundRectPath(ctx, -50, -32, 100, 64, 18);
          ctx.fillStyle = '#26c6da';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Visual 3-bar gauge with middle green bar lit!
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          roundRectPath(ctx, -30, -6, 14, 22, 4);
          ctx.fill();
          roundRectPath(ctx, 16, -18, 14, 34, 4);
          ctx.fill();
          ctx.fillStyle = '#fff59d';
          roundRectPath(ctx, -7, -12, 14, 28, 4);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // -----------------------------------------------------------------------
    // Breakable Toy Obstacles & Debris
    // -----------------------------------------------------------------------
    _drawBreakables(ctx, level, bounds) {
      if (!level.breakables) return;
      for (let i = 0; i < level.breakables.length; i++) {
        const b = level.breakables[i];
        if (b.broken) continue;
        if (b.x < bounds.left - 60 || b.x > bounds.right + 60) continue;

        ctx.save();
        ctx.translate(b.x, b.y - 5);

        if (b.type === 'boxes') {
          // Cute stack of 3 cardboard toy boxes
          const coords = [[-14, -22], [12, -22], [-1, -46]];
          coords.forEach(([bx, by]) => {
            roundRectPath(ctx, bx - 12, by, 24, 22, 4);
            ctx.fillStyle = '#deb887';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#8d6e63';
            ctx.stroke();
            ctx.fillStyle = '#ffe082';
            ctx.fillRect(bx - 3, by + 1, 6, 9);
          });
        } else if (b.type === 'blocks') {
          // Colorful ABC / Toy Blocks tower
          const blocks = [
            { x: -13, y: -24, c: '#ff5252' },
            { x: 13, y: -24, c: '#448aff' },
            { x: 0, y: -48, c: '#ffd740' }
          ];
          blocks.forEach((bl) => {
            roundRectPath(ctx, bl.x - 12, bl.y, 24, 24, 5);
            ctx.fillStyle = bl.c;
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
          });
        } else if (b.type === 'cone') {
          // Soft orange playground cone
          ctx.fillStyle = '#ff6d00';
          ctx.beginPath();
          ctx.moveTo(-16, 0);
          ctx.lineTo(-5, -36);
          ctx.lineTo(5, -36);
          ctx.lineTo(16, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-9, -20, 18, 7);
          ctx.fillStyle = '#e65100';
          roundRectPath(ctx, -20, -5, 40, 6, 3);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    _drawDebris(ctx) {
      for (let i = 0; i < this.debris.length; i++) {
        const d = this.debris[i];
        const alpha = Math.max(0, 1 - d.life / d.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        roundRectPath(ctx, -d.size * 0.5, -d.size * 0.5, d.size, d.size, 4);
        ctx.fillStyle = d.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();
      }
    }

    // -----------------------------------------------------------------------
    // Checkpoints & Finish Gate
    // -----------------------------------------------------------------------
    _drawCheckpoints(ctx, level, bounds) {
      if (!level.checkpoints) return;
      for (let i = 0; i < level.checkpoints.length; i++) {
        const cp = level.checkpoints[i];
        if (cp.x < bounds.left - 60 || cp.x > bounds.right + 60) continue;

        ctx.save();
        ctx.translate(cp.x, cp.y);
        // Flagpole
        ctx.fillStyle = '#eceff1';
        ctx.strokeStyle = '#607d8b';
        ctx.lineWidth = 3;
        roundRectPath(ctx, -4, -95, 8, 95, 4);
        ctx.fill();
        ctx.stroke();

        // Pennant flag
        const wave = Math.sin(this.time * 6) * 4;
        ctx.fillStyle = cp.activated ? '#4cd964' : '#ffca28';
        ctx.beginPath();
        ctx.moveTo(4, -92);
        ctx.lineTo(52, -78 + wave);
        ctx.lineTo(4, -62);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ball top
        ctx.fillStyle = cp.activated ? '#2ecc71' : '#ff7043';
        ctx.beginPath();
        ctx.arc(0, -98, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    _drawFinishBack(ctx, finish) {
      if (!finish) return;
      ctx.save();
      ctx.translate(finish.x, finish.y);

      // Back post
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 4;
      roundRectPath(ctx, -38, -155, 14, 155, 6);
      ctx.fill();
      ctx.stroke();

      // Checkered Overhead Arch Banner
      const archX = -42;
      const archY = -168;
      const archW = 92;
      const archH = 34;
      roundRectPath(ctx, archX, archY, archW, archH, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.save();
      ctx.clip();
      const sq = 15;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 7; c++) {
          if ((r + c) % 2 === 0) {
            ctx.fillStyle = '#263238';
            ctx.fillRect(archX + c * sq, archY + r * sq, sq, sq);
          }
        }
      }
      ctx.restore();
      roundRectPath(ctx, archX, archY, archW, archH, 8);
      ctx.strokeStyle = '#ffb300';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.restore();
    }

    _drawFinishFront(ctx, finish, brokenRibbon) {
      if (!finish) return;
      ctx.save();
      ctx.translate(finish.x, finish.y);

      // Ribbon across track
      if (!brokenRibbon) {
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-30, -38);
        ctx.quadraticCurveTo(4, -32 + Math.sin(this.time * 5) * 3, 36, -38);
        ctx.stroke();
      }

      // Front post
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 4;
      roundRectPath(ctx, 32, -155, 14, 155, 6);
      ctx.fill();
      ctx.stroke();

      // Gold star toppers
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffc107';
      ctx.fillText('★', -31, -174);
      ctx.fillText('★', 39, -174);

      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // Toy Motorcycle & Friendly Cartoon Rider
    // -----------------------------------------------------------------------
    _drawBikeAndRider(ctx, bike, input) {
      ctx.save();
      ctx.translate(bike.x, bike.y);
      ctx.rotate(bike.angle);

      const wheelBaseHalf = 32;
      const rWheel = 18;
      const suspY = bike.suspRear * 0.7;

      // High-speed wind lines!
      if (bike.speed > 490 && !bike.failed) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        for (let s = 0; s < 3; s++) {
          const lx = -52 - s * 14 - ((this.time * 220) % 24);
          const ly = -22 - s * 14;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx - 26, ly);
          ctx.stroke();
        }
      }

      // Rear & Front Suspension Forks + Coils
      this._drawSpringFork(ctx, -12, -28 + suspY, -wheelBaseHalf, -rWheel, '#ffd54f');
      this._drawSpringFork(ctx, 16, -34 + suspY, wheelBaseHalf, -rWheel, '#ffd54f');

      // Rear & Front Toy Wheels
      this._drawToyWheel(ctx, -wheelBaseHalf, -rWheel, rWheel, bike.wheelRot);
      this._drawToyWheel(ctx, wheelBaseHalf, -rWheel, rWheel, bike.wheelRot);

      // Chassis Group (compresses on suspension!)
      ctx.save();
      ctx.translate(0, suspY);

      // Chrome Exhaust Pipe
      ctx.fillStyle = '#cfd8dc';
      ctx.strokeStyle = '#455a64';
      ctx.lineWidth = 2.5;
      roundRectPath(ctx, -42, -26, 26, 9, 4);
      ctx.fill();
      ctx.stroke();

      // Main Toy Motorcycle Body
      ctx.fillStyle = '#ff3d00';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-28, -22);
      ctx.quadraticCurveTo(-10, -44, 22, -40);
      ctx.lineTo(30, -24);
      ctx.lineTo(-22, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Teal Fuel Tank Accent
      ctx.fillStyle = '#00e5ff';
      roundRectPath(ctx, -2, -40, 20, 11, 5);
      ctx.fill();

      // Saddle
      ctx.fillStyle = '#37474f';
      roundRectPath(ctx, -22, -38, 22, 9, 4);
      ctx.fill();

      // Headlight + Cheerful Light Cone
      ctx.fillStyle = '#fff59d';
      ctx.beginPath();
      ctx.arc(28, -35, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Brake Tail-Light (Glows bright red when braking!)
      const braking = input && input.brake;
      ctx.fillStyle = braking ? '#ff1744' : '#b71c1c';
      ctx.beginPath();
      ctx.arc(-28, -28, braking ? 6.5 : 4, 0, Math.PI * 2);
      ctx.fill();
      if (braking) {
        ctx.fillStyle = 'rgba(255, 23, 68, 0.38)';
        ctx.beginPath();
        ctx.arc(-28, -28, 13, 0, Math.PI * 2);
        ctx.fill();
      }

      // Handlebars
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(18, -38);
      ctx.lineTo(12, -50);
      ctx.stroke();

      // Friendly Cartoon Kid Rider!
      this._drawRider(ctx, bike, input);

      ctx.restore();
      ctx.restore();
    }

    _drawSpringFork(ctx, xTop, yTop, xBot, yBot, coilColor) {
      ctx.save();
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(xTop, yTop);
      ctx.lineTo(xBot, yBot);
      ctx.stroke();

      // Visible bouncy spring rings
      ctx.strokeStyle = coilColor;
      ctx.lineWidth = 3;
      for (let t = 0.25; t <= 0.75; t += 0.22) {
        const sx = xTop + (xBot - xTop) * t;
        const sy = yTop + (yBot - yTop) * t;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy - 2);
        ctx.lineTo(sx + 4, sy + 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawToyWheel(ctx, cx, cy, r, rot) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Chunky dark rubber tire
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Bright whitewall rim
      ctx.fillStyle = '#eceff1';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
      ctx.fill();

      // Playful spokes so wheel rotation is super obvious!
      ctx.strokeStyle = '#ff7043';
      ctx.lineWidth = 3.2;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * -r * 0.52, Math.sin(a) * -r * 0.52);
        ctx.lineTo(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52);
        ctx.stroke();
      }

      // Hubcap
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    _drawRider(ctx, bike, input) {
      ctx.save();
      const lean = input && input.accelerate ? 0.08 : (input && input.brake ? -0.08 : 0);
      ctx.translate(-8, -38);
      ctx.rotate(lean);

      // Flowing Yellow Scarf (speed feedback!)
      const scarfLen = 18 + Math.min(18, Math.abs(bike.speed) * 0.03);
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, -18);
      ctx.quadraticCurveTo(
        -4 - scarfLen * 0.5,
        -20 + Math.sin(bike.scarfWave) * 6,
        -4 - scarfLen,
        -15 + Math.cos(bike.scarfWave * 1.3) * 7
      );
      ctx.stroke();

      // Kid Jacket Torso
      ctx.fillStyle = '#29b6f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      roundRectPath(ctx, -9, -22, 18, 22, 8);
      ctx.fill();
      ctx.stroke();

      // Arm (raises in celebration on finish, grips bars normally)
      ctx.strokeStyle = '#0288d1';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(3, -16);
      if (bike.finished) {
        ctx.lineTo(12, -36 + Math.sin(this.time * 12) * 4);
      } else {
        ctx.lineTo(19, -11);
      }
      ctx.stroke();

      // Oversized Cute Toy Helmet
      ctx.fillStyle = '#ffca28';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(2, -33, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Racing stripe on helmet
      ctx.fillStyle = '#ff5252';
      roundRectPath(ctx, -3, -48, 8, 10, 4);
      ctx.fill();

      // Goggles / Visor
      ctx.fillStyle = '#ffffff';
      roundRectPath(ctx, 5, -39, 13, 10, 5);
      ctx.fill();
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(13, -34, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // Zero-Reading Failure Explanation Bubble
    // -----------------------------------------------------------------------
    _drawFailHintBubble(ctx, bike) {
      ctx.save();
      const bx = bike.x;
      const by = bike.y - 102 + Math.sin(this.time * 8) * 4;

      roundRectPath(ctx, bx - 64, by - 36, 128, 66, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = bike.failReason === 'too_fast' ? '#ff7043' : '#2ecc71';
      ctx.stroke();

      // Pointer triangle
      ctx.beginPath();
      ctx.moveTo(bx - 10, by + 30);
      ctx.lineTo(bx, by + 44);
      ctx.lineTo(bx + 10, by + 30);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.font = '32px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (bike.failReason === 'too_fast') {
        // Went too fast -> Show Turtle + Slow Down cue!
        ctx.fillText('🐢 ◀', bx, by - 2);
      } else {
        // Went too slow -> Show Rocket + Go Faster cue!
        ctx.fillText('🚀 ▶▶', bx, by - 2);
      }
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // Particles, Popups & Confetti
    // -----------------------------------------------------------------------
    _drawParticles(ctx) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const alpha = p.alpha * (1 - p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = p.color;
        if (p.shape === 'cube') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot || 0);
          roundRectPath(ctx, -p.r, -p.r, p.r * 2, p.r * 2, 4);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    _drawPopups(ctx) {
      for (let i = 0; i < this.popups.length; i++) {
        const pop = this.popups[i];
        const t = pop.life / pop.maxLife;
        const scale = t < 0.2 ? 0.6 + (t / 0.2) * 0.55 : 1.15 - t * 0.15;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t * t);
        ctx.translate(pop.x, pop.y);
        ctx.scale(scale, scale);
        ctx.font = '900 30px "Segoe UI Rounded", "Comic Sans MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(pop.text, 0, 0);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, 0, 0);
        ctx.restore();
      }
    }

    _drawConfetti(ctx) {
      for (let i = 0; i < this.confetti.length; i++) {
        const c = this.confetti[i];
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
        ctx.restore();
      }
    }
  }

  window.Zoomy.Renderer = new Renderer();
})();
