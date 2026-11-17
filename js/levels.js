/* ==========================================================================
   Zoomy Moto! — Data-Driven Level System & Prototype Levels 1–5
   ========================================================================== */
(function () {
  'use strict';

  window.Zoomy = window.Zoomy || {};

  // Smooth ramp builder: transitions gently from flat to launch angle so wheels never snag
  function buildRampPoints(xStart, yStart, width, rise) {
    const pts = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Ease-in quadratic for first 45%, then linear constant launch slope for predictable arcs!
      let hFrac;
      if (t <= 0.45) {
        hFrac = (t * t) / (0.45 * 1.55);
      } else {
        const t0 = 0.45;
        const y0 = (t0 * t0) / (0.45 * 1.55);
        const slope = (1 - y0) / (1 - t0);
        hFrac = y0 + slope * (t - t0);
      }
      pts.push([
        Math.round(xStart + width * t),
        Math.round(yStart - rise * hFrac)
      ]);
    }
    return pts;
  }

  // Smooth S-curve bridge / hill builder between (x0, y0) and (x1, y1)
  function buildSmoothSlope(x0, y0, x1, y1, segments = 8) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const s = t * t * (3 - 2 * t); // smoothstep
      pts.push([
        Math.round(x0 + (x1 - x0) * t),
        Math.round(y0 + (y1 - y0) * s)
      ]);
    }
    return pts;
  }

  // Build an "Underpass + Cozy Landing Pad" surface that lets controlled landings roll safely
  // underneath an elevated Foam Catcher Tub while high-speed jumps fly right into the tub!
  function buildCozyUnderpassPoints(xPadStart, yPad, padLen, dipDepth, underLen, xExitEnd, yExit) {
    const pts = [[xPadStart, yPad]];
    const xDipStart = xPadStart + padLen;
    pts.push([xDipStart, yPad]);

    const xUnderStart = xDipStart + 170;
    const slopeDown = buildSmoothSlope(xDipStart, yPad, xUnderStart, yPad + dipDepth, 5);
    for (let i = 1; i < slopeDown.length; i++) pts.push(slopeDown[i]);

    const xUnderEnd = xUnderStart + underLen;
    pts.push([xUnderEnd, yPad + dipDepth]);

    const slopeUp = buildSmoothSlope(xUnderEnd, yPad + dipDepth, xUnderEnd + 190, yExit, 5);
    for (let i = 1; i < slopeUp.length; i++) pts.push(slopeUp[i]);

    pts.push([xExitEnd, yExit]);
    return pts;
  }

  // =========================================================================
  // PROTOTYPE LEVELS 1–5 (Vertical Slice — Validating Pure Speed Control)
  // =========================================================================
  const LEVEL_DEFINITIONS = [
    // -----------------------------------------------------------------------
    // LEVEL 1: SUNNY START — Learn Acceleration & Toy Satisfaction
    // -----------------------------------------------------------------------
    {
      id: 1,
      name: 'Sunny Start',
      icon: '☀️',
      theme: 'sunny',
      starTime: 22,
      start: { x: 180, y: 460 },
      finish: { x: 3050, y: 460 },
      surfaces: [
        {
          id: 'l1_s1',
          type: 'road',
          points: [
            [40, 460],
            [700, 460],
            ...buildSmoothSlope(700, 460, 1020, 405, 6).slice(1),
            ...buildSmoothSlope(1020, 405, 1340, 460, 6).slice(1),
            [1680, 460]
          ]
        },
        {
          id: 'l1_ramp1',
          type: 'ramp',
          speedHint: 'fast',
          points: buildRampPoints(1680, 460, 150, 44)
        },
        {
          id: 'l1_s2',
          type: 'road',
          points: [
            [1920, 460],
            [2380, 460],
            ...buildSmoothSlope(2380, 460, 2620, 425, 5).slice(1),
            ...buildSmoothSlope(2620, 425, 2860, 460, 5).slice(1),
            [3400, 460]
          ]
        }
      ],
      hazards: [
        { id: 'l1_h1', type: 'water', x: 1830, y: 472, w: 90, h: 95, failReason: 'too_slow' }
      ],
      ceilings: [],
      checkpoints: [
        { id: 'l1_cp1', x: 1500, y: 460 }
      ],
      breakables: [
        { id: 'l1_b1', type: 'boxes', x: 560, y: 460 },
        { id: 'l1_b2', type: 'blocks', x: 1390, y: 460 },
        { id: 'l1_b3', type: 'cone', x: 2100, y: 460 },
        { id: 'l1_b4', type: 'boxes', x: 2220, y: 460 },
        { id: 'l1_b5', type: 'blocks', x: 2890, y: 460 }
      ],
      hints: [
        { id: 'l1_hint1', type: 'go_tutorial', x: 310, y: 460 },
        { id: 'l1_hint2', type: 'fast', x: 1580, y: 460 }
      ],
      cameraZones: [
        { xStart: 1450, xEnd: 2100, zoom: 0.90 }
      ]
    },

    // -----------------------------------------------------------------------
    // LEVEL 2: BIG DUCK POND JUMPS — Requires High Speed!
    // -----------------------------------------------------------------------
    {
      id: 2,
      name: 'Duck Pond Leap',
      icon: '🦆',
      theme: 'backyard',
      starTime: 24,
      start: { x: 160, y: 460 },
      finish: { x: 3500, y: 460 },
      surfaces: [
        {
          id: 'l2_runway1',
          type: 'road',
          points: [[40, 460], [900, 460]]
        },
        {
          id: 'l2_ramp1',
          type: 'ramp',
          speedHint: 'fast',
          points: buildRampPoints(900, 460, 170, 62)
        },
        {
          id: 'l2_mid',
          type: 'road',
          points: [[1405, 460], [2310, 460]]
        },
        {
          id: 'l2_ramp2',
          type: 'ramp',
          speedHint: 'fast',
          points: buildRampPoints(2310, 460, 175, 65)
        },
        {
          id: 'l2_end',
          type: 'road',
          points: [[2855, 460], [3850, 460]]
        }
      ],
      hazards: [
        // 335 px wide pond: requires ~500+ px/s to clear!
        { id: 'l2_pond1', type: 'water', x: 1070, y: 472, w: 335, h: 110, failReason: 'too_slow' },
        // 370 px wide pond: requires near-full speed (~530+ px/s)!
        { id: 'l2_pond2', type: 'water', x: 2485, y: 472, w: 370, h: 110, failReason: 'too_slow' }
      ],
      ceilings: [],
      checkpoints: [
        { id: 'l2_cp1', x: 1820, y: 460 }
      ],
      breakables: [
        { id: 'l2_b1', type: 'cone', x: 1540, y: 460 },
        { id: 'l2_b2', type: 'boxes', x: 1640, y: 460 },
        { id: 'l2_b3', type: 'blocks', x: 3020, y: 460 },
        { id: 'l2_b4', type: 'boxes', x: 3180, y: 460 }
      ],
      hints: [
        { id: 'l2_h1', type: 'fast', x: 740, y: 460 },
        { id: 'l2_h2', type: 'fast', x: 2140, y: 460 }
      ],
      cameraZones: [
        { xStart: 620, xEnd: 1600, zoom: 0.82 },
        { xStart: 1980, xEnd: 3050, zoom: 0.80 }
      ]
    },

    // -----------------------------------------------------------------------
    // LEVEL 3: COZY ISLAND HOP — Holding Accelerate Overshoots into Foam!
    // -----------------------------------------------------------------------
    {
      id: 3,
      name: 'Careful Hop',
      icon: '🐢',
      theme: 'playroom',
      starTime: 30,
      start: { x: 160, y: 460 },
      finish: { x: 4050, y: 460 },
      surfaces: [
        {
          id: 'l3_runway1',
          type: 'road',
          speedHint: 'slow',
          points: [[40, 460], [900, 460]]
        },
        {
          id: 'l3_ramp1',
          type: 'ramp',
          speedHint: 'slow',
          points: buildRampPoints(900, 460, 170, 62)
        },
        {
          // Cozy pad at 1155..1365 (y=460), then dips under the Foam Catcher (y=550) and rises back to y=460,
          // then climbs smoothly to the Cliff Drop at y=360!
          id: 'l3_pad1',
          type: 'island',
          points: [
            ...buildCozyUnderpassPoints(1155, 460, 210, 90, 410, 2240, 460),
            ...buildSmoothSlope(2240, 460, 2550, 360, 6).slice(1),
            [2820, 360]
          ]
        },
        {
          // Second careful landing pad after Cliff Drop (x=2820, y=360):
          // Lands on 2875..3095 (y=485), then dips to y=575 underneath Foam Catcher 2!
          id: 'l3_pad2',
          type: 'island',
          points: buildCozyUnderpassPoints(2875, 485, 220, 90, 410, 4400, 460)
        }
      ],
      hazards: [
        // Tiny puddle right after ramp (only fails if practically stopped < 180 px/s)
        { id: 'l3_puddle1', type: 'water', x: 1070, y: 472, w: 85, h: 95, failReason: 'too_slow' },
        // Elevated Plush Foam Cube Catcher Tub! Full speed (> 515 px/s) flies straight into this tub!
        { id: 'l3_foam1', type: 'foam', x: 1395, y: 315, w: 385, h: 122, failReason: 'too_fast', elevated: true },

        // Tiny gap below cliff
        { id: 'l3_puddle2', type: 'mud', x: 2820, y: 495, w: 55, h: 90, failReason: 'too_slow' },
        // Second Elevated Foam Catcher Tub for cliff overshoot (> 495 px/s)!
        { id: 'l3_foam2', type: 'foam', x: 3155, y: 365, w: 390, h: 112, failReason: 'too_fast', elevated: true }
      ],
      ceilings: [
        // Soft foam backstop on the far side of each catcher tub so turbo rockets always drop into the foam!
        { id: 'l3_backstop1', x: 1745, y: 215, w: 38, h: 222, style: 'foam_roof' },
        { id: 'l3_backstop2', x: 3510, y: 255, w: 38, h: 222, style: 'foam_roof' }
      ],
      checkpoints: [
        { id: 'l3_cp1', x: 2220, y: 460 }
      ],
      breakables: [
        { id: 'l3_b1', type: 'blocks', x: 1650, y: 550 },
        { id: 'l3_b2', type: 'boxes', x: 3420, y: 575 },
        { id: 'l3_b3', type: 'cone', x: 3860, y: 460 }
      ],
      hints: [
        { id: 'l3_h1', type: 'slow', x: 710, y: 460 },
        { id: 'l3_h2', type: 'slow', x: 2640, y: 360 }
      ],
      cameraZones: [
        { xStart: 580, xEnd: 1850, zoom: 0.78 },
        { xStart: 2450, xEnd: 3650, zoom: 0.78 }
      ]
    },

    // -----------------------------------------------------------------------
    // LEVEL 4: FAST THEN CAREFUL! — Sequential Speed-Switching Combo
    // -----------------------------------------------------------------------
    {
      id: 4,
      name: 'Fast & Careful',
      icon: '⚡',
      theme: 'backyard',
      starTime: 36,
      start: { x: 160, y: 460 },
      finish: { x: 5520, y: 460 },
      surfaces: [
        // Step 1: FAST Jump across Big Pond
        {
          id: 'l4_run1',
          type: 'road',
          points: [[40, 460], [880, 460]]
        },
        {
          id: 'l4_ramp_fast1',
          type: 'ramp',
          speedHint: 'fast',
          points: buildRampPoints(880, 460, 170, 62)
        },
        // Step 2: Land on mid-runway (1390..1990) & BRAKE before careful ramp (1990..2160)!
        {
          id: 'l4_mid_brake',
          type: 'road',
          speedHint: 'slow',
          points: [[1390, 460], [1990, 460]]
        },
        {
          id: 'l4_ramp_slow1',
          type: 'ramp',
          speedHint: 'slow',
          points: buildRampPoints(1990, 460, 170, 62)
        },
        // Cozy landing pad + underpass leading to Checkpoint & Part 2
        {
          id: 'l4_under1',
          type: 'island',
          points: buildCozyUnderpassPoints(2245, 460, 220, 90, 400, 3520, 460)
        },
        // Step 3: Careful ramp FIRST, then turbo boost out of underpass to Grand Pond Jump!
        {
          id: 'l4_ramp_slow2',
          type: 'ramp',
          speedHint: 'slow',
          points: buildRampPoints(3520, 460, 165, 58)
        },
        {
          id: 'l4_under2_to_boost',
          type: 'island',
          points: buildCozyUnderpassPoints(3770, 460, 215, 90, 390, 4860, 460)
        },
        {
          id: 'l4_ramp_fast2',
          type: 'ramp',
          speedHint: 'fast',
          points: buildRampPoints(4860, 460, 175, 64)
        },
        {
          id: 'l4_finish_road',
          type: 'road',
          points: [[5385, 460], [5900, 460]]
        }
      ],
      hazards: [
        { id: 'l4_pond1', type: 'water', x: 1050, y: 472, w: 340, h: 110, failReason: 'too_slow' },
        { id: 'l4_puddle1', type: 'water', x: 2160, y: 472, w: 85, h: 95, failReason: 'too_slow' },
        { id: 'l4_foam1', type: 'foam', x: 2495, y: 315, w: 385, h: 122, failReason: 'too_fast', elevated: true },

        { id: 'l4_puddle2', type: 'mud', x: 3685, y: 472, w: 85, h: 95, failReason: 'too_slow' },
        { id: 'l4_foam2', type: 'foam', x: 4015, y: 315, w: 380, h: 122, failReason: 'too_fast', elevated: true },
        { id: 'l4_pond2', type: 'water', x: 5035, y: 472, w: 350, h: 110, failReason: 'too_slow' }
      ],
      ceilings: [
        { id: 'l4_bs1', x: 2845, y: 215, w: 38, h: 222, style: 'foam_roof' },
        { id: 'l4_bs2', x: 4360, y: 215, w: 38, h: 222, style: 'foam_roof' }
      ],
      checkpoints: [
        { id: 'l4_cp1', x: 3180, y: 460 }
      ],
      breakables: [
        { id: 'l4_b1', type: 'cone', x: 1520, y: 460 },
        { id: 'l4_b2', type: 'blocks', x: 2730, y: 550 },
        { id: 'l4_b3', type: 'boxes', x: 4250, y: 550 },
        { id: 'l4_b4', type: 'blocks', x: 5440, y: 460 }
      ],
      hints: [
        { id: 'l4_h1', type: 'fast', x: 720, y: 460 },
        { id: 'l4_h2', type: 'slow', x: 1790, y: 460 },
        { id: 'l4_h3', type: 'slow', x: 3360, y: 460 },
        { id: 'l4_h4', type: 'fast', x: 4710, y: 460 }
      ],
      cameraZones: [
        { xStart: 650, xEnd: 2920, zoom: 0.77 },
        { xStart: 3280, xEnd: 5500, zoom: 0.77 }
      ]
    },

    // -----------------------------------------------------------------------
    // LEVEL 5: PLAYSET GRAND COURSE — Hill + Cliff Drop + Tunnel + Finale!
    // -----------------------------------------------------------------------
    {
      id: 5,
      name: 'Grand Playset',
      icon: '🏆',
      theme: 'playroom',
      starTime: 44,
      start: { x: 160, y: 480 },
      finish: { x: 5880, y: 460 },
      surfaces: [
        // 1. Steep Momentum Hill (y=480 up to y=290) + High Summit Cliff
        {
          id: 'l5_hill_climb',
          type: 'hill',
          points: [
            [40, 480],
            [680, 480],
            ...buildSmoothSlope(680, 480, 1120, 290, 10).slice(1),
            [1420, 290]
          ]
        },
        // 2. Careful Drop Landing Pad (y=430) + Underpass to Checkpoint 1
        {
          id: 'l5_drop_pad',
          type: 'island',
          points: buildCozyUnderpassPoints(1475, 430, 225, 90, 390, 2680, 460)
        },
        // 3. Moderate-Speed Goldilocks Tunnel Ramp (Too slow = Mud! Too fast = Foam Roof/Tub!)
        {
          id: 'l5_tunnel_runway',
          type: 'road',
          speedHint: 'medium',
          points: [[2680, 460], [2920, 460]]
        },
        {
          id: 'l5_tunnel_ramp',
          type: 'ramp',
          speedHint: 'medium',
          points: buildRampPoints(2920, 460, 155, 48)
        },
        {
          id: 'l5_tunnel_road',
          type: 'island',
          points: buildCozyUnderpassPoints(3245, 460, 155, 88, 440, 4820, 460)
        },
        // 4. Grand Finale Big Jump!
        {
          id: 'l5_final_ramp',
          type: 'ramp',
          speedHint: 'fast',
          points: buildRampPoints(4820, 460, 175, 65)
        },
        {
          id: 'l5_final_road',
          type: 'road',
          points: [[5365, 460], [6250, 460]]
        }
      ],
      hazards: [
        { id: 'l5_mud_drop', type: 'mud', x: 1420, y: 442, w: 55, h: 95, failReason: 'too_slow' },
        { id: 'l5_foam_drop', type: 'foam', x: 1750, y: 300, w: 380, h: 112, failReason: 'too_fast', elevated: true },

        // 170 px wide mud pit before tunnel: requires >= medium speed (~345+ px/s)!
        { id: 'l5_mud_tunnel', type: 'mud', x: 3075, y: 472, w: 170, h: 100, failReason: 'too_slow' },
        // Elevated Foam Roof/Catcher over tunnel: catches full-speed (> 580 px/s) jumps!
        { id: 'l5_foam_tunnel', type: 'foam', x: 3550, y: 340, w: 395, h: 126, failReason: 'too_fast', elevated: true },

        // Final 370 px Duck Pond!
        { id: 'l5_pond_final', type: 'water', x: 4995, y: 472, w: 370, h: 115, failReason: 'too_slow' }
      ],
      ceilings: [
        { id: 'l5_bs1', x: 2095, y: 200, w: 38, h: 212, style: 'foam_roof' },
        // Hanging soft foam tunnel entrance banner + backstop
        { id: 'l5_tunnel_arch', x: 3550, y: 245, w: 42, h: 210, style: 'foam_roof' },
        { id: 'l5_bs2', x: 3910, y: 235, w: 38, h: 220, style: 'foam_roof' }
      ],
      checkpoints: [
        { id: 'l5_cp1', x: 2480, y: 460 },
        { id: 'l5_cp2', x: 4320, y: 460 }
      ],
      breakables: [
        { id: 'l5_b1', type: 'blocks', x: 1180, y: 290 },
        { id: 'l5_b2', type: 'boxes', x: 1960, y: 520 },
        { id: 'l5_b3', type: 'cone', x: 3720, y: 548 },
        { id: 'l5_b4', type: 'blocks', x: 5480, y: 460 },
        { id: 'l5_b5', type: 'boxes', x: 5610, y: 460 },
        { id: 'l5_b6', type: 'cone', x: 5730, y: 460 }
      ],
      hints: [
        { id: 'l5_h1', type: 'fast', x: 530, y: 480 },
        { id: 'l5_h2', type: 'slow', x: 1270, y: 290 },
        { id: 'l5_h3', type: 'medium', x: 2770, y: 460 },
        { id: 'l5_h4', type: 'fast', x: 4660, y: 460 }
      ],
      cameraZones: [
        { xStart: 500, xEnd: 2200, zoom: 0.76 },
        { xStart: 2650, xEnd: 4000, zoom: 0.78 },
        { xStart: 4550, xEnd: 5600, zoom: 0.78 }
      ]
    }
  ];

  window.Zoomy.Levels = {
    count: LEVEL_DEFINITIONS.length,
    getRawList() {
      return LEVEL_DEFINITIONS;
    },
    getLevelClone(index) {
      const clamped = Math.max(0, Math.min(LEVEL_DEFINITIONS.length - 1, index));
      return JSON.parse(JSON.stringify(LEVEL_DEFINITIONS[clamped]));
    },
    helpers: {
      buildRampPoints,
      buildSmoothSlope,
      buildCozyUnderpassPoints
    }
  };
})();
