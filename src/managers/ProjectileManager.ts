// Centralized projectile/bullet manager for player and AI/enemy shooting
// Handles: spawn, update, collision, de-spawn, and emits state events
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { eventBus } from '../utils/event-bus';

export interface Projectile {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    owner: 'player' | 'enemy';
    alive: boolean;
    damage: number;
}

export interface ProjectileManagerConfig {
    scene: THREE.Scene;
    world: CANNON.World;
    bulletMaterial?: CANNON.Material;
    bulletColor?: THREE.ColorRepresentation;
    maxBullets?: number;
}

export class ProjectileManager {
    private projectiles: Projectile[] = [];
    private scene: THREE.Scene;
    private world: CANNON.World;
    private bulletMaterial: CANNON.Material | undefined;
    private bulletColor: THREE.ColorRepresentation;
    maxBullets: number;

    constructor(cfg: ProjectileManagerConfig) {
        this.scene = cfg.scene;
        this.world = cfg.world;
        this.bulletMaterial = cfg.bulletMaterial;
        this.bulletColor = cfg.bulletColor ?? 0xffff00;
        this.maxBullets = cfg.maxBullets ?? 10;
        eventBus.emit('bullet.max', { maxBullets: this.maxBullets });
    }

    spawnBullet(
        position: THREE.Vector3,
        direction: THREE.Vector3,
        owner: 'player' | 'enemy' = 'player',
        speed: number = 120,
        damage: number = 25
    ) {
        if (owner === 'player') {
            const active = this.projectiles.filter(p => p.owner === 'player' && p.alive).length;
            if (active >= this.maxBullets) {
                // Don't allow more bullets from player
                return false;
            }
        }
        // Physics & visuals
        const radius = 0.4;
        const bulletGeometry = new THREE.SphereGeometry(radius, 12, 12);
        const bulletMat = new THREE.MeshStandardMaterial({ color: this.bulletColor });
        const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMat);
        bulletMesh.position.copy(position);
        bulletMesh.castShadow = true;
        bulletMesh.receiveShadow = true;
        this.scene.add(bulletMesh);

        const shape = new CANNON.Sphere(radius);
        const body = new CANNON.Body({
            mass: 0.1,
            shape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            material: this.bulletMaterial
        });
        body.linearDamping = 0;
        body.velocity.set(
            direction.x * speed,
            direction.y * speed,
            direction.z * speed
        );
        body.allowSleep = false;
        this.world.addBody(body);

        const projectile: Projectile = {
            mesh: bulletMesh,
            body,
            owner,
            alive: true,
            damage
        };

        this.projectiles.push(projectile);
        eventBus.emit('bullet.fired', {
            bullets: this.projectiles.filter(p => p.owner === owner && p.alive).length
        });
        return true;
    }

    update() {
        for (const p of this.projectiles) {
            if (!p.alive) continue;
            // Sync mesh with physics
            p.mesh.position.copy(p.body.position as unknown as THREE.Vector3);
            // Out of bounds check
            if (p.body.position.y < -12 || p.body.position.length() > 400) {
                this._despawn(p);
                continue;
            }
        }
        // TODO: call this after projectiles checked for collision with other objects
    }

    _despawn(p: Projectile) {
        p.alive = false;
        this.world.removeBody(p.body);
        this.scene.remove(p.mesh);
        // HUD: update bullet count
        eventBus.emit('bullet.fired', {
            bullets: this.projectiles.filter(b => b.owner === p.owner && b.alive).length
        });
    }

    handleCollision(callback: (proj: Projectile, hitObject: any) => void) {
        // User provides collision resolution logic (deal damage, award score, etc)
        // Up to game loop to call this!
        // Example: loop over all projectiles, check collisions, then invoke callback
    }

    getActiveBullets(owner: 'player' | 'enemy' | 'all' = 'all') {
        if (owner === 'all') return this.projectiles.filter(p => p.alive);
        return this.projectiles.filter(p => p.owner === owner && p.alive);
    }

    reset() {
        for (const p of this.projectiles) {
            if (p.alive) this._despawn(p);
        }
        this.projectiles = [];
        eventBus.emit('bullet.fired', { bullets: 0 });
    }
}
