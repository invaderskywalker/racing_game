// RacingCar3D with engine sound (attach to AudioListener)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class RacingCar3D extends THREE.Group {
  public isLoaded: boolean = false;
  public model?: THREE.Object3D;
  private engineSound?: THREE.PositionalAudio;
  private static engineBuffer?: AudioBuffer; // Only loaded once for all cars
  private static engineBufferLoading: boolean = false;
  private static engineCallbacks: ((buffer: AudioBuffer | null) => void)[] = [];
  private audioListener: THREE.AudioListener | null = null;
  constructor(audioListener?: THREE.AudioListener) {
    super();
    this.audioListener = audioListener || null;
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
        this.model.position.sub(center);
        this.model.position.y = minY;
        // Fix: rotate model so its front faces +Z (matching game forward direction)
        this.model.rotation.y = -Math.PI / 2;
        this.add(this.model);
        this.isLoaded = true;
      },
      undefined,
      (err) => { /* Could log error */ }
    );
    // Setup engine sound (if listener provided)
    if (this.audioListener) {
      this.setupEngineSound(this.audioListener);
    }
  }
  // Called after construction if listener was not ready
  public attachAudioListener(listener: THREE.AudioListener) {
    if (!this.audioListener) {
      this.audioListener = listener;
      this.setupEngineSound(listener);
    }
  }
  private setupEngineSound(listener: THREE.AudioListener) {
    if (this.engineSound) return; // Already created
    this.engineSound = new THREE.PositionalAudio(listener);
    // Positionally attach to car
    this.add(this.engineSound);
    // Load buffer only once
    if (RacingCar3D.engineBuffer) {
      this.applyEngineBuffer(RacingCar3D.engineBuffer);
    } else if (RacingCar3D.engineBufferLoading) {
      RacingCar3D.engineCallbacks.push((buffer) => {
        if (buffer) this.applyEngineBuffer(buffer);
      });
    } else {
      RacingCar3D.engineBufferLoading = true;
      new THREE.AudioLoader().load(
        '/audio/engine_loop.mp3',
        (buffer) => {
          RacingCar3D.engineBuffer = buffer;
          RacingCar3D.engineBufferLoading = false;
          this.applyEngineBuffer(buffer);
          RacingCar3D.engineCallbacks.forEach(cb => cb(buffer));
          RacingCar3D.engineCallbacks = [];
        },
        undefined,
        () => {
          RacingCar3D.engineBufferLoading = false;
          RacingCar3D.engineCallbacks.forEach(cb => cb(null));
          RacingCar3D.engineCallbacks = [];
        }
      );
    }
  }
  private applyEngineBuffer(buffer: AudioBuffer) {
    if (this.engineSound) {
      this.engineSound.setBuffer(buffer);
      this.engineSound.setLoop(true);
      this.engineSound.setVolume(0.38);
      this.engineSound.setRefDistance(2.2);
      try {
        this.engineSound.play();
      } catch (e) {}
    }
  }
  public setEnginePitch(velocity: number) {
    if (!this.engineSound) return;
    // Velocity in [0, max] for this game, map to playbackRate in [0.80, 1.6]
    const minRate = 0.80;
    const maxRate = 1.60;
    let t = Math.min(velocity * 2.7, 1.0); // Hard clamp for expected speed scaling
    const playbackRate = minRate + (maxRate - minRate) * t;
    this.engineSound.setPlaybackRate(playbackRate);
    // Could also modulate volume with t if desired
  }
  public disposeAudio() {
    if (this.engineSound) {
      try { this.engineSound.stop(); } catch (e) {}
      this.engineSound.disconnect();
    }
    this.engineSound = undefined;
  }
}
