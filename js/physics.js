/* ==========================================================================
   Zoomy Moto! — Predictable Toy Motorcycle Physics & Collision Solver
   ========================================================================== */
(function () {
  'use strict';

  window.Zoomy = window.Zoomy || {};

  const CONSTANTS = {
    DT: 1 / 60,
    GRAVITY: 780,          // px/s^2 — floaty, readable toy jump arcs
    MAX_SPEED: 650,        // px/s
    ACCEL: 535,            // px/s^2 — snappy acceleration
    LOW_SPEED_BOOST: 160,  // extra launch torque from standstill so starting feels instant
    COAST_DECEL: 185,      // px/s^2 — releasing throttle naturally slows down
    BRAKE_DECEL: 660,      // px/s^2 — responsive braking
    WHEELBASE: 64,
    WHEEL_RADIUS: 18,
    LIP_BEVEL: 16          // px of forgiving platform front-lip lift
  };

  class PhysicsWorld {
    constructor() {
      this.constants = CONSTANTS;
      this.bike = this._createFreshBike(160, 460);
      this.events = [];
    }

    _createFreshBike(x, y) {
      return {
        x,
        y,            // Ground contact point under bike center
        vx: 0,
        vy: 0,
        speed: 0,     // Tangential speed when grounded
        angle: 0,     // Visual + chassis pitch (radians)
        pitchOffset: 0, // Dynamic wheelie / brake dive tilt
        grounded: true,
        airTime: 0,
        takeoffSpeed: 0,
        wheelRot: 0,
        suspRear: 0,
        suspFront: 0,
        suspVel: 0,
        scarfWave: 0,
        currentSurfaceId: null,
        failed: false,
        failType: null,     // 'water' | 'foam' | 'mud' | 'bonk'
        failReason: null,   // 'too_slow' | 'too_fast'
        failTimer: 0,
        finished: false
      };
    }

    spawnBike(x, y) {
      this.bike = this._createFreshBike(x, y);
      this.events = [];
    }

    consumeEvents() {
      const ev = this.events;
      this.events = [];
      return ev;
    }

    // Evaluate surface height and slope at world X
    sampleSurfaceAt(surface, x) {
      const pts = surface.points;
      if (!pts || pts.length < 2) return null;
      const xMin = pts[0][0];
      const xMax = pts[pts.length - 1][0];
      if (x < xMin || x > xMax) return null;

      for (let i = 0; i < pts.length - 1; i++) {
        const x0 = pts[i][0];
        const y0 = pts[i][1];
        const x1 = pts[i + 1][0];
        const y1 = pts[i + 1][1];
        if (x >= x0 && x <= x1) {
          const dx = x1 - x0;
          const t = dx > 0.0001 ? (x - x0) / dx : 0;
          const y = y0 + (y1 - y0) * t;
          const angle = Math.atan2(y1 - y0, dx);
          return { y, angle, segIndex: i };
        }
      }
      return null;
    }

    getSurfaceLipSample(surface) {
      const pts = surface.points;
      const n = pts.length;
      const x0 = pts[n - 2][0];
      const y0 = pts[n - 2][1];
      const x1 = pts[n - 1][0];
      const y1 = pts[n - 1][1];
      return {
        x: x1,
        y: y1,
        angle: Math.atan2(y1 - y0, x1 - x0)
      };
    }

    findBestGroundSurface(level, x, refY, maxSnapAbove, maxSnapBelow) {
      let best = null;
      let bestDist = Infinity;

      for (let i = 0; i < level.surfaces.length; i++) {
        const surf = level.surfaces[i];
        const sample = this.sampleSurfaceAt(surf, x);
        if (!sample) continue;
        const diff = sample.y - refY; // positive means surface is below refY
        if (diff >= -maxSnapAbove && diff <= maxSnapBelow) {
          const d = Math.abs(diff);
          if (d < bestDist) {
            bestDist = d;
            best = { surface: surf, y: sample.y, angle: sample.angle };
          }
        }
      }
      return best;
    }

    step(level, input, dt = CONSTANTS.DT) {
      const b = this.bike;

      // Comical float/bounce during failure recovery
      if (b.failed) {
        b.failTimer += dt;
        b.vx *= 0.90;
        if (b.failType === 'water' || b.failType === 'mud') {
          b.vy = Math.sin(b.failTimer * 9) * 18;
          b.y += b.vy * dt;
          b.angle *= 0.92;
        } else {
          // Plush foam bounce
          b.vy += CONSTANTS.GRAVITY * 0.35 * dt;
          b.y += b.vy * dt;
          if (b.vy > 80) b.vy = -b.vy * 0.45;
          b.angle += 1.4 * dt * (b.vx >= 0 ? 1 : -1);
          b.angle = Math.max(-0.55, Math.min(0.55, b.angle));
        }
        return;
      }

      // Gentle celebration coast after crossing finish line
      if (b.finished) {
        input = { accelerate: false, brake: true };
      }

      const prevX = b.x;
      const prevY = b.y;

      if (b.grounded) {
        this._stepGrounded(level, input, dt);
      } else {
        this._stepAirborne(level, input, dt, prevX, prevY);
      }

      // Spring-damper visual suspension update
      const springForce = -110 * b.suspRear - 14 * b.suspVel;
      b.suspVel += springForce * dt;
      b.suspRear += b.suspVel * dt;
      b.suspRear = Math.max(-8, Math.min(14, b.suspRear));
      b.suspFront = b.suspRear * 0.85 + b.pitchOffset * 18;

      // Wheel rotation & scarf animation
      const horizSpeed = b.grounded ? b.speed : b.vx;
      b.wheelRot += (horizSpeed * dt) / CONSTANTS.WHEEL_RADIUS;
      b.scarfWave += dt * (4 + Math.abs(horizSpeed) * 0.022);

      // Breakables, Checkpoints, Ceiling, Hazards, Finish
      if (!b.finished) {
        this._checkBreakables(level);
        this._checkCheckpoints(level);
        this._checkCeilings(level);
        this._checkHazards(level);
        this._checkFinish(level);
      }
    }

    _stepGrounded(level, input, dt) {
      const b = this.bike;
      const ground = this.findBestGroundSurface(level, b.x, b.y, 22, 22);

      if (!ground) {
        b.grounded = false;
        b.airTime = 0;
        b.takeoffSpeed = b.speed;
        return;
      }

      const surf = ground.surface;
      const slopeAngle = ground.angle;
      b.currentSurfaceId = surf.id;
      b.y = ground.y;

      // Slope gravity: full gravity on 'hill' so momentum matters; lighter on 'ramp' so approach speed stays predictable!
      const slopeFactor = surf.type === 'hill' ? 1.05 : (surf.type === 'ramp' ? 0.28 : 0.65);
      const slopeAccel = CONSTANTS.GRAVITY * Math.sin(slopeAngle) * slopeFactor;

      let targetPitchOffset = 0;

      if (input.brake) {
        b.speed -= CONSTANTS.BRAKE_DECEL * dt;
        b.speed += slopeAccel * dt;
        if (slopeAngle >= -0.08 && b.speed < 0) b.speed = 0;
        targetPitchOffset = b.speed > 40 ? 0.09 : 0; // Subtle nose dive when braking!
      } else if (input.accelerate) {
        const lowBoost = b.speed < 180 ? CONSTANTS.LOW_SPEED_BOOST * (1 - b.speed / 180) : 0;
        b.speed += (CONSTANTS.ACCEL + lowBoost + slopeAccel) * dt;
        targetPitchOffset = -0.075; // Playful mini wheelie squat when accelerating!
      } else {
        // Natural coast deceleration
        if (b.speed > 0) {
          b.speed = Math.max(0, b.speed - CONSTANTS.COAST_DECEL * dt);
        } else if (b.speed < 0) {
          b.speed = Math.min(0, b.speed + CONSTANTS.COAST_DECEL * dt);
        }
        b.speed += slopeAccel * dt;
        // Prevent rolling backwards endlessly on flat ground, allow gentle slide back on steep hill
        if (slopeAngle >= -0.18 && b.speed < 0) {
          b.speed = 0;
        }
      }

      // Clamp speeds
      b.speed = Math.max(-220, Math.min(CONSTANTS.MAX_SPEED, b.speed));
      // Prevent going past left boundary of level
      if (b.x < 70 && b.speed < 0) b.speed = 0;

      b.pitchOffset += (targetPitchOffset - b.pitchOffset) * Math.min(1, dt * 11);

      // Advance along surface
      const stepDist = b.speed * dt;
      const nextX = Math.max(60, b.x + stepDist * Math.cos(slopeAngle));
      const nextYApprox = b.y + stepDist * Math.sin(slopeAngle);

      const nextGround = this.findBestGroundSurface(level, nextX, nextYApprox, 20, 20);

      if (nextGround) {
        b.x = nextX;
        b.y = nextGround.y;
        b.vx = b.speed * Math.cos(nextGround.angle);
        b.vy = b.speed * Math.sin(nextGround.angle);
        // Smooth chassis pitch alignment to terrain + wheelie/brake offset
        const desiredAngle = nextGround.angle + b.pitchOffset;
        b.angle += (desiredAngle - b.angle) * Math.min(1, dt * 16);
      } else {
        // Launched off the lip of a ramp or cliff!
        const lip = this.getSurfaceLipSample(surf);
        const launchAngle = b.speed >= 0 ? lip.angle : slopeAngle;
        b.x = nextX;
        b.y = nextYApprox;
        b.vx = b.speed * Math.cos(launchAngle);
        b.vy = b.speed * Math.sin(launchAngle);
        b.grounded = false;
        b.airTime = 0;
        b.takeoffSpeed = Math.abs(b.speed);
        b.suspRear = -5;

        if (b.takeoffSpeed > 150) {
          this.events.push({
            type: 'jump',
            x: b.x,
            y: b.y,
            speedRatio: b.takeoffSpeed / CONSTANTS.MAX_SPEED
          });
        }
      }
    }

    _stepAirborne(level, input, dt, prevX, prevY) {
      const b = this.bike;
      b.airTime += dt;

      // Predictable parabolic jump arc! Approach speed determines 96% of jump trajectory;
      // tiny subtle air trim (4%) feels responsive without letting player cheat speed puzzles.
      if (input.accelerate && b.vx < CONSTANTS.MAX_SPEED) {
        b.vx += 24 * dt;
      } else if (input.brake && b.vx > 90) {
        b.vx -= 36 * dt;
      }

      b.vy += CONSTANTS.GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.speed = b.vx;

      // AUTOMATIC AIRBORNE STABILIZATION:
      // Bike smoothly aligns with flight arc and prepares wheels-first for landing!
      const velAngle = Math.atan2(b.vy, Math.max(120, Math.abs(b.vx)));
      const targetAirAngle = Math.max(-0.42, Math.min(0.38, velAngle * 0.58));
      b.pitchOffset *= 0.9;
      b.angle += (targetAirAngle - b.angle) * Math.min(1, dt * 8);

      // Check landing on any driveable surface
      for (let i = 0; i < level.surfaces.length; i++) {
        const surf = level.surfaces[i];
        const pts = surf.points;
        const xStart = pts[0][0];
        const xEnd = pts[pts.length - 1][0];

        // Standard surface hit
        if (b.x >= xStart && b.x <= xEnd) {
          const sample = this.sampleSurfaceAt(surf, b.x);
          if (sample) {
            const prevSurfSample = this.sampleSurfaceAt(surf, Math.max(xStart, Math.min(xEnd, prevX)));
            const refPrevY = prevSurfSample ? prevSurfSample.y : sample.y;

            // Crossing surface from above (with generous tolerance)
            if (b.vy >= -60 && prevY <= refPrevY + 22 && b.y >= sample.y - 4) {
              this._completeLanding(surf, sample.y, sample.angle);
              return;
            }
          }
        } else if (b.vx > 0 && b.x >= xStart - CONSTANTS.LIP_BEVEL && b.x < xStart) {
          // Forgiving rounded front-lip bevel: lifts near-misses onto platform instead of unfair crash!
          const lipY = pts[0][1];
          if (b.vy >= 0 && b.y >= lipY - 6 && b.y <= lipY + 22) {
            b.x = xStart + 2;
            const sample = this.sampleSurfaceAt(surf, b.x);
            this._completeLanding(surf, sample ? sample.y : lipY, sample ? sample.angle : 0);
            return;
          }
        }
      }
    }

    _completeLanding(surf, landY, landAngle) {
      const b = this.bike;
      const impactVy = Math.max(0, b.vy);
      const flightDuration = b.airTime;

      b.y = landY;
      b.grounded = true;
      b.currentSurfaceId = surf.id;
      // Preserve horizontal speed smoothly onto new slope
      b.speed = Math.max(70, Math.min(CONSTANTS.MAX_SPEED, b.vx / Math.max(0.75, Math.cos(landAngle))));
      b.vx = b.speed * Math.cos(landAngle);
      b.vy = b.speed * Math.sin(landAngle);
      b.angle = landAngle;
      b.suspRear = Math.min(13, impactVy * 0.028);
      b.suspVel = 40;
      b.airTime = 0;

      this.events.push({
        type: 'land',
        x: b.x,
        y: b.y,
        intensity: Math.min(1, impactVy / 380),
        flightDuration
      });

      if (flightDuration >= 0.46) {
        this.events.push({
          type: 'praise',
          x: b.x,
          y: b.y - 75,
          label: flightDuration > 0.72 ? 'WOOHOO!' : 'NICE!'
        });
      }
    }

    _checkBreakables(level) {
      if (!level.breakables) return;
      const b = this.bike;
      for (let i = 0; i < level.breakables.length; i++) {
        const prop = level.breakables[i];
        if (prop.broken) continue;
        if (Math.abs(b.x - prop.x) < 46 && Math.abs((b.y - 20) - (prop.y - 22)) < 48) {
          prop.broken = true;
          this.events.push({
            type: 'break',
            x: prop.x,
            y: prop.y - 18,
            propType: prop.type,
            vx: Math.max(180, b.vx)
          });
        }
      }
    }

    _checkCheckpoints(level) {
      if (!level.checkpoints) return;
      const b = this.bike;
      for (let i = 0; i < level.checkpoints.length; i++) {
        const cp = level.checkpoints[i];
        if (!cp.activated && b.x >= cp.x - 20) {
          cp.activated = true;
          this.events.push({
            type: 'checkpoint',
            x: cp.x,
            y: cp.y,
            checkpoint: cp
          });
        }
      }
    }

    _checkCeilings(level) {
      if (!level.ceilings) return;
      const b = this.bike;
      if (b.grounded) return;
      // Rider + bike upper bounding circle
      const cx = b.x;
      const cy = b.y - 30;
      const r = 20;

      for (let i = 0; i < level.ceilings.length; i++) {
        const c = level.ceilings[i];
        const closestX = Math.max(c.x, Math.min(c.x + c.w, cx));
        const closestY = Math.max(c.y, Math.min(c.y + c.h, cy));
        const dx = cx - closestX;
        const dy = cy - closestY;
        if (dx * dx + dy * dy < r * r) {
          // Soft cartoon foam bounce!
          b.vx = -Math.abs(b.vx) * 0.25 - 40;
          b.vy = Math.max(95, Math.abs(b.vy) * 0.35);
          b.x = Math.min(b.x, c.x - r + 2);
          b.grounded = false;
          this.events.push({
            type: 'bonk',
            x: closestX,
            y: closestY
          });

          // If this was the tunnel arch in Level 5 (where there isn't a foam tub right to the left),
          // trigger harmless foam-bonk retry after bouncing!
          if (c.id && c.id.indexOf('arch') !== -1) {
            this._triggerFail('foam', 'too_fast', cx, cy);
          }
          return;
        }
      }
    }

    _checkHazards(level) {
      const b = this.bike;
      if (level.hazards) {
        for (let i = 0; i < level.hazards.length; i++) {
          const h = level.hazards[i];
          // Elevated foam catchers only catch airborne bikes entering the tub (never bikes driving safely on the road below!)
          if (h.elevated && b.grounded) continue;
          const bottomPad = h.elevated ? 4 : 22;
          if (
            b.x >= h.x + 8 &&
            b.x <= h.x + h.w - 8 &&
            b.y >= h.y + 4 &&
            b.y <= h.y + h.h + bottomPad
          ) {
            this._triggerFail(h.type, h.failReason || 'too_slow', b.x, h.y + 18);
            return;
          }
        }
      }

      // Safety floor if falling out of world
      if (b.y > 760) {
        this._triggerFail('water', 'too_slow', b.x, 660);
      }
    }

    _triggerFail(failType, failReason, x, y) {
      const b = this.bike;
      if (b.failed || b.finished) return;
      b.failed = true;
      b.failType = failType;
      b.failReason = failReason;
      b.failTimer = 0;
      b.grounded = false;

      this.events.push({
        type: 'fail',
        failType,
        failReason,
        x,
        y
      });
    }

    _checkFinish(level) {
      const b = this.bike;
      if (!b.finished && !b.failed && b.x >= level.finish.x) {
        b.finished = true;
        this.events.push({
          type: 'finish',
          x: level.finish.x,
          y: level.finish.y
        });
      }
    }

    // Predict jump arc points for debug telemetry / level editor visualization
    predictTrajectory(x, y, speed, angle, steps = 45) {
      const pts = [];
      let px = x;
      let py = y;
      const vx = speed * Math.cos(angle);
      let vy = speed * Math.sin(angle);
      const dt = CONSTANTS.DT * 2;
      for (let i = 0; i < steps; i++) {
        pts.push([px, py]);
        vy += CONSTANTS.GRAVITY * dt;
        px += vx * dt;
        py += vy * dt;
      }
      return pts;
    }
  }

  window.Zoomy.Physics = new PhysicsWorld();
  window.Zoomy.PhysicsClass = PhysicsWorld;
})();
