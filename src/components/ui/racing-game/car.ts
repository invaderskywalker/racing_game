// src/components/ui/racing-game/car.ts
// RacingCar3D class now loads a GLB Tesla Model S using GLTFLoader
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class RacingCar3D extends THREE.Group {
  public isLoaded: boolean = false;
  public model?: THREE.Object3D;
  constructor() {
    super();
    // Begin loading the Tesla GLB model
    const loader = new GLTFLoader();
    loader.load(
      '/models/tesla_model_s_plaid_2023.glb',
      (gltf) => {
        // Extract the root object
        this.model = gltf.scene;
        // OPTIONAL: Center and scale the model
        this.model.traverse((child: any) => {
          if (child.isMesh) {
            // Enable shadows
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        // Scale: Adjust to roughly match the size of the old procedural car
        // The procedural car was ~1.1m wide, 2.0m long, y=up
        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        if (size.x && size.z) {
          const targetWidth = 1.1;
          const targetLength = 2.0;
          const scale = Math.min(targetWidth / size.x, targetLength / size.z);
          this.model.scale.setScalar(scale);
        } else {
          this.model.scale.setScalar(1.0);
        }
        // Center model so its base is on y=0 (resting on ground)
        box.setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const minY = box.min.y;
        this.model.position.sub(center); // Center at origin
        this.model.position.y = minY;   // Lower to base
        // Fix: rotate model so its front faces +Z (matching game forward direction)
        this.model.rotation.y = -Math.PI / 2;
        this.add(this.model);
        this.isLoaded = true;
      },
      undefined,
      (err) => {
        // Failed to load, optionally display a fallback and set isLoaded false.
        // console.error('Failed to load car model:', err);
      }
    );
  }
}
