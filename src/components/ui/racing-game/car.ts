// src/components/ui/racing-game/car.ts
// Three.js Car class for racing game (modular, reusable)
import * as THREE from 'three';

export class RacingCar3D extends THREE.Group {
  public body: THREE.Mesh;
  public wheels: THREE.Mesh[];
  constructor() {
    super();
    // Car body
    const carBodyGeometry = new THREE.BoxGeometry(1.1, 0.48, 2.2);
    const carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00bfff });
    this.body = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
    this.body.position.set(0, 0.28, 0);
    this.add(this.body);
    // Four wheels
    this.wheels = [];
    const wheelGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 24);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222 });
    const wheelPositions = [
      [+0.43, 0.11, +0.80],
      [-0.43, 0.11, +0.80],
      [+0.43, 0.11, -0.80],
      [-0.43, 0.11, -0.80]
    ];
    for (const [x, y, z] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(x, y, z);
      wheel.rotation.z = Math.PI / 2;
      this.add(wheel);
      this.wheels.push(wheel);
    }
  }
}
