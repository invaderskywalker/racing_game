import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { initPhysicsWorld } from './physicsworld';
import { CarController } from './carController';

const clock = new THREE.Clock();

class App {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  world: CANNON.World;
  car: CarController;
  orbit: OrbitControls;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0d8ef);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 5);
    this.scene.add(light);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 8, -15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.world = initPhysicsWorld();

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.target.set(0, 2, 0);
    this.orbit.update();

    this.car = new CarController(this.scene, this.world);
    this.car.loadModel();

    this.animate();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = clock.getDelta();
    this.world.step(1 / 60, delta, 3);
    this.car.updatePhysics(delta);

    // follow car
    if (this.car.carModel) {
      const carPos = this.car.carModel.position;
      this.camera.position.lerp(new THREE.Vector3(carPos.x, carPos.y + 5, carPos.z - 10), 0.05);
      this.camera.lookAt(carPos);
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

new App();
