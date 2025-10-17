import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class CarController {
  scene: THREE.Scene;
  world: CANNON.World;
  chassisBody: CANNON.Body;
  vehicle: CANNON.RigidVehicle;
  carModel?: THREE.Group;
  keyStates: Record<string, boolean> = {};

  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.scene = scene;
    this.world = world;
    this.initCarPhysics();
    this.setupKeyListeners();
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('/models/tesla_model_s_plaid_2023.glb');
    this.carModel = gltf.scene;
    this.carModel.scale.set(1.3, 1.3, 1.3);
    this.carModel.traverse((obj: any) => (obj.castShadow = true));
    this.scene.add(this.carModel);
  }

  initCarPhysics() {
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
    this.chassisBody = new CANNON.Body({ mass: 150 });
    this.chassisBody.addShape(chassisShape);
    this.chassisBody.position.set(0, 3, 0);
    this.world.addBody(this.chassisBody);

    const options = {
      radius: 0.4,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 45,
      suspensionRestLength: 0.3,
      frictionSlip: 5,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      axleLocal: new CANNON.Vec3(1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    this.vehicle = new CANNON.RigidVehicle({ chassisBody: this.chassisBody });

    const wheelPositions = [
      new CANNON.Vec3(-1, 0, 1.5),
      new CANNON.Vec3(1, 0, 1.5),
      new CANNON.Vec3(-1, 0, -1.5),
      new CANNON.Vec3(1, 0, -1.5),
    ];

    for (const pos of wheelPositions) {
      const wheelBody = new CANNON.Body({ mass: 1 });
      const cylinderShape = new CANNON.Cylinder(options.radius, options.radius, 0.4, 20);
      wheelBody.addShape(cylinderShape);
      this.vehicle.addWheel({ body: wheelBody, position: pos, axis: new CANNON.Vec3(0, 0, -1), direction: new CANNON.Vec3(0, -1, 0) });
    }

    this.vehicle.addToWorld(this.world);
  }

  setupKeyListeners() {
    window.addEventListener('keydown', (e) => (this.keyStates[e.code] = true));
    window.addEventListener('keyup', (e) => (this.keyStates[e.code] = false));
  }

  updatePhysics(delta: number) {
    const engineForce = 300;
    const maxSteerVal = 0.3;

    if (this.keyStates['KeyW']) {
      this.vehicle.setWheelForce(engineForce, 2);
      this.vehicle.setWheelForce(engineForce, 3);
    } else if (this.keyStates['KeyS']) {
      this.vehicle.setWheelForce(-engineForce, 2);
      this.vehicle.setWheelForce(-engineForce, 3);
    } else {
      this.vehicle.setWheelForce(0, 2);
      this.vehicle.setWheelForce(0, 3);
    }

    let steerVal = 0;
    if (this.keyStates['KeyA']) steerVal = maxSteerVal;
    if (this.keyStates['KeyD']) steerVal = -maxSteerVal;
    this.vehicle.setSteeringValue(steerVal, 0);
    this.vehicle.setSteeringValue(steerVal, 1);

    // update 3D model position
    if (this.carModel) {
      this.carModel.position.copy(this.chassisBody.position as unknown as THREE.Vector3);
      this.carModel.quaternion.copy(this.chassisBody.quaternion as unknown as THREE.Quaternion);
    }
  }
}
