/* ==========================================================================
   Zoomy Moto! — Gameplay Telemetry Overlay (F1) & Live Level Editor (F2)
   ========================================================================== */
(function () {
  'use strict';

  window.Zoomy = window.Zoomy || {};

  class DebugAndEditor {
    constructor() {
      const params = new URLSearchParams(window.location.search || '');
      this.debugVisible = params.get('debug') === '1';
      this.editorActive = params.get('editor') === '1';

      this.fps = 60;
      this._frames = 0;
      this._fpsAccum = 0;

      // Editor selection & drag state
      this.selected = null; // { kind: 'vertex'|'hazard'|'breakable'|'hint'|'finish'|'start', obj, ptIndex }
      this.dragging = false;
      this.panning = false;
      this.lastMouse = { x: 0, y: 0 };

      this.onRequestPlaytest = null;
      this.getCurrentLevel = null;
      this.replaceCurrentLevel = null;
    }

    init(canvas, camera, hooks) {
      this.canvas = canvas;
      this.camera = camera;
      this.onRequestPlaytest = hooks.onRequestPlaytest;
      this.getCurrentLevel = hooks.getCurrentLevel;
      this.replaceCurrentLevel = hooks.replaceCurrentLevel;

      this.barEl = document.getElementById('editor-bar');
      this._syncEditorBar();
      this._bindToolbarButtons();
      this._bindCanvasMouse();
    }

    toggleDebug() {
      this.debugVisible = !this.debugVisible;
    }

    toggleEditor() {
      this.editorActive = !this.editorActive;
      this.camera.editorMode = this.editorActive;
      if (this.editorActive) {
        this.debugVisible = true;
      }
      this._syncEditorBar();
    }

    _syncEditorBar() {
      if (this.barEl) {
        this.barEl.classList.toggle('hidden', !this.editorActive);
      }
    }

    recordFrame(dt) {
      this._frames++;
      this._fpsAccum += dt;
      if (this._fpsAccum >= 0.5) {
        this.fps = Math.round(this._frames / this._fpsAccum);
        this._frames = 0;
        this._fpsAccum = 0;
      }
    }

    _bindToolbarButtons() {
      const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
      };

      bind('ed-add-road', () => {
        const lvl = this.getCurrentLevel && this.getCurrentLevel();
        if (!lvl) return;
        const cx = Math.round(this.camera.x);
        const cy = 460;
        lvl.surfaces.push({
          id: 'ed_road_' + Date.now(),
          type: 'road',
          points: [[cx - 150, cy], [cx + 150, cy]]
        });
      });

      bind('ed-add-ramp', () => {
        const lvl = this.getCurrentLevel && this.getCurrentLevel();
        if (!lvl) return;
        const cx = Math.round(this.camera.x);
        lvl.surfaces.push({
          id: 'ed_ramp_' + Date.now(),
          type: 'ramp',
          speedHint: 'fast',
          points: window.Zoomy.Levels.helpers.buildRampPoints(cx - 80, 460, 170, 62)
        });
      });

      bind('ed-add-water', () => {
        const lvl = this.getCurrentLevel && this.getCurrentLevel();
        if (!lvl) return;
        lvl.hazards.push({
          id: 'ed_pond_' + Date.now(),
          type: 'water',
          x: Math.round(this.camera.x - 120),
          y: 472,
          w: 240,
          h: 105,
          failReason: 'too_slow'
        });
      });

      bind('ed-add-foam', () => {
        const lvl = this.getCurrentLevel && this.getCurrentLevel();
        if (!lvl) return;
        lvl.hazards.push({
          id: 'ed_foam_' + Date.now(),
          type: 'foam',
          x: Math.round(this.camera.x - 140),
          y: 320,
          w: 320,
          h: 120,
          failReason: 'too_fast',
          elevated: true
        });
      });

      bind('ed-add-boxes', () => {
        const lvl = this.getCurrentLevel && this.getCurrentLevel();
        if (!lvl) return;
        lvl.breakables.push({
          id: 'ed_box_' + Date.now(),
          type: 'boxes',
          x: Math.round(this.camera.x),
          y: 460
        });
      });

      bind('ed-add-hint-fast', () => {
        const lvl = this.getCurrentLevel && this.getCurrentLevel();
        if (!lvl) return;
        lvl.hints.push({
          id: 'ed_h_' + Date.now(),
          type: 'fast',
          x: Math.round(this.camera.x),
          y: 460
        });
      });

      bind('ed-add-hint-slow', () => {
        const lvl = this.getCurrentLevel && this.getCurrentLevel();
        if (!lvl) return;
        lvl.hints.push({
          id: 'ed_h_' + Date.now(),
          type: 'slow',
          x: Math.round(this.camera.x),
          y: 460
        });
      });

      bind('ed-delete', () => {
        const lvl = this.getCurrentLevel && this.getCurrentLevel();
        if (!lvl || !this.selected) return;
        const s = this.selected;
        if (s.kind === 'vertex') {
          if (s.obj.points.length > 2) {
            s.obj.points.splice(s.ptIndex, 1);
          } else {
            const idx = lvl.surfaces.indexOf(s.obj);
            if (idx >= 0) lvl.surfaces.splice(idx, 1);
          }
        } else if (s.kind === 'hazard') {
          const idx = lvl.hazards.indexOf(s.obj);
          if (idx >= 0) lvl.hazards.splice(idx, 1);
        } else if (s.kind === 'breakable') {
          const idx = lvl.breakables.indexOf(s.obj);
          if (idx >= 0) lvl.breakables.splice(idx, 1);
        } else if (s.kind === 'hint') {
          const idx = lvl.hints.indexOf(s.obj);
          if (idx >= 0) lvl.hints.splice(idx, 1);
        }
        this.selected = null;
      });

      bind('ed-test', () => {
        this.editorActive = false;
        this.camera.editorMode = false;
        this._syncEditorBar();
        if (this.onRequestPlaytest) this.onRequestPlaytest();
      });

      bind('ed-export', () => {
        const lvl = this.getCurrentLevel && this.getCurrentLevel();
        if (!lvl) return;
        const json = JSON.stringify(lvl, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(json).then(() => {
            alert('Level JSON copied to clipboard!');
          }).catch(() => {
            window.prompt('Copy Level JSON:', json);
          });
        } else {
          window.prompt('Copy Level JSON:', json);
        }
      });

      bind('ed-import', () => {
        const raw = window.prompt('Paste Level JSON:');
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.surfaces) && this.replaceCurrentLevel) {
            this.replaceCurrentLevel(parsed);
          }
        } catch (err) {
          alert('Invalid JSON: ' + err.message);
        }
      });
    }

    _bindCanvasMouse() {
      if (!this.canvas) return;

      this.canvas.addEventListener('pointerdown', (e) => {
        if (!this.editorActive) return;
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = this.camera.screenToWorld(sx, sy);

        this.lastMouse = { x: sx, y: sy };
        const hit = this._pickObject(world.x, world.y);

        if (hit && e.button === 0 && !e.shiftKey) {
          this.selected = hit;
          this.dragging = true;
        } else {
          this.panning = true;
        }
      });

      window.addEventListener('pointermove', (e) => {
        if (!this.editorActive || (!this.dragging && !this.panning)) return;
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        if (this.panning) {
          const s = this.camera.baseScale * this.camera.zoom;
          this.camera.x -= (sx - this.lastMouse.x) / s;
          this.camera.y -= (sy - this.lastMouse.y) / s;
        } else if (this.dragging && this.selected) {
          const w = this.camera.screenToWorld(sx, sy);
          const rx = Math.round(w.x / 5) * 5;
          const ry = Math.round(w.y / 5) * 5;
          const sel = this.selected;

          if (sel.kind === 'vertex') {
            sel.obj.points[sel.ptIndex][0] = rx;
            sel.obj.points[sel.ptIndex][1] = ry;
          } else if (sel.kind === 'hazardResize') {
            sel.obj.w = Math.max(40, rx - sel.obj.x);
            sel.obj.h = Math.max(40, ry - sel.obj.y);
          } else if (sel.kind === 'hazard') {
            sel.obj.x = rx - sel.offsetX;
            sel.obj.y = ry - sel.offsetY;
          } else if (sel.obj) {
            sel.obj.x = rx;
            sel.obj.y = ry;
          }
        }
        this.lastMouse = { x: sx, y: sy };
      });

      window.addEventListener('pointerup', () => {
        this.dragging = false;
        this.panning = false;
      });

      this.canvas.addEventListener('wheel', (e) => {
        if (!this.editorActive) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        this.camera.zoom = Math.max(0.35, Math.min(1.6, this.camera.zoom * factor));
      }, { passive: false });
    }

    _pickObject(wx, wy) {
      const lvl = this.getCurrentLevel && this.getCurrentLevel();
      if (!lvl) return null;

      // 1. Surface vertices
      for (let i = 0; i < lvl.surfaces.length; i++) {
        const s = lvl.surfaces[i];
        for (let k = 0; k < s.points.length; k++) {
          const dx = wx - s.points[k][0];
          const dy = wy - s.points[k][1];
          if (dx * dx + dy * dy <= 22 * 22) {
            return { kind: 'vertex', obj: s, ptIndex: k };
          }
        }
      }

      // 2. Start & Finish
      if (Math.hypot(wx - lvl.start.x, wy - lvl.start.y) < 28) {
        return { kind: 'start', obj: lvl.start };
      }
      if (Math.hypot(wx - lvl.finish.x, wy - (lvl.finish.y - 40)) < 36) {
        return { kind: 'finish', obj: lvl.finish };
      }

      // 3. Breakables & Hints
      for (let i = 0; i < (lvl.breakables || []).length; i++) {
        const b = lvl.breakables[i];
        if (Math.hypot(wx - b.x, wy - (b.y - 20)) < 28) {
          return { kind: 'breakable', obj: b };
        }
      }
      for (let i = 0; i < (lvl.hints || []).length; i++) {
        const h = lvl.hints[i];
        if (Math.hypot(wx - h.x, wy - (h.y - 95)) < 36) {
          return { kind: 'hint', obj: h };
        }
      }

      // 4. Hazards (bottom-right resize handle or body move)
      for (let i = 0; i < (lvl.hazards || []).length; i++) {
        const hz = lvl.hazards[i];
        if (Math.hypot(wx - (hz.x + hz.w), wy - (hz.y + hz.h)) < 24) {
          return { kind: 'hazardResize', obj: hz };
        }
        if (wx >= hz.x && wx <= hz.x + hz.w && wy >= hz.y && wy <= hz.y + hz.h) {
          return { kind: 'hazard', obj: hz, offsetX: wx - hz.x, offsetY: wy - hz.y };
        }
      }

      return null;
    }

    // -----------------------------------------------------------------------
    // World-Space Debug Geometry & Speed Range Arcs
    // -----------------------------------------------------------------------
    renderWorldOverlay(ctx, level, bike) {
      if (!this.debugVisible && !this.editorActive) return;

      const phys = window.Zoomy.Physics;

      // 1. Expected Jump Speed Arcs from every Ramp Lip!
      for (let i = 0; i < level.surfaces.length; i++) {
        const s = level.surfaces[i];
        if (s.type === 'ramp') {
          const lip = phys.getSurfaceLipSample(s);
          const speeds = [
            { v: 260, col: 'rgba(41, 182, 246, 0.85)' },   // Slow arc
            { v: 420, col: 'rgba(102, 187, 106, 0.90)' },  // Medium arc
            { v: 650, col: 'rgba(255, 87, 34, 0.90)' }     // Max speed arc
          ];
          speeds.forEach((sp) => {
            const arc = phys.predictTrajectory(lip.x, lip.y, sp.v, lip.angle, 36);
            ctx.beginPath();
            ctx.setLineDash([6, 6]);
            ctx.strokeStyle = sp.col;
            ctx.lineWidth = 2.5;
            for (let k = 0; k < arc.length; k++) {
              if (k === 0) ctx.moveTo(arc[k][0], arc[k][1]);
              else ctx.lineTo(arc[k][0], arc[k][1]);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          });
        }

        // Surface collision vertices
        ctx.fillStyle = '#00e5ff';
        for (let k = 0; k < s.points.length; k++) {
          const pt = s.points[k];
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], this.editorActive ? 9 : 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Hazard & Ceiling Hitboxes
      ctx.lineWidth = 2;
      (level.hazards || []).forEach((h) => {
        ctx.strokeStyle = h.failReason === 'too_fast' ? '#ff4081' : '#00b0ff';
        ctx.strokeRect(h.x, h.y, h.w, h.h);
        if (this.editorActive) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(h.x + h.w - 7, h.y + h.h - 7, 14, 14);
        }
      });

      (level.ceilings || []).forEach((c) => {
        ctx.strokeStyle = '#ffd740';
        ctx.strokeRect(c.x, c.y, c.w, c.h);
      });

      // 3. Camera Zones
      (level.cameraZones || []).forEach((cz) => {
        ctx.strokeStyle = 'rgba(179, 136, 255, 0.45)';
        ctx.setLineDash([10, 10]);
        ctx.strokeRect(cz.xStart, 140, cz.xEnd - cz.xStart, 480);
        ctx.setLineDash([]);
      });

      // 4. Bike Bounding & Live Velocity Vector
      if (bike) {
        ctx.strokeStyle = '#76ff03';
        ctx.beginPath();
        ctx.arc(bike.x, bike.y - 30, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bike.x, bike.y - 20);
        ctx.lineTo(bike.x + bike.vx * 0.2, bike.y - 20 + bike.vy * 0.2);
        ctx.stroke();
      }
    }

    // -----------------------------------------------------------------------
    // Screen-Space Debug Telemetry Panel
    // -----------------------------------------------------------------------
    renderScreenOverlay(ctx, level, bike) {
      if (!this.debugVisible) return;
      ctx.save();
      const x = 16;
      const y = this.editorActive ? 132 : 82;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(x, y, 275, 168);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 275, 168);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '13px Consolas, monospace';
      const activeCps = (level.checkpoints || []).filter((c) => c.activated).length;
      const lines = [
        `DEBUG TELEMETRY (F1) | FPS: ${this.fps}`,
        `Level: ${level.id} (${level.name})`,
        `Pos  : (${Math.round(bike.x)}, ${Math.round(bike.y)})`,
        `Speed: ${Math.round(bike.speed)} / ${window.Zoomy.Physics.constants.MAX_SPEED} px/s`,
        `Vel  : vx=${Math.round(bike.vx)} vy=${Math.round(bike.vy)}`,
        `State: ${bike.failed ? 'FAIL (' + bike.failReason + ')' : (bike.grounded ? 'GROUNDED' : 'AIRBORNE')}`,
        `Checkpoints: ${activeCps}/${(level.checkpoints || []).length}`,
        `Editor: Press F2 (Drag pts, wheel zoom)`
      ];
      lines.forEach((ln, idx) => {
        ctx.fillStyle = idx === 0 ? '#38bdf8' : '#e2e8f0';
        ctx.fillText(ln, x + 10, y + 22 + idx * 19);
      });
      ctx.restore();
    }
  }

  window.Zoomy.DebugEditor = new DebugAndEditor();
})();
