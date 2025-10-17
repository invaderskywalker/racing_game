// src/components/racing-game/world.ts
import * as THREE from 'three';

export interface WorldOptions {
  /**
   * options for future (e.g. terrain roughness, sky gradient colors, fog config, etc.)
   */
  [key: string]: unknown;
}

/**
 * Builds the racing world with procedural terrain, gradient sky, lighting, and fog blended into the sky.
 * Returns a THREE.Group containing all world objects. Strong TypeScript types applied.
 */
export function createWorld(options?: WorldOptions): THREE.Group {
  const world: THREE.Group = new THREE.Group();

  // --- Gradient Sky Shader with FOG ---
  const skyGeo = new THREE.SphereGeometry(90, 32, 16);
  const fogNear = 18.0; // where fog starts
  const fogFar = 65.0; // max fog
  const fogColor = new THREE.Color(0x6ec6ff); // should match topColor
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x6ec6ff) }, // sky blue
      bottomColor: { value: new THREE.Color(0xfaf6db) }, // light sand horizon
      offset: { value: 18 },
      exponent: { value: 0.96 },
      fogColor: { value: fogColor },
      fogNear: { value: fogNear },
      fogFar: { value: fogFar }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        float grad = max(pow(max(h, 0.0), exponent), 0.0);
        vec3 baseColor = mix(bottomColor, topColor, grad);
        // Fog computation, depth from camera assumed to be vWorldPosition.z
        float depth = length(vWorldPosition);
        float fogAmount = smoothstep(fogNear, fogFar, depth);
        vec3 finalColor = mix(baseColor, fogColor, fogAmount);
        gl_FragColor = vec4(finalColor, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  world.add(sky);

  // --- Lighting ---
  const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.65);
  world.add(ambientLight);
  const dirLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 0.65);
  dirLight.position.set(8, 12, 10);
  dirLight.castShadow = true;
  world.add(dirLight);

  // --- Procedural Terrain (vertex displaced ground) ---
  const terrainWidth = 26;
  const terrainDepth = 54;
  const terrainRes = 84;
  const terrainGeom = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainRes, terrainRes);
  for (let i = 0; i < terrainGeom.attributes.position.count; i++) {
    const x = terrainGeom.attributes.position.getX(i);
    const y = terrainGeom.attributes.position.getY(i);
    const elevation = 0.35 * (
      Math.sin((x + 12.7) * 0.23) * Math.cos((y - 7.4) * 0.19) +
      0.33 * Math.sin((x + y) * 0.31)
    );
    terrainGeom.attributes.position.setZ(i, elevation);
  }
  terrainGeom.computeVertexNormals();
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xc6b972,
    roughness: 0.85,
    metalness: 0.0,
    flatShading: false
  });
  const terrainMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> = new THREE.Mesh(
    terrainGeom,
    terrainMat
  );
  terrainMesh.receiveShadow = true;
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.y = 0.0;
  world.add(terrainMesh);

  // --- Track (overlay ribbon for racing path) ---
  const trackGeometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(8, 36);
  const trackMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({ color: 0x353535 });
  const track: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> = new THREE.Mesh(trackGeometry, trackMaterial);
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.03; // just above terrain bumps
  world.add(track);

  // Future extension: use options to tune fog/sky/terrain parameters dynamically
  return world;
}
