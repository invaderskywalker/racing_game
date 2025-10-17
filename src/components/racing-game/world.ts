// src/components/racing-game/world.ts
import * as THREE from 'three';

export interface WorldOptions {
  // Future extensibility: allow themes, decorations, etc.
  [key: string]: unknown;
}

/**
 * Builds the racing world: ground plane, lighting, and (optionally) decorations.
 * Returns a THREE.Group containing all world objects. Strong TypeScript types applied.
 */
export function createWorld(options?: WorldOptions): THREE.Group {
  const world: THREE.Group = new THREE.Group();

  // --- Lighting ---
  // Ambient Light
  const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.7);
  world.add(ambientLight);

  // Directional Light
  const dirLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, 8);
  world.add(dirLight);

  // --- Track / Ground Plane ---
  const trackGeometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(12, 36);
  const trackMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({ color: 0x353535 });
  const track: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> = new THREE.Mesh(trackGeometry, trackMaterial);
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.0;
  world.add(track);

  // Future: add props, scenery, sky, etc., using typed objects and arrays as extensions.

  return world;
}
