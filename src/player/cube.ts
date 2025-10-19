import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BasePlayer } from './base';

export class CubePlayer extends BasePlayer {
    size: number;
    solidMaterial: THREE.MeshStandardMaterial;

    constructor(scene: THREE.Scene, world: CANNON.World, cubeMaterial: CANNON.Material, startPos: THREE.Vector3 = new THREE.Vector3(0, 3, 0), color: THREE.ColorRepresentation = 0x00ff00) {
        super(scene, world);
        this.size = 2;

        // Physics
        const halfExtents = new CANNON.Vec3(this.size, this.size, this.size);
        const boxShape = new CANNON.Box(halfExtents);
        const boxBody = new CANNON.Body({ mass: 5, material: cubeMaterial });
        boxBody.addShape(boxShape);
        boxBody.position.set(startPos.x, startPos.y, startPos.z);
        boxBody.fixedRotation = true;
        boxBody.angularDamping = 1;
        boxBody.linearDamping = 0.3;
        boxBody.allowSleep = false;
        boxBody.updateMassProperties();
        world.addBody(boxBody);
        this.body = boxBody;

        // Visual
        const boxGeometry = new THREE.BoxGeometry(this.size * 2, this.size * 2, this.size * 2);
        boxGeometry.center();
        this.solidMaterial = new THREE.MeshStandardMaterial({ color });
        const cubeMesh = new THREE.Mesh(boxGeometry, this.solidMaterial);
        cubeMesh.castShadow = true;
        cubeMesh.receiveShadow = true;
        scene.add(cubeMesh);
        this.mesh = cubeMesh;

        // Optionally: No debugMesh for cube by default
        this.facingAngle = 0;
        this.cameraMode = 'first';
    }

    move(delta: number, keys: Record<string, boolean>) {
        const body = this.body;
        const speed = 800;
        const turnSpeed = 2.5;
        // Rotation controls (left/right)
        if (keys['KeyA']) this.facingAngle += turnSpeed * delta;
        if (keys['KeyD']) this.facingAngle -= turnSpeed * delta;
        // Rotate the body to match facingAngle
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.facingAngle);
        body.quaternion.copy(quat);
        // Forward movement
        const forward = new CANNON.Vec3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
        const moveForce = new CANNON.Vec3(0, 0, 0);
        if (keys['KeyW']) {
            moveForce.x += forward.x * speed;
            moveForce.z += forward.z * speed;
        }
        if (keys['KeyS']) {
            moveForce.x -= forward.x * speed;
            moveForce.z -= forward.z * speed;
        }
        body.applyForce(moveForce, body.position);
        // Limit speed
        const maxSpeed = 40;
        const velocity = body.velocity;
        const velLen = velocity.length();
        if (velLen > maxSpeed) {
            velocity.scale(maxSpeed / velLen, velocity);
        }
    }
}
