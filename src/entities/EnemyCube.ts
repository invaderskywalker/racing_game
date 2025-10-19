// Basic EnemyCube entity class for the modular enemy system
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface EnemyCubeConfig {
    scene: THREE.Scene;
    world: CANNON.World;
    material?: CANNON.Material;
    color?: THREE.ColorRepresentation;
    startPos?: THREE.Vector3;
    health?: number;
}

export class EnemyCube {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    health: number;
    alive: boolean = true;
    facingAngle: number;
    size: number = 2.4;

    constructor(cfg: EnemyCubeConfig) {
        const {
            scene, world, material, color = 0xda2c43,
            startPos = new THREE.Vector3(12, 3, 0), health = 40
        } = cfg;
        const geometry = new THREE.BoxGeometry(this.size * 2, this.size * 2, this.size * 2);
        geometry.center();
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color }));
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
        // Body
        const boxShape = new CANNON.Box(new CANNON.Vec3(this.size, this.size, this.size));
        this.body = new CANNON.Body({
            mass: 5,
            material,
            position: new CANNON.Vec3(startPos.x, startPos.y, startPos.z)
        });
        this.body.addShape(boxShape);
        this.body.fixedRotation = true;
        this.body.allowSleep = false;
        world.addBody(this.body);
        this.health = health;
        this.facingAngle = 0;
    }

    updateAI(dt: number, playerPos: THREE.Vector3) {
        // Simple AI: face player, move closer, maybe shoot every X ticks
        const dx = playerPos.x - this.body.position.x;
        const dz = playerPos.z - this.body.position.z;
        this.facingAngle = Math.atan2(dx, dz);
        // Move towards if not too close/far
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > 10 && distance < 90) {
            const forward = new CANNON.Vec3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
            this.body.velocity.x = forward.x * 8;
            this.body.velocity.z = forward.z * 8;
        } else {
            this.body.velocity.x = 0;
            this.body.velocity.z = 0;
        }
        // (shooting is handled by EnemyManager to coordinate all enemies)
    }

    syncToPhysics() {
        this.mesh.position.copy(this.body.position as unknown as THREE.Vector3);
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.facingAngle);
        this.body.quaternion.copy(quat);
        this.mesh.quaternion.copy(quat as unknown as THREE.Quaternion);
    }

    hit(damage: number) {
        this.health -= damage;
        if (this.health <= 0 && this.alive) {
            this.alive = false;
        }
    }

    destroy(scene: THREE.Scene, world: CANNON.World) {
        scene.remove(this.mesh);
        world.removeBody(this.body);
    }
}
