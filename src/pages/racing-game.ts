// src/pages/racing-game.ts
// 3D Racing Game Page â car with simple wheels, track, and HUD (speed/controls)
import { BasePage } from '../components/core/base-page';
import * as THREE from 'three';

export class RacingGamePage extends BasePage {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animationId: number | null = null;
  private car: THREE.Group | null = null;
  private controls = { up: false, down: false, left: false, right: false };
  private carVelocity = 0;
  private carRotation = 0;
  private hudElem: HTMLElement | null = null;

  constructor() {
    super();
    this.title = 'Racing Game';
  }

  connectedCallback(): void {
    if (!this.main.querySelector('#racing-game-canvas-placeholder')) {
      const placeholder = document.createElement('div');
      placeholder.id = 'racing-game-canvas-placeholder';
      // placeholder.style.width = '900px';
      // placeholder.style.height = '600px';
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
    this.scene.background = new THREE.Color(0x202025);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/ window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 9, 12);
    this.camera.lookAt(0, 0, 0);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 8);
    this.scene.add(dirLight);

    // === Track (plane) ===
    const trackGeometry = new THREE.PlaneGeometry(12, 36);
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x353535 });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.0;
    this.scene.add(track);

    // === Car Group (body + wheels) ===
    this.car = new THREE.Group();

    // Car body
    const carBodyGeometry = new THREE.BoxGeometry(1.1, 0.48, 2.2);
    const carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00bfff });
    const carBody = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
    carBody.position.set(0, 0.28, 0);
    this.car.add(carBody);

    // Four wheels (simple black cylinders)
    const wheelGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 24);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222 });
    // wheels positions: front-left, front-right, rear-left, rear-right
    const wheelPositions = [
      [+0.43, 0.11, +0.80], // Front left
      [-0.43, 0.11, +0.80], // Front right
      [+0.43, 0.11, -0.80], // Rear left
      [-0.43, 0.11, -0.80], // Rear right
    ];
    for (const [x, y, z] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(x, y, z);
      wheel.rotation.z = Math.PI / 2;
      this.car.add(wheel);
    }

    this.scene.add(this.car);

    // Render loop with HUD updates
    const render = () => {
      this.updateCarPhysics();
      this.updateHUD();
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

  private updateCarPhysics() {
    if (!this.car) return;
    // Basic driving physics
    const maxSpeed = 0.17;
    const accel = 0.022;
    const decel = 0.024;
    const turnSpeed = 0.035;
    // Acceleration/brake
    if (this.controls.up) { this.carVelocity += accel; }
    else if (this.controls.down) { this.carVelocity -= accel; }
    else {
      // friction
      if (this.carVelocity > 0) { this.carVelocity -= decel; if (this.carVelocity < 0) this.carVelocity = 0; }
      else if (this.carVelocity < 0) { this.carVelocity += decel; if (this.carVelocity > 0) this.carVelocity = 0; }
    }
    if (this.carVelocity > maxSpeed) this.carVelocity = maxSpeed;
    if (this.carVelocity < -maxSpeed/2) this.carVelocity = -maxSpeed/2;
    // Turning
    if (this.controls.left) { this.carRotation += turnSpeed * (this.carVelocity !== 0 ? (this.carVelocity/Math.abs(this.carVelocity)) : 1); }
    if (this.controls.right) { this.carRotation -= turnSpeed * (this.carVelocity !== 0 ? (this.carVelocity/Math.abs(this.carVelocity)) : 1); }
    // Update car position
    this.car.rotation.y = this.carRotation;
    this.car.position.x += Math.sin(this.carRotation) * this.carVelocity;
    this.car.position.z += Math.cos(this.carRotation) * this.carVelocity;
    // Clamp to track area
    this.car.position.x = Math.max(-5.5, Math.min(5.5, this.car.position.x));
    this.car.position.z = Math.max(-16.5, Math.min(16.5, this.car.position.z));
  }

  private updateHUD() {
    if (!this.hudElem) return;
    const speed = Math.abs(this.carVelocity || 0) * 70; // pseudo km/h
    this.hudElem.innerHTML = `
      <div style='font-family:Orbitron,Segoe UI,sans-serif;font-size:1.28rem;font-weight:600;letter-spacing:0.08em;'>
        &#128663; SPEED: <span style='color:#18e0c9;font-size:1.33em;'>${speed.toFixed(1)}</span> km/h
      </div>
      <div style='margin-top:12px;font-size:1.05rem;opacity:0.93;background:#282e3bbb;padding:6px 16px;border-radius:12px;'>
        Controls: <b>WASD</b> or <b>Arrow keys</b>
      </div>
    `;
  }
}

customElements.define('racing-game-page', RacingGamePage);
