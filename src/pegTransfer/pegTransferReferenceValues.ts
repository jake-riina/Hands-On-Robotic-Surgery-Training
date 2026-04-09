/**
 * Screenshot-derived reference values for Peg Transfer visual/spatial calibration.
 *
 * Purpose:
 * - Store "ground-truth-ish" observations in one place.
 * - Keep these values decoupled from runtime behavior until explicitly used.
 *
 * Source:
 * - User-provided Da Vinci peg transfer screenshots (Mar 2026).
 *
 * Notes:
 * - Values are approximate and intended as initialization defaults.
 * - Keep this file as a tuning reference log.
 */

export type RatioRange = {
  min: number;
  max: number;
  defaultValue: number;
};

export type ScreenAnchor = {
  /** Fraction of viewport width from left edge [0..1] */
  xFrac: number;
  /** Fraction of viewport height from top edge [0..1] */
  yFrac: number;
};

export const pegTransferReferenceValues = {
  geometryAnchors: {
    /**
     * Prototype anchor used to convert screenshot-derived ratios into world meters.
     * Update this once ring mesh dimensions are finalized.
     */
    ringMajorDiameterM: 0.04,
  },

  lightingDefaults: {
    /**
     * Endoscope-mounted key light defaults.
     * Matches current PegTransferScene prototype values.
     */
    endoscopePointLight: {
      intensity: 1.2,
      distance: 3.2,
      decay: 2.0,
      /**
       * Small forward offset from camera position to improve depth cueing
       * and avoid perfectly flat head-on illumination.
       */
      forwardOffsetM: 0.08,
      colorHex: '#f8fafc',
    },

    /**
     * Global fill kept intentionally low so the endoscope key remains dominant.
     * Matches current PegTransfer.tsx values.
     */
    fill: {
      ambientIntensity: 0.065,
      directionalKeyA: {
        intensity: 0.16,
        colorHex: '#f3f4f6',
        position: [2.2, 3.8, 1.4] as const,
      },
      directionalKeyB: {
        intensity: 0.08,
        colorHex: '#93c5fd',
        position: [-1.2, 2.2, -0.6] as const,
      },
    },
  },

  motionDampeningDefaults: {
    /**
     * First-pass exponential smoothing for tool tip position published to worldFrameRef.
     * Formula per frame: smoothed = lerp(smoothed, target, alpha)
     *
     * IMPORTANT:
     * - Apply to final tip position only (worldFrame publication path).
     * - Do not apply to RCM pivot/trocar constraint math.
     */
    tipPositionLerpAlphaPerFrame: 0.18,
    /**
     * Reminder: revisit in ~10 prompts to evaluate delta-time normalization and
     * edge-case reset behavior (clutch transitions / reconnects).
     */
    revisitAfterPrompts: 10,
  },

  startupCalibrationRemap: {
    /**
     * Keep physical startup/calibration at the inkwell, but remap the software neutral
     * so initial task motion is centered in a larger, more ergonomic pegboard workspace.
     *
     * Derived from validated operator workflow (both arms):
     * - inkwell -> pre-clutch: (0, +49, +8) mm
     * - pre-clutch -> centered: (0, +16, +80) mm
     * - total inkwell -> effective neutral: (0, +65, +88) mm
     */
    enabled: true,
    /**
     * Device-space delta (mm) added to captured inkwell calibration position
     * before writing neutralMmRef.
     */
    inkwellToEffectiveNeutralMm: [0, 65, 88] as const,
  },

  pegboardDefaults: {
    /**
     * Board dimensions used by Pegboard.tsx.
     * Width is derived from viewport composition ratio and this world-space base.
     */
    boardBaseWorldWidthM: 1.35,
    boardHeightToWidth: 0.45,
    boardThicknessToWidth: 0.08,

    /**
     * Initial peg field layout for 2 columns x 5 rows.
     * Tuned to appear in initial camera framing.
     */
    pegField: {
      rowsPerColumn: 5,
      columnDistanceM: 0.35,
      rowSpacingM: 0.12,
      /**
       * Translates both peg columns downward in board local-space.
       * Increase this value if top pegs approach the board edge.
       */
      translateDownM: 0.08,
      /**
       * Vertical center of the peg field in board local-space (meters).
       * Positive values move pegs upward on the board.
       */
      centerYOffsetM: 0.08,
      pegRadiusM: 0.018,
      pegHeightM: 0.045,
      pegColorHex: '#cfd4dc',
    },
  },

  ringDefaults: {
    /** Torus major radius in meters. */
    majorRadiusM: 0.033,
    /** Torus tube radius in meters. */
    tubeRadiusM: 0.0048,
    /**
     * Local offset from peg tip toward board for initial "hanging" pose.
     * Lower values keep ring closer to peg tip.
     */
    hangOffsetFromPegTopM: 0.012,
    leftOriginColorHex: '#e5e7eb',
    rightOriginColorHex: '#facc15',
  },

  interactionDefaults: {
    /** Sphere test vs ring center: min distance to biteMid or either jaw-tip anchor (see ringInteraction). */
    pickupRadiusM: 0.028,
    graspClosureThreshold: 0.8,
    releaseClosureThreshold: 0.5,
    snapRadiusM: 0.05,
    snapDurationMs: 120,
    pegClearanceLiftM: 0.016,
  },

  instrumentToRing: {
    /**
     * Instrument shaft diameter relative to ring major diameter.
     * ratio = shaftDiameter / ringMajorDiameter
     */
    shaftDiameterToRingMajorDiameter: {
      min: 0.28,
      max: 0.35,
      defaultValue: 0.32,
    } satisfies RatioRange,

    /**
     * Instrument shaft diameter relative to rendered torus outer diameter (2*(major+tube)).
     * PegWorldTool visual scale — does not affect RCM.
     */
    shaftDiameterToRingOuterDiameter: {
      min: 0.28,
      max: 0.38,
      defaultValue: 0.32,
    } satisfies RatioRange,

    /**
     * Jaw width relative to ring major diameter.
     * ratio = jawWidth / ringMajorDiameter
     */
    jawWidthToRingMajorDiameter: {
      min: 0.65,
      max: 0.85,
      defaultValue: 0.75,
    } satisfies RatioRange,

    /**
     * Jaw stack width relative to torus outer diameter (visual / grasp silhouette).
     */
    jawWidthToRingOuterDiameter: {
      min: 0.36,
      max: 0.48,
      defaultValue: 0.4,
    } satisfies RatioRange,

    /**
     * Jaw separation controls (meters in tool-local space).
     * - openSepM: distance between jaw centers when grip = 0
     * - closedSepM: distance between jaw centers when grip = 1
     */
    jawSeparationM: {
      openSepM: 0.018,
      closedSepM: 0.006,
    },
  },

  /**
   * Single source of truth for the triangulated trocar rig (camera + left + right)
   * and the pegboard/task center they converge on.
   *
   * Tuning rules:
   * - `rigidTranslationWorldM`: add the SAME vector to all three trocars (rigid translation).
   *   Does not change triangle shape or break RCM (fixed fulcrum + trocar→tip math).
   * - `rigTranslationTowardBoardM` + `extraTranslationTowardBoardM`: slide all three along
   *   (convergence − cameraTrocar) after reconciliation scale.
   * - Change `convergenceWorldM` to move the pegboard center in world space (rings, layout).
   */
  worldRig: {
    convergenceWorldM: [0, 1.05, -0.9] as const,
    defaultCameraTrocarWorldM: [0, -0.5, 2.2] as const,
    defaultLeftTrocarWorldM: [-1.4, -0.8, 1.6] as const,
    defaultRightTrocarWorldM: [1.4, -0.8, 1.6] as const,
    /**
     * Scale each default trocar corner toward/away from convergence (1 = use defaults as-is).
     */
    reconciliationScaleTowardConvergence: 1,
    /** Primary slide of all trocars toward the board along cameraTrocar → convergence (m). */
    rigTranslationTowardBoardM: 2,
    /** Additional slide along the same axis (m). */
    extraTranslationTowardBoardM: 0,
    /** Rigid XYZ offset applied equally to camera + left + right trocar (m). */
    rigidTranslationWorldM: [0, 0, 0] as const,
    /** Fulcrum-to-camera distance for constrained surgical camera mode (m). */
    cameraConstrainedArmLengthM: 0.78,
    /**
     * Instrument shaft neutral direction (before device lateral offsets):
     * - false: legacy — camera forward (0,0,-1) in fixed camera basis (parallel for both arms).
     * - true: each arm’s shaft aims from instrument trocar toward `convergenceWorldM`; ox/oy tilt in the tangent plane. RCM unchanged (tip = trocar + insertion × dir).
     */
    instrumentNeutralAimsAtBoardCenter: true,
    /**
     * Added to the nominal insertion baseline for the left arm only (meters, same units as
     * `rcmKinematics` DEFAULT_INSERTION). Shifts tip along the shaft when the left device cannot
     * vary depth (e.g. stuck Z) or when using a longer left instrument.
     */
    leftInsertionBaselineOffsetM: 0,
    /**
     * When true, device X/Y will map through tip-space kinematics (seed-camera frame + RCM projection).
     * Default off until Step 6+ wiring is complete.
     */
    useTipSpaceMapping: false,
    /**
     * Legacy board-aim path: blend factor for X tangent basis in `buildBoardAimTangents`.
     * - 0: preserve existing projected camera-right behavior (no change).
     * - 1: fully use board-horizontal tangent candidate.
     * Peg Transfer only; does not affect non-peg modules.
     */
    legacyXBasisBlend: 1,
  },

  viewportComposition: {
    /**
     * Visible shaft length as fraction of viewport height.
     * ratio = visibleShaftLengthPx / viewportHeightPx
     */
    visibleShaftLengthToViewportHeight: {
      min: 0.45,
      max: 0.62,
      defaultValue: 0.54,
    } satisfies RatioRange,

    /**
     * Pegboard width as fraction of viewport width.
     * ratio = boardWidthPx / viewportWidthPx
     */
    pegboardWidthToViewportWidth: {
      min: 0.78,
      max: 0.88,
      defaultValue: 0.83,
    } satisfies RatioRange,

    /**
     * Camera-to-pegboard apparent depth category from screenshots.
     */
    boardDepthCategory: 'mid-ground' as const,
  },

  trocarEntry: {
    /**
     * Screen entry anchors (approx) for shaft emergence.
     * Lower corners with slight inward toe-in.
     */
    leftEntryApprox: {
      xFrac: 0.09,
      yFrac: 0.92,
    } satisfies ScreenAnchor,
    rightEntryApprox: {
      xFrac: 0.91,
      yFrac: 0.92,
    } satisfies ScreenAnchor,

    /**
     * Inward angle from vertical for shaft axis (degrees).
     */
    leftAngleFromVerticalDeg: {
      min: 24,
      max: 34,
      defaultValue: 30,
    } satisfies RatioRange,
    rightAngleFromVerticalDeg: {
      min: 22,
      max: 32,
      defaultValue: 28,
    } satisfies RatioRange,
  },

  visibility: {
    /** Instruments are cropped; proximal sections are off-screen. */
    instrumentFullLengthVisible: false,
    instrumentIsCropped: true,
  },
} as const;

export type PegTransferReferenceValues = typeof pegTransferReferenceValues;

/** Torus outer diameter (m) — matches [PegRings] torusGeometry. */
export const RING_OUTER_M =
  2 *
  (pegTransferReferenceValues.ringDefaults.majorRadiusM + pegTransferReferenceValues.ringDefaults.tubeRadiusM);

/** Clear inner opening of torus hole (m). */
export const RING_INNER_CLEAR_M =
  2 *
  (pegTransferReferenceValues.ringDefaults.majorRadiusM - pegTransferReferenceValues.ringDefaults.tubeRadiusM);
