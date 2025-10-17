// src/components/racing-game/world.ts (with instanced environment assets)
import * as THREE from 'three';
import { createTerrain, ProceduralTerrain, TerrainOptions } from './terrain';
import { createCurvedTrack } from './track';
import { createEnvironmentInstancedAssets } from './environment';

export interface WorldOptions {
  [key: string]: unknown;
}

export function createWorld(options?: WorldOptions): THREE.Group {
  const world: THREE.Group = new THREE.Group();

  // --- Gradient Sky Shader with FOG (unchanged) ---
  const skyGeo = new THREE.SphereGeometry(90, 32, 16);
  const fogNear = 18.0;
  const fogFar = 65.0;
  const fogColor = new THREE.Color(0x6ec6ff);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x6ec6ff) },
      bottomColor: { value: new THREE.Color(0xfaf6db) },
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

  // --- Lighting (unchanged) ---
  const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.65);
  world.add(ambientLight);
  const dirLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 0.65);
  dirLight.position.set(8, 12, 10);
  dirLight.castShadow = true;
  world.add(dirLight);

  // --- Procedural Terrain (via terrain.ts) ---
  const terrain = createTerrain();
  world.add(terrain.mesh);

  // --- Curved Track (conforming to terrain) ---
  const curvedTrack = createCurvedTrack(terrain);
  world.add(curvedTrack);

  // --- Instanced Environment Assets (trees and rocks) ---
  // Reuse curve from track for road avoidance
  const trackCurve = (() => {
    // extract the curve from createCurvedTrack inputs
    // here, we reconstruct the curve for use in the environment module to reduce cross-module coupling.
    // Alternatively, the track/curve object could be returned by createCurvedTrack for better cooperation.
    // We'll reimplement curve logic to match track shape:
    const length = 36;
    const curvature = 0.30;
    const segments = 82;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = Math.sin(t * Math.PI * 2) * curvature * length * 0.5;
      const z = t * length - length / 2;
      const y = terrain.getHeightAt(x, z) + 0.03;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  })();
  const environmentGroup = createEnvironmentInstancedAssets(terrain, {
    trackCurve: trackCurve,
    assets: [
      {
        type: 'tree',
        count: 120,
        minDistanceFromTrack: 2.7,
        color: 0x2c6e26,
        scale: [0.8, 1.22]
      },
      {
        type: 'rock',
        count: 60,
        minDistanceFromTrack: 2.2,
        color: 0x8b8b7a,
        scale: [0.5, 1.1]
      }
    ],
    randomSeed: (options?.envSeed as number) || 93713,
    terrainMargin: 1.5,
    steepnessLimit: 35,
    trackSegments: 100
  });
  world.add(environmentGroup);

  return world;
}
