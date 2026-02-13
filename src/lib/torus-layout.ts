/**
 * Torus Surface Positioning Math
 *
 * Parametric torus (major circle in XZ plane, tube cross-section in Y):
 *   x = (R + r·cos(φ)) · cos(θ)
 *   y = r · sin(φ)
 *   z = (R + r·cos(φ)) · sin(θ)
 *
 * R = major radius (center of torus to center of tube)
 * r = minor radius (radius of the tube)
 * θ = angle around major circle (XZ plane) — from archetype angleDeg
 * φ = angle around minor circle (cross-section) — from element type
 *
 * Element zones on the tube cross-section:
 *   Fire  → φ =  π/2  (top of tube, y = +r)
 *   Water → φ =  0    (outer equator, y = 0)
 *   Earth → φ = -π/2  (bottom of tube, y = -r)
 */

export const TORUS_MAJOR = 20;
export const TORUS_MINOR = 8;

const DEG2RAD = Math.PI / 180;

/** φ angle for each element on the tube cross-section */
export const ELEMENT_PHI: Record<string, number> = {
  fire: Math.PI / 2,
  water: 0,
  earth: -Math.PI / 2,
};

/**
 * Compute a point on the torus surface.
 * @param theta - angle around major circle (radians)
 * @param phi - angle around minor circle (radians)
 * @param R - major radius (default TORUS_MAJOR)
 * @param r - minor radius (default TORUS_MINOR)
 */
export function torusPoint(
  theta: number,
  phi: number,
  R: number = TORUS_MAJOR,
  r: number = TORUS_MINOR,
): [number, number, number] {
  return [
    (R + r * Math.cos(phi)) * Math.cos(theta),
    r * Math.sin(phi),
    (R + r * Math.cos(phi)) * Math.sin(theta),
  ];
}

/**
 * Position an archetype node on the torus surface.
 * θ from angleDeg, φ from element type.
 */
export function archetypeTorusPosition(
  angleDeg: number,
  element: string,
): [number, number, number] {
  const theta = angleDeg * DEG2RAD;
  const phi = ELEMENT_PHI[element] ?? 0;
  return torusPoint(theta, phi);
}

/**
 * Position a canon object near its parent archetype on the torus.
 * Children spread along the minor circle (φ direction) at a slightly
 * reduced minor radius so they sit just inside the tube near the parent.
 *
 * @param parentAngleDeg - parent archetype's θ in degrees
 * @param parentElement - parent's element type
 * @param childIndex - this child's index within the parent's canonIds
 * @param childCount - total number of children in the parent
 * @param inset - how far inside the tube (default 2 units inside surface)
 */
export function canonTorusPosition(
  parentAngleDeg: number,
  parentElement: string,
  childIndex: number,
  childCount: number,
  inset: number = 2,
): [number, number, number] {
  const theta = parentAngleDeg * DEG2RAD;
  const parentPhi = ELEMENT_PHI[parentElement] ?? 0;

  // Spread children along φ around the parent's φ
  const spreadStep = 0.35; // radians between children
  const phiOffset = (childIndex - (childCount - 1) / 2) * spreadStep;
  const childPhi = parentPhi + phiOffset;

  // Slightly smaller minor radius to keep children inside the tube
  return torusPoint(theta, childPhi, TORUS_MAJOR, TORUS_MINOR - inset);
}

/**
 * Camera preset positions for the three canonical views.
 * Each returns { position, lookAt } for camera animation.
 */
export const CAMERA_PRESETS = {
  /** Bird's-eye / top-down — see ONE circle */
  above: {
    position: [0, 55, 0.01] as [number, number, number],
    lookAt: [0, 0, 0] as [number, number, number],
  },
  /** Side / equatorial — see THREE levels */
  equator: {
    position: [0, 2, 55] as [number, number, number],
    lookAt: [0, 0, 0] as [number, number, number],
  },
  /** Inside the torus tube */
  inside: {
    position: [18, 3, 0] as [number, number, number],
    lookAt: [0, 0, 0] as [number, number, number],
  },
} as const;

export type CameraPreset = keyof typeof CAMERA_PRESETS;
