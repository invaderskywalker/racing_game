// src/components/racing-game/environment.ts
import * as THREE from 'three';
import { ProceduralTerrain } from './terrain';

export interface EnvironmentAsset {
  type: 'tree' | 'rock';
  count: number;
  minDistanceFromTrack: number;
  meshFactory?: () => THREE.BufferGeometry; // Optional: custom mesh per asset
  color?: number;
  scale?: [number, number]; // min/max uniform scale
}

export interface EnvironmentOptions {
  assets: EnvironmentAsset[];
  trackCurve: THREE.Curve<THREE.Vector3>;
  trackSegments?: number;
  steepnessLimit?: number; // e.g., max allowed angle in degrees for placement
  randomSeed?: number;
  terrainMargin?: number; // how close to edge to avoid placing
}

/**
 * Compute the minimal distance from (x, z) point to the provided trackCurve.
 */
function minDistanceToCurve(x: number, z: number, curve: THREE.Curve<THREE.Vector3>, segments: number): number {
  let minDist = Infinity;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const dx = x - p.x;
    const dz = z - p.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

/**
 * Helper to optionally seed Math.random for reproducibility.
 * Very basic, not cryptographically secure!
 */
function seedRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    return (s = s * 16807 % 2147483647) / 2147483647;
  };
}

/**
 * Exports a group containing instanced environment assets (trees/rocks) scattered on the terrain.
 * Avoids areas too close to the track. Efficient, future-extensible.
 */
export function createEnvironmentInstancedAssets(
  terrain: ProceduralTerrain,
  options: EnvironmentOptions
): THREE.Group {
  const group = new THREE.Group();
  const rng = options.randomSeed ? seedRandom(options.randomSeed) : Math.random;

  // Determine terrain bounds
  const width = terrain.width;
  const depth = terrain.depth;
  const margin = options.terrainMargin || 1.4; // avoid placing right at edge

  for (const asset of options.assets) {
    // Pick mesh geometry and color per asset type
    let geometry: THREE.BufferGeometry;
    if (asset.meshFactory) {
      geometry = asset.meshFactory();
    } else {
      geometry =
        asset.type === 'tree' ?
          new THREE.ConeGeometry(0.18, 1.0, 7) :
          new THREE.DodecahedronGeometry(0.21);
    }
    const mat = new THREE.MeshStandardMaterial({
      color: asset.color || (asset.type === 'tree' ? 0x3b882d : 0x708090),
      roughness: 0.83,
      flatShading: true
    });
    const instancedMesh = new THREE.InstancedMesh(geometry, mat, asset.count);
    let placed = 0;
    let attempts = 0;
    const maxAttempts = asset.count * 32;
    const segments = options.trackSegments || 120;
    const steepnessLimit = options.steepnessLimit || 42; // in degrees
    while (placed < asset.count && attempts < maxAttempts) {
      attempts++;
      const x = (rng() - 0.5) * (width - margin * 2);
      const z = (rng() - 0.5) * (depth - margin * 2);
      const y = terrain.getHeightAt(x, z);
      // Steepness check
      const g = terrain.geometry;
      const ix = Math.floor(((x + width / 2) / width) * g.parameters.widthSegments);
      const iz = Math.floor(((z + depth / 2) / depth) * g.parameters.heightSegments);
      const vertIdx = iz * (g.parameters.widthSegments + 1) + ix;
      const nx = g.attributes.normal.getX(vertIdx);
      const ny = g.attributes.normal.getY(vertIdx);
      const nz = g.attributes.normal.getZ(vertIdx);
      const angle = Math.acos(Math.abs(ny)) * 180 / Math.PI;
      if (angle > steepnessLimit) continue;

      // Track avoidance
      const dTrack = minDistanceToCurve(x, z, options.trackCurve, segments);
      if (dTrack < asset.minDistanceFromTrack) continue;

      // Instance transform
      const matrix = new THREE.Matrix4();
      const sMin = asset.scale ? asset.scale[0] : 0.9;
      const sMax = asset.scale ? asset.scale[1] : 1.2;
      const scale = sMin + (sMax - sMin) * rng();
      matrix.makeTranslation(x, y, z);
      matrix.multiply(new THREE.Matrix4().makeRotationY(rng() * Math.PI * 2));
      matrix.multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
      instancedMesh.setMatrixAt(placed, matrix);
      placed++;
    }
    group.add(instancedMesh);
  }
  return group;
}
