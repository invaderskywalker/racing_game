// EnemyManager: handles spawning, updating, killing, and UI/hud events for enemies
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EnemyCube } from '../entities/EnemyCube';
import { eventBus } from '../utils/event-bus';
import { ProjectileManager } from './ProjectileManager';

export interface EnemyManagerConfig {
    scene: THREE.Scene;
    world: CANNON.World;
    playerGetter: () => THREE.Vector3; // function to get current player position
    projectileManager: ProjectileManager;
    maxEnemies?: number;
    spawnArea?: { x: number; y: number; z: number; size: number; range: number };
    spawnIntervalSec?: number;
}

export class EnemyManager {
    private scene: THREE.Scene;
    private world: CANNON.World;
    private playerGetter: () => THREE.Vector3;
    private projectileManager: ProjectileManager;
    private maxEnemies: number;
    private spawnArea: { x: number; y: number; z: number; size: number; };
    private spawnIntervalSec: number;
    private lastSpawn: number = 0;
    private aiShootCooldown: Map<EnemyCube, number> = new Map();
    public enemies: EnemyCube[] = [];
    constructor(cfg: EnemyManagerConfig) {
        this.scene = cfg.scene;
        this.world = cfg.world;
        this.playerGetter = cfg.playerGetter;
        this.projectileManager = cfg.projectileManager;
        this.maxEnemies = cfg.maxEnemies ?? 3;
        this.spawnArea = cfg.spawnArea ?? { x: 0, y: 2, z: 0, size: 35, range: 100 };
        this.spawnIntervalSec = cfg.spawnIntervalSec ?? 6;
        this.spawnInitialWave();
        this.emitEnemyCount();
    }
    spawnInitialWave() {
        for (let i = 0; i < this.maxEnemies; ++i) this.spawnEnemy();
    }
    spawnEnemy() {
        const x = this.spawnArea.x + (Math.random() - 0.5) * this.spawnArea.size;
        const y = this.spawnArea.y + Math.random() * 2;
        const z = this.spawnArea.z + (Math.random() - 0.5) * this.spawnArea.size;
        const e = new EnemyCube({
            scene: this.scene,
            world: this.world,
            startPos: new THREE.Vector3(x, y, z)
        });
        this.enemies.push(e);
        this.aiShootCooldown.set(e, Math.random() * 1.3 + 1.1);
        this.emitEnemyCount();
    }
    update(dt: number, now: number, playerBodies: CANNON.Body[]) {
        // Update each enemy AI, check death, maybe fire
        const playerPos = this.playerGetter();
        // Spawn more enemies if below maxEnemies, on interval
        if (now - this.lastSpawn > this.spawnIntervalSec && this.aliveCount() < this.maxEnemies) {
            this.spawnEnemy();
            this.lastSpawn = now;
        }
        for (const e of this.enemies) {
            if (!e.alive) continue;
            e.updateAI(dt, playerPos);
            e.syncToPhysics();
            // Shoot if off cooldown and within range
            let cooldown = this.aiShootCooldown.get(e) ?? 1.7;
            cooldown -= dt;
            if (cooldown < 0) {
                const toPlayer = new THREE.Vector3().subVectors(playerPos, e.mesh.position);
                if (toPlayer.length() < 68) {
                    toPlayer.normalize();
                    this.projectileManager.spawnBullet(
                        new THREE.Vector3().copy(e.body.position),
                        toPlayer,
                        'enemy',
                        100, // speed
                        10 // damage
                    );
                }
                cooldown = 1.7 + Math.random() * 1.0;
            }
            this.aiShootCooldown.set(e, cooldown);
        }
        // Remove dead
        for (const e of this.enemies) {
            if (!e.alive) {
                e.destroy(this.scene, this.world);
            }
        }
        // Prune dead
        this.enemies = this.enemies.filter(e => e.alive);
        this.emitEnemyCount();
    }
    checkHit(hitBody: CANNON.Body, damage: number) {
        for (const e of this.enemies) {
            if (!e.alive) continue;
            if (e.body === hitBody) {
                e.hit(damage);
                if (!e.alive) {
                    eventBus.emit('score.updated', { score: 100 }); // 100 pts per kill (increment handled elsewhere)
                }
                this.emitEnemyCount();
            }
        }
    }
    emitEnemyCount() {
        eventBus.emit('enemy.count.updated', { enemies: this.aliveCount() });
    }
    aliveCount() {
        return this.enemies.filter(e => e.alive).length;
    }
    reset() {
        for (const e of this.enemies) {
            e.destroy(this.scene, this.world);
        }
        this.enemies = [];
        this.aiShootCooldown.clear();
        this.emitEnemyCount();
    }
}
