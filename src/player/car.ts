import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BasePlayer } from './base';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class CarPlayer extends BasePlayer {
    loader: GLTFLoader;
    carModel?: THREE.Group;
    gltfLoaded: boolean = false;
    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        physicsMaterial: CANNON.Material,
        startPos: THREE.Vector3 = new THREE.Vector3(4, 2.5, 5)
    ) {
        super(scene, world);
        this.loader = new GLTFLoader();
        this.initCarModel(scene, physicsMaterial, startPos);
        this.facingAngle = 0;
        this.cameraMode = 'first';
    }

    async initCarModel(scene: THREE.Scene, physicsMaterial: CANNON.Material, startPos: THREE.Vector3) {
        // Load model
        const gltf = await this.loader.loadAsync('/models/tesla_model_s_plaid_2023.glb');
        const car = gltf.scene;
        car.scale.set(0.05, 0.05, 0.05);
        car.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).castShadow = true;
                (child as THREE.Mesh).receiveShadow = true;
            }
        });
        scene.add(car);
        this.carModel = car;
        this.mesh = car;
        // Physics (box)
        const carHalfExtents = new CANNON.Vec3(3, 0.1, 1.0);
        const carBodyShape = new CANNON.Box(carHalfExtents);
        const carBody = new CANNON.Body({
            mass: 10,
            shape: carBodyShape,
            position: new CANNON.Vec3(startPos.x, startPos.y, startPos.z),
            material: physicsMaterial
        });
        carBody.allowSleep = false;
        carBody.linearDamping = 0.05;
        carBody.angularDamping = 0.01;
        carBody.position.y = 2.5;
        this.body = carBody;
        this.world.addBody(carBody);
        // Debug wire mesh
        const debugMesh = new THREE.Mesh(
            new THREE.BoxGeometry(carHalfExtents.x * 2, carHalfExtents.y * 2, carHalfExtents.z * 2),
            new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        );
        scene.add(debugMesh);
        this.debugMesh = debugMesh;
        this.gltfLoaded = true;
    }

    move(delta: number, keys: Record<string, boolean>): void {
        if (!this.gltfLoaded) return;
        const body = this.body;
        const forwardForce = 55000;
        const turnSpeed = 1.5;
        // Facing is based on quaternion, but keep a local facingAngle to match camera
        // Compute forward from body quaternion
        const forward = new CANNON.Vec3(1, 0, 0);
        body.quaternion.vmult(forward, forward);
        // Move forward/backward
        if (keys['KeyW']) {
            const force = forward.scale(forwardForce * delta);
            body.applyForce(force, body.position);
        }
        if (keys['KeyS']) {
            const force = forward.scale(-forwardForce * delta);
            body.applyForce(force, body.position);
        }
        // Rotate car in place
        if (keys['KeyA']) {
            body.angularVelocity.y += turnSpeed * delta;
        }
        if (keys['KeyD']) {
            body.angularVelocity.y -= turnSpeed * delta;
        }
        // Sync facingAngle for camera logic (project quaternion to angle)
        const quat = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
        const euler = new THREE.Euler();
        euler.setFromQuaternion(quat);
        this.facingAngle = euler.y;
    }
}
