// src/components/racing-game/track.ts
import * as THREE from 'three';
import { ProceduralTerrain } from './terrain';

export interface TrackOptions {
  width?: number;
  length?: number;
  curvature?: number;
  segments?: number;
  yOffset?: number; // height offset above terrain
}

/**
 * Create a curved racing track that conforms to terrain height.
 * Returns the THREE.Mesh for the ribbon road.
 */
export function createCurvedTrack(
  terrain: ProceduralTerrain,
  options?: TrackOptions
): THREE.Mesh {
  const width = options?.width ?? 7;
  const length = options?.length ?? 36;
  const curvature = options?.curvature ?? 0.30;
  const segments = options?.segments ?? 82;
  const yOffset = options?.yOffset ?? 0.03;

  // Generate a set of curve points for the centerline (wavy S-curve example)
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = Math.sin(t * Math.PI * 2) * curvature * length * 0.5;
    const z = t * length - length / 2;
    const y = terrain.getHeightAt(x, z) + yOffset;
    points.push(new THREE.Vector3(x, y, z));
  }

  // Create curve
  const curve = new THREE.CatmullRomCurve3(points);

  // Build a ribbon geometry by generating two points (left/right) at each centerline sample
  const geometry = new THREE.BufferGeometry();
  const trackVertices = [];
  const trackIndices = [];
  let idx = 0;
  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;
    // Center points and directions
    const p1 = curve.getPoint(t1);
    const p2 = curve.getPoint(t2);
    const tangent = p2.clone().sub(p1).normalize();
    const left = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Build two vertices per point (left and right side of the road)
    const vLeft1 = p1.clone().add(left.clone().multiplyScalar(width / 2));
    const vRight1 = p1.clone().add(left.clone().multiplyScalar(-width / 2));
    const vLeft2 = p2.clone().add(left.clone().multiplyScalar(width / 2));
    const vRight2 = p2.clone().add(left.clone().multiplyScalar(-width / 2));
    // Add vertices
    trackVertices.push(...vLeft1.toArray(), ...vRight1.toArray(), ...vLeft2.toArray(), ...vRight2.toArray());
    // Add two triangles (indices)
    trackIndices.push(idx, idx + 2, idx + 1);
    trackIndices.push(idx + 2, idx + 3, idx + 1);
    idx += 4;
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(trackVertices, 3));
  geometry.setIndex(trackIndices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ color: 0x353535 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;

  return mesh;
}
