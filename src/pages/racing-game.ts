// src/pages/racing-game.ts
// Modular 3D Racing Game Page with robust CarController
import { BasePage } from '../components/core/base-page';
import * as THREE from 'three';
import { RacingCar3D } from '../components/ui/racing-game/car';
import { createWorld } from '../components/racing-game/world';

// CarController: Handles car movement, orientation, and simple physics
class CarController {
  public position: THREE.Vector3;
  public rotationY: number;
  public velocity: number;
  public readonly car: RacingCar3D;
  private readonly maxSpeed: number = 0.17;
  private readonly accel: number = 0.022/2;
  private readonly decel: number = 0.024/2;
  private readonly turnSpeed: number = 0.035/2;
  private readonly trackBounds = { x: 5.5, z: 16.5 };

  constructor(car: RacingCar3D) {
    this.car = car;
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotationY = 0; // Yaw angle in radians
    this.velocity = 0;
  }

  update(controls: { up: boolean; down: boolean; left: boolean; right: boolean; }) {
    // --- Compute acceleration/braking ---
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

    // --- Compute turning ---
    if (controls.right && !controls.left) {
      // 'd' or right arrow: turn right (clockwise)
      // If moving, turn proportional to direction; if stopped, allow slow rotation
      this.rotationY -= this.turnSpeed * (this.velocity !== 0 ? (this.velocity / Math.abs(this.velocity)) : 0.65);
    }
    if (controls.left && !controls.right) {
      // 'a' or left arrow: turn left (CCW)
      this.rotationY += this.turnSpeed * (this.velocity !== 0 ? (this.velocity / Math.abs(this.velocity)) : 0.65);
    }

    // --- Update position ---
    // Move forward relative to the car's orientation when velocity â  0
    if (this.velocity !== 0) {
      this.position.x += Math.sin(this.rotationY) * this.velocity;
      this.position.z += Math.cos(this.rotationY) * this.velocity;
    }

    // --- Clamp position to track bounds ---
    this.position.x = Math.max(-this.trackBounds.x, Math.min(this.trackBounds.x, this.position.x));
    this.position.z = Math.max(-this.trackBounds.z, Math.min(this.trackBounds.z, this.position.z));

    // --- Sync to car 3D model ---
    this.car.position.copy(this.position);
    this.car.rotation.y = this.rotationY;
  }

  getSpeedKmH(): number {
    return Math.abs(this.velocity) * 70; // Pseudo km/h
  }
}

export class RacingGamePage extends BasePage {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animationId: number | null = null;
  private car: RacingCar3D | null = null;
  private carController: CarController | null = null;
  private controls = { up: false, down: false, left: false, right: false };
  private hudElem: HTMLElement | null = null;

  constructor() {
    super({ show_header: false });
    this.title = 'Racing Game';
  }

  connectedCallback(): void {
    if (!this.main.querySelector('#racing-game-canvas-placeholder')) {
      const placeholder = document.createElement('div');
      placeholder.id = 'racing-game-canvas-placeholder';
      placeholder.style.margin = '0 auto';
      this.main.appendChild(placeholder);
    }
    if (!this.main.querySelector('racing-game-hud')) {
      const hud = document.createElement('racing-game-hud');
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
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  disconnectedCallback(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.scene = null;
    this.camera = null;
    this.car = null;
    this.carController = null;
  }

  private injectStylesheet(): void {
    if (this.shadowRoot?.querySelector('link[data-racing-game-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = new URL('./racing-game.css', import.meta.url).toString();
    link.setAttribute('data-racing-game-css', 'true');
    this.shadowRoot?.appendChild(link);
  }

  private initThreeScene(): void {
    const canvasDiv = this.shadowRoot?.querySelector('#racing-game-canvas-placeholder') as HTMLDivElement;
    if (!canvasDiv || canvasDiv.querySelector('canvas')) {
      return;
    }
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    canvasDiv.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // Modular world/track/lighting setup
    const world = createWorld();
    // Optionally, also allow world module to set scene background
    this.scene.background = new THREE.Color(0x202025);
    const color = new THREE.Color().setRGB(0.6, 0.6, 0.6);
    this.scene.background = new THREE.Color(color);
    this.scene.add(world);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 9, 12);
    this.camera.lookAt(0, 0, 0);

    // Car: Use modular RacingCar3D and CarController
    this.car = new RacingCar3D();
    this.scene.add(this.car);
    this.carController = new CarController(this.car);

    // Main render loop
    const render = () => {
      if (this.carController) {
        this.carController.update(this.controls);
        this.updateHUD();
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(render);
      }
    };
    render();
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key.toLowerCase()) {
      case 'w': case 'arrowup': this.controls.up = true; break;
      case 's': case 'arrowdown': this.controls.down = true; break;
      case 'a': case 'arrowleft': this.controls.left = true; break;
      case 'd': case 'arrowright': this.controls.right = true; break;
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    switch (event.key.toLowerCase()) {
      case 'w': case 'arrowup': this.controls.up = false; break;
      case 's': case 'arrowdown': this.controls.down = false; break;
      case 'a': case 'arrowleft': this.controls.left = false; break;
      case 'd': case 'arrowright': this.controls.right = false; break;
    }
  };

  private updateHUD() {
    if (!this.hudElem || !this.carController) return;
    const speed = this.carController.getSpeedKmH();
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
