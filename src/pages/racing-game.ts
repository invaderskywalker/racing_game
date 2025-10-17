// Modular 3D Racing Game Page with GSAP Cinematic Camera Intro, audio (ambient+engine), and safe control lifecycle
import { BasePage } from '../components/core/base-page';
import * as THREE from 'three';
import { RacingCar3D } from '../components/ui/racing-game/car';
import { createWorld } from '../components/racing-game/world';
import gsap from 'gsap';

interface CarControls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

// CarController: Handles car movement, orientation, and simple physics
class CarController {
  public position: THREE.Vector3;
  public rotationY: number;
  public velocity: number;
  public readonly car: RacingCar3D;
  private readonly maxSpeed: number = 0.17;
  private readonly accel: number = 0.011;
  private readonly decel: number = 0.012;
  private readonly turnSpeed: number = 0.0175;
  private readonly trackBounds: { x: number; z: number } = { x: 5.5, z: 16.5 };

  constructor(car: RacingCar3D) {
    this.car = car;
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotationY = 0;
    this.velocity = 0;
  }

  update(controls: CarControls): void {
    // Acceleration & braking
    if (controls.up && !controls.down) {
      this.velocity += this.accel;
    } else if (!controls.up && controls.down) {
      this.velocity -= this.accel;
    } else {
      // Friction
      if (this.velocity > 0) {
        this.velocity -= this.decel;
        if (this.velocity < 0) this.velocity = 0;
      } else if (this.velocity < 0) {
        this.velocity += this.decel;
        if (this.velocity > 0) this.velocity = 0;
      }
    }
    // Clamp velocity
    if (this.velocity > this.maxSpeed) this.velocity = this.maxSpeed;
    if (this.velocity < -this.maxSpeed / 2) this.velocity = -this.maxSpeed / 2;

    // Turning
    if (controls.right && !controls.left) {
      this.rotationY -= this.turnSpeed * (this.velocity !== 0 ? (this.velocity / Math.abs(this.velocity)) : 0.65);
    }
    if (controls.left && !controls.right) {
      this.rotationY += this.turnSpeed * (this.velocity !== 0 ? (this.velocity / Math.abs(this.velocity)) : 0.65);
    }

    // Move vehicle
    if (this.velocity !== 0) {
      this.position.x += Math.sin(this.rotationY) * this.velocity;
      this.position.z += Math.cos(this.rotationY) * this.velocity;
    }

    // Clamp to track bounds
    this.position.x = Math.max(-this.trackBounds.x, Math.min(this.trackBounds.x, this.position.x));
    this.position.z = Math.max(-this.trackBounds.z, Math.min(this.trackBounds.z, this.position.z));

    // Sync to car model
    this.car.position.copy(this.position);
    this.car.rotation.y = this.rotationY;
  }

  getSpeedKmH(): number {
    return Math.abs(this.velocity) * 70;
  }
}

export class RacingGamePage extends BasePage {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animationId: number | null = null;
  private car: RacingCar3D | null = null;
  private carController: CarController | null = null;
  private controls: CarControls = { up: false, down: false, left: false, right: false };
  private hudElem: HTMLElement | null = null;

  // Audio management
  private audioListener: THREE.AudioListener | null = null;
  private ambientSound: THREE.Audio | null = null;
  private ambientSoundLoader: THREE.AudioLoader | null = null;
  private ambientSoundHasStarted: boolean = false;

  private readonly ambientSoundURL: string = '/audio/ambient_loop.mp3';

  // Camera-follow parameters (can be tweaked)
  private readonly cameraDistance: number = 12.2 / 4;
  private readonly cameraHeight: number = 7.2 / 2;
  private readonly cameraLerpAlpha: number = 0.12; // [0,1], higher=faster snap
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraLookAt: THREE.Vector3 = new THREE.Vector3();
  // Flag for GSAP cinematic intro/cutscene
  private isCinematicActive: boolean = true;

  constructor() {
    super({ show_header: false });
    this.title = 'Racing Game';
  }

  connectedCallback(): void {
    if (!this.main.querySelector('#racing-game-canvas-placeholder')) {
      const placeholder: HTMLDivElement = document.createElement('div');
      placeholder.id = 'racing-game-canvas-placeholder';
      placeholder.style.margin = '0 auto';
      this.main.appendChild(placeholder);
    }
    if (!this.main.querySelector('racing-game-hud')) {
      const hud: HTMLElement = document.createElement('racing-game-hud');
      hud.style.position = 'absolute';
      hud.style.left = '50%';
      hud.style.top = '42px';
      hud.style.transform = 'translateX(-50%)';
      hud.style.zIndex = '10';
      this.main.appendChild(hud);
      this.hudElem = hud;
    } else {
      this.hudElem = this.main.querySelector('racing-game-hud');
    }
    this.injectStylesheet();
    this.initThreeScene();
    window.addEventListener('keydown', this.handleKeyDown as (this: Window, ev: KeyboardEvent) => any);
    window.addEventListener('keyup', this.handleKeyUp as (this: Window, ev: KeyboardEvent) => any);
  }

