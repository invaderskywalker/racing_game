import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * BasePlayer serves as an abstract interface for any player-controlled entity (cube, car, etc).
 * It handles the physics body, mesh(es), basic direction/camera properties, and contract for movement & camera APIs.
 */
export abstract class BasePlayer {
    mesh: THREE.Object3D;
    debugMesh?: THREE.Mesh;
    body: CANNON.Body;
    facingAngle: number = 0; // radians
    cameraMode: 'first' | 'third' = 'first';

    constructor(
        public scene: THREE.Scene,
        public world: CANNON.World
    ) {
        // mesh and body to be initialized in derived classes
        // Derived classes must add mesh(es) to the scene and body to the world
    }

    // To be called on every tick, pass keys and delta so subclass can interpret input
    abstract move(delta: number, keys: Record<string, boolean>): void;

    // Sync visual mesh position/rotation from physics body
    syncToPhysics() {
        this.mesh.position.copy(this.body.position as unknown as THREE.Vector3);
        this.mesh.quaternion.copy(this.body.quaternion as unknown as THREE.Quaternion);
        if (this.debugMesh) {
            this.debugMesh.position.copy(this.body.position as unknown as THREE.Vector3);
            this.debugMesh.quaternion.copy(this.body.quaternion as unknown as THREE.Quaternion);
        }
    }

    // Camera parameters for following/viewing this player.
    // Returns camera position and lookTarget for current mode. Override in subclasses for custom behavior.
    getCameraParams(): { position: THREE.Vector3, lookTarget: THREE.Vector3 } {
        const pos = this.body.position as unknown as THREE.Vector3;
        const y = pos.y;
        // Facing direction
        const forward = new THREE.Vector3(
            Math.sin(this.facingAngle),
            0,
            Math.cos(this.facingAngle)
        );
        if (this.cameraMode === 'first') {
            const eyeHeight = 3;
            const forwardOffset = forward.clone().multiplyScalar(2);
            const heightOffset = new THREE.Vector3(0, eyeHeight, 0);
            const cameraPos = new THREE.Vector3().copy(pos).add(heightOffset).add(forwardOffset);
            const lookTarget = new THREE.Vector3().copy(pos).add(forward.clone().multiplyScalar(10));
            return { position: cameraPos, lookTarget };
        } else {
            const followDistance = 10;
            const height = 5;
            const cameraPos = new THREE.Vector3()
                .copy(pos)
                .add(forward.clone().multiplyScalar(-followDistance))
                .add(new THREE.Vector3(0, height, 0));
            const lookTarget = new THREE.Vector3().copy(pos).add(forward.clone().multiplyScalar(5));
            return { position: cameraPos, lookTarget };
        }
    }

    // Allows toggling camera mode (called by host as a response to input)
    toggleCameraMode() {
        this.cameraMode = this.cameraMode === 'first' ? 'third' : 'first';
    }
}
