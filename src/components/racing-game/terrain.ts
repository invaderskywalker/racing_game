// src/components/racing-game/terrain.ts
import * as THREE from 'three';

export interface TerrainOptions {
  width?: number;
  depth?: number;
  resolution?: number;
  amplitude?: number;
  [key: string]: unknown;
}

export class ProceduralTerrain {
  geometry: THREE.PlaneGeometry;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  width: number;
  depth: number;
  resolution: number;
  amplitude: number;

  constructor(options?: TerrainOptions) {
    this.width = options?.width ?? 26;
    this.depth = options?.depth ?? 54;
    this.resolution = options?.resolution ?? 84;
    this.amplitude = options?.amplitude ?? 0.35;
    this.geometry = new THREE.PlaneGeometry(this.width, this.depth, this.resolution, this.resolution);
    for (let i = 0; i < this.geometry.attributes.position.count; i++) {
      const x = this.geometry.attributes.position.getX(i);
      const y = this.geometry.attributes.position.getY(i);
      const elevation = this.amplitude * (
        Math.sin((x + 12.7) * 0.23) * Math.cos((y - 7.4) * 0.19) +
        0.33 * Math.sin((x + y) * 0.31)
      );
      this.geometry.attributes.position.setZ(i, elevation);
    }
    this.geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: 0xc6b972,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: false
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.0;
  }

  /** Return terrain height at given (x,z) in world space (approximate, no interpolation) */
  getHeightAt(x: number, z: number): number {
    // PlaneGeometry center is at (0, 0)
    const g = this.geometry;
    const segmentsX = g.parameters.widthSegments;
    const segmentsZ = g.parameters.heightSegments;
    const minX = -this.width / 2;
    const minZ = -this.depth / 2;
    const dx = this.width / segmentsX;
    const dz = this.depth / segmentsZ;
    const ix = Math.floor((x - minX) / dx);
    const iz = Math.floor((z - minZ) / dz);
    if (ix < 0 || ix > segmentsX || iz < 0 || iz > segmentsZ) return 0;
    const vertIndex = iz * (segmentsX + 1) + ix;
    const y = g.attributes.position.getZ(vertIndex);
    return y ?? 0;
  }
}

export function createTerrain(options?: TerrainOptions): ProceduralTerrain {
  return new ProceduralTerrain(options);
}