  disconnectedCallback(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    // Stop, dispose, and nullify ambient sound
    if (this.ambientSound) {
      try { this.ambientSound.stop(); } catch (e) {}
      this.ambientSound.disconnect();
      // No explicit dispose method, GC will eventually clean buffer
      this.ambientSound = null;
    }
    this.ambientSoundHasStarted = false;
    this.ambientSoundLoader = null;
    // Notify car/audio to clean up engine
    if (this.car && typeof (this.car as any).disposeAudio === "function") {
      (this.car as any).disposeAudio();
    }
    window.removeEventListener('keydown', this.handleKeyDown as (this: Window, ev: KeyboardEvent) => any);
    window.removeEventListener('keyup', this.handleKeyUp as (this: Window, ev: KeyboardEvent) => any);
    this.scene = null;
    this.camera = null;
    this.audioListener = null;
    this.car = null;
    this.carController = null;
  }

  private injectStylesheet(): void {
    if (this.shadowRoot?.querySelector('link[data-racing-game-css]')) return;
    const link: HTMLLinkElement = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = new URL('./racing-game.css', import.meta.url).toString();
    link.setAttribute('data-racing-game-css', 'true');
    this.shadowRoot?.appendChild(link);
  }

  private initThreeScene(): void {
    const canvasDiv: HTMLDivElement | null = this.shadowRoot?.querySelector('#racing-game-canvas-placeholder') as HTMLDivElement | null;
    if (!canvasDiv || canvasDiv.querySelector('canvas')) {
      return;
    }
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    canvasDiv.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // Modular world/track/lighting setup
    const world: THREE.Group = createWorld();
    this.scene.background = new THREE.Color(0x202025);
    const color = new THREE.Color().setRGB(0.6, 0.6, 0.6);
    this.scene.background = color;
    this.scene.add(world);

    // AUDIO: AudioListener & Ambient
    this.audioListener = new THREE.AudioListener();

    // Attach to camera only after creating camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.add(this.audioListener);

    // Set camera far from the car for the initial cinematic
    const cinematicStart = new THREE.Vector3(0, 22, -44);
    this.camera.position.copy(cinematicStart);
    this.camera.lookAt(0, 0, 0);

    // Load & Start Ambient Sound
    this.loadAndPlayAmbientSound();

    // Car: Use modular RacingCar3D and CarController
    this.car = new RacingCar3D(this.audioListener);
    this.scene.add(this.car);
    this.carController = new CarController(this.car);

    // -- GSAP Cinematic Camera Intro --
    // After the car is loaded, animate the camera in
    // Wait for car model to load for correct focus
    const launchCinematic = () => {
      if (!this.camera || !this.car) return;
      // Initial position is already set (far from the car)
      const carPos = this.car.position;
      const targetFollowPos = new THREE.Vector3(
        carPos.x + Math.sin(this.car.rotation.y) * -this.cameraDistance,
        this.cameraHeight,
        carPos.z + Math.cos(this.car.rotation.y) * -this.cameraDistance
      );
      // Animate position and look direction using gsap timeline
      const timeline = gsap.timeline({
        onComplete: () => {
          // Optional: smooth ease to real follow position, then hand over
          gsap.to(this.camera!.position, {
            x: targetFollowPos.x,
            y: targetFollowPos.y,
            z: targetFollowPos.z,
            duration: 0.7,
            ease: 'power2.out',
            onUpdate: () => {
              this.camera!.lookAt(carPos.x, carPos.y + 2.2, carPos.z); // stay targeted
            },
            onComplete: () => {
              this.isCinematicActive = false; // Resume normal follow/camera logic
            }
          });
        }
      });
      // Flight: sweep toward track center, then arc down for follow
      timeline.to(this.camera.position, {
        x: carPos.x + 0,
        y: this.cameraHeight + 4.5,
        z: carPos.z - 16,
        duration: 1.8,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.camera!.lookAt(carPos.x, carPos.y + 2.2, carPos.z);
        }
      })
      .to(this.camera.position, {
        x: targetFollowPos.x,
        y: targetFollowPos.y,
        z: targetFollowPos.z,
        duration: 0.95,
        ease: 'power4.out',
        onUpdate: () => {
          this.camera!.lookAt(carPos.x, carPos.y + 2.2, carPos.z);
        }
      });
    };
    // The car model loading is async; poll for isLoaded
    const waitForCarLoad = () => {
      if (this.car && this.car.isLoaded) {
        launchCinematic();
      } else {
        setTimeout(waitForCarLoad, 60);
      }
    };
    waitForCarLoad();

