// src/components/racing-game/world.ts
import * as THREE from 'three';

/**
 * Builds the racing world: ground plane, lighting, and (optionally) decorations.
 * Returns a THREE.Group containing all world objects and sets scene-level properties.
 * Accepts an optional options object for extensibility (future themes, decorations, etc).
 */
export function createWorld(options?: Record<string, unknown>) {
  const world = new THREE.Group();
  // --- Lighting ---
  // Ambient Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  world.add(ambientLight);
  // Directional Light
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, 8);
  world.add(dirLight);

  // --- Track / Ground Plane ---
  const trackGeometry = new THREE.PlaneGeometry(12, 36);
  const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x353535 });
  const track = new THREE.Mesh(trackGeometry, trackMaterial);
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.0;
  world.add(track);

  // [Future: add more props, decorations, sky, surrounding scenery, etc]

  return world;
}
