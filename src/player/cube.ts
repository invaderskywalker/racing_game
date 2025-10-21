import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BasePlayer } from './base';

export class CubePlayer extends BasePlayer {
    size: number;
    solidMaterial: THREE.MeshStandardMaterial;
    private facingLine: THREE.Line | null = null;
    private movementLine: THREE.Line | null = null;

    // Jumping mechanism state
    private grounded: boolean = false;
    private jumpKeyPressedLastFrame: boolean = false;
    private static readonly JUMP_VELOCITY: number = 12.0; // Tweakable
    private static readonly GROUND_EPSILON: number = 0.18;  // Acceptable ground y-position fudge
    private static readonly Y_STOP_THRESHOLD: number = 0.35;

    /**
     * Draw debug lines showing:
     * - Red: facing direction
     * - Blue: movement (velocity direction)
     */
    updateDebugLines() {
        if (!this.mesh) return;

        const scene: THREE.Scene =
            (this.mesh && (this.mesh as any).parent)
                ? (this.mesh as any).parent as THREE.Scene
                : (this as any).scene;

        const start = new THREE.Vector3(
            this.body.position.x,
            this.body.position.y + this.size + 0.3,
            this.body.position.z
        );

        const length = 6;

        // Red: facing direction
        const facingDir = new THREE.Vector3(
            Math.sin(this.facingAngle),
            0,
            Math.cos(this.facingAngle)
        ).normalize();
        const facingEnd = start.clone().add(facingDir.clone().multiplyScalar(length));

        // Blue: movement direction
        const velocity = this.body.velocity;
        let movementDir = new THREE.Vector3(velocity.x, velocity.y, velocity.z);
        if (movementDir.length() > 0.1) {
            movementDir.normalize();
        } else {
            movementDir.copy(facingDir); // fallback: same as facing
        }
        const movementEnd = start.clone().add(movementDir.clone().multiplyScalar(length));

        // helper for lines
        const drawOrUpdateLine = (
            existing: THREE.Line | null,
            start: THREE.Vector3,
            end: THREE.Vector3,
            color: number
        ) => {
            if (existing) {
                const pos = (existing.geometry as THREE.BufferGeometry).attributes
                    .position as THREE.BufferAttribute;
                pos.setXYZ(0, start.x, start.y, start.z);
                pos.setXYZ(1, end.x, end.y, end.z);
                pos.needsUpdate = true;
                if (!existing.parent) scene.add(existing);
                return existing;
            } else {
                const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
                const mat = new THREE.LineBasicMaterial({ color });
                const line = new THREE.Line(geom, mat);
                scene.add(line);
                return line;
            }
        };

        this.facingLine = drawOrUpdateLine(this.facingLine, start, facingEnd, 0xff0000);
        this.movementLine = drawOrUpdateLine(this.movementLine, start, movementEnd, 0x0000ff);
    }

    /** Remove debug lines */
    removeDebugLines() {
        const removeLine = (line: THREE.Line | null) => {
            if (line && line.parent) {
                line.parent.remove(line);
                (line.geometry as THREE.BufferGeometry).dispose();
                (line.material as THREE.Material).dispose();
            }
        };
        removeLine(this.facingLine);
        removeLine(this.movementLine);
        this.facingLine = null;
        this.movementLine = null;
    }

    dispose() {
        this.removeDebugLines();
        if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
    }

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        cubeMaterial: CANNON.Material,
        startPos: THREE.Vector3 = new THREE.Vector3(0, 3, 0),
        color: THREE.ColorRepresentation = 0x00ff00
    ) {
        super(scene, world);
        this.size = 2;

        // Physics
        const halfExtents = new CANNON.Vec3(this.size, this.size, this.size);
        const boxShape = new CANNON.Box(halfExtents);
        const boxBody = new CANNON.Body({ mass: 40, material: cubeMaterial });
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

        this.facingAngle = 0;
        this.cameraMode = 'first';
    }

    /** Simplified arcade-style move â always aligns velocity with facing direction.
     *  Also implements jump and 'grounded' calculation per tick. */
    move(delta: number, keys: Record<string, boolean>) {
        const body = this.body;
        const turnSpeed = 2.5;
        const moveSpeed = 40; // units per second
        const sz = this.size;

        // --- Calculate 'grounded' ---
        // Determine ground level as y = sz (cube should land at y = sz)
        const baseY = sz; // expected ground level
        const GROUND_EPSILON = CubePlayer.GROUND_EPSILON;
        const Y_STOP_THRESHOLD = CubePlayer.Y_STOP_THRESHOLD;
        // We consider 'grounded' if player is at or close to ground and nearly not moving on y axis
        this.grounded = (body.position.y <= baseY + GROUND_EPSILON) && (Math.abs(body.velocity.y) < Y_STOP_THRESHOLD);

        // --- Handle Jumping ---
        const jumpPressed = keys['Space'] || false;
        if (jumpPressed && !this.jumpKeyPressedLastFrame && this.grounded) {
            // Apply upward velocity directly for instant jump
            body.velocity.y = CubePlayer.JUMP_VELOCITY;
            this.grounded = false; // Will recalc next frame
        }
        this.jumpKeyPressedLastFrame = jumpPressed;

        // --- Movement (unchanged, for x and z only) ---
        // Turning
        if (keys['KeyA']) this.facingAngle += turnSpeed * delta;
        if (keys['KeyD']) this.facingAngle -= turnSpeed * delta;

        // Apply facing rotation to body
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.facingAngle);
        body.quaternion.copy(quat);

        // Direction vector based on facing angle
        const forward = new CANNON.Vec3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
        const moveInput = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);

        // Desired velocity (project onto XZ only)
        const desiredVel = forward.scale(moveSpeed * moveInput);

        // Smoothly move velocity toward facing direction
        const lerpFactor = 0.15; // lower = smoother / slower turning response
        body.velocity.x += (desiredVel.x - body.velocity.x) * lerpFactor;
        body.velocity.z += (desiredVel.z - body.velocity.z) * lerpFactor;
        // gravity stays as is (on y)
    }
}