    // Render loop
    const render = (): void => {
      if (this.carController) {
        // Only allow physics control if cinematic is not active
        if (!this.isCinematicActive) {
          this.carController.update(this.controls);
        }
        this.updateHUD();
        // Engine sound pitch update
        if (this.car && typeof (this.car as any).setEnginePitch === "function") {
          (this.car as any).setEnginePitch(Math.abs(this.carController.velocity));
        }
      }
      if (this.camera && this.car && this.carController) {
        if (!this.isCinematicActive) {
          this.updateCameraFollow();
        }
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(render);
      }
    };
    render();
  }

  // Ambient sound loader/manager
  private loadAndPlayAmbientSound(): void {
    if (!this.audioListener) return;
    if (!this.ambientSoundLoader) {
      this.ambientSoundLoader = new THREE.AudioLoader();
    }
    // If already loaded, just play
    if (this.ambientSoundHasStarted && this.ambientSound) {
      if (!this.ambientSound.isPlaying) this.ambientSound.play();
      return;
    }
    if (!this.ambientSound) {
      this.ambientSound = new THREE.Audio(this.audioListener);
    }
    this.ambientSoundLoader.load(
      this.ambientSoundURL,
      (buffer: AudioBuffer) => {
        if (this.ambientSound) {
          this.ambientSound.setBuffer(buffer);
          this.ambientSound.setLoop(true);
          this.ambientSound.setVolume(0.40);
          // Playing may fail until user interaction (browser restriction)
          try {
            this.ambientSound.play();
            this.ambientSoundHasStarted = true;
          } catch (e) {
            // Try play on next gesture
          }
          if (this.scene && this.ambientSound) {
            this.scene.add(this.ambientSound);
          }
        }
      },
      undefined,
      (err) => {
        // Failed to load sound (e.g., file missing). Ignore for now
      }
    );
  }

  // Smooth third-person camera-follow logic (disabled during cinematic)
  private updateCameraFollow(): void {
    if (!this.camera || !this.car || this.isCinematicActive) return;
    // Compute desired offset behind and above the car, based on car's orientation
    const carPos: THREE.Vector3 = this.car.position;
    const rotY: number = this.car.rotation.y;
    const offset: THREE.Vector3 = new THREE.Vector3(
      Math.sin(rotY) * -this.cameraDistance,
      this.cameraHeight,
      Math.cos(rotY) * -this.cameraDistance
    );
    const targetPos: THREE.Vector3 = new THREE.Vector3().addVectors(carPos, offset);
    // Smoothly lerp camera.position towards the target position
    this.camera.position.lerp(targetPos, this.cameraLerpAlpha);
    // Optionally, look slightly above the car for a better view
    this.cameraLookAt.copy(carPos).setY(carPos.y + 2.2);
    this.camera.lookAt(this.cameraLookAt);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isCinematicActive) return;
    switch (event.key.toLowerCase()) {
      case 'w': case 'arrowup': this.controls.up = true; break;
      case 's': case 'arrowdown': this.controls.down = true; break;
      case 'a': case 'arrowleft': this.controls.left = true; break;
      case 'd': case 'arrowright': this.controls.right = true; break;
    }
  };
  private handleKeyUp = (event: KeyboardEvent): void => {
    if (this.isCinematicActive) return;
    switch (event.key.toLowerCase()) {
      case 'w': case 'arrowup': this.controls.up = false; break;
      case 's': case 'arrowdown': this.controls.down = false; break;
      case 'a': case 'arrowleft': this.controls.left = false; break;
      case 'd': case 'arrowright': this.controls.right = false; break;
    }
  };
  private updateHUD(): void {
    if (!this.hudElem || !this.carController) return;
    const speed: number = this.carController.getSpeedKmH();
    this.hudElem.innerHTML = `
      <div style='font-family:Orbitron,Segoe UI,sans-serif;font-size:1.28rem;font-weight:600;letter-spacing:0.08em;'>
        ð SPEED: <span style='color:#18e0c9;font-size:1.33em;'>${speed.toFixed(1)}</span> km/h
      </div>
      <div style='font-size:1.05rem;opacity:0.93;background:#282e3bbb;border-radius:12px;'>
        Controls: <b>WASD</b> or <b>Arrow keys</b>
      </div>
    `;
  }
}
customElements.define('racing-game-page', RacingGamePage);
