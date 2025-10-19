// CoinManager: spawn, manage, and handle collection of coins/collectibles

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { eventBus } from '../utils/event-bus';

export interface Coin {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    collected: boolean;
}

export interface CoinManagerConfig {
    scene: THREE.Scene;
    world: CANNON.World;
    coinCount?: number;
    coinMaterial?: CANNON.Material;
    coinColor?: THREE.ColorRepresentation;
    area?: { x: number; y: number; z: number; size: number };
}

export class CoinManager {
    private coins: Coin[] = [];
    private scene: THREE.Scene;
    private world: CANNON.World;
    private coinMaterial?: CANNON.Material;
    private coinColor: THREE.ColorRepresentation;
    private coinCount: number;
    private area: { x: number; y: number; z: number; size: number };

    public coinsCollected: number = 0;
    public score: number = 0;

    constructor(cfg: CoinManagerConfig) {
        this.scene = cfg.scene;
        this.world = cfg.world;
        this.coinMaterial = cfg.coinMaterial;
        this.coinColor = cfg.coinColor ?? 0xffe152;
        this.coinCount = cfg.coinCount ?? 10;
        this.area = cfg.area ?? { x: 0, y: 2, z: 0, size: 40 };

        this.spawnCoins();

        eventBus.emit('coin.collected', {
            coins: 0,
            coinsTotal: this.coinCount,
            score: this.score
        });
    }

    spawnCoins() {
        for (let i = 0; i < this.coinCount; ++i) {
            const radius = 1;

            const coinGeometry = new THREE.CylinderGeometry(radius, radius, 0.3, 18);
            const coinMat = new THREE.MeshStandardMaterial({
                color: this.coinColor,
                metalness: 0.7,
                roughness: 0.3
            });

            const coinMesh = new THREE.Mesh(coinGeometry, coinMat);

            // Randomize spawn position within defined area
            const x = this.area.x + (Math.random() - 0.5) * this.area.size;
            const y = this.area.y + Math.random() * 2;
            const z = this.area.z + (Math.random() - 0.5) * this.area.size;

            coinMesh.position.set(x, y, z);
            coinMesh.castShadow = true;
            coinMesh.receiveShadow = true;
            coinMesh.rotation.x = Math.PI / 2;

            this.scene.add(coinMesh);

            const shape = new CANNON.Cylinder(radius, radius, 0.3, 18);
            const body = new CANNON.Body({
                mass: 0,
                shape,
                position: new CANNON.Vec3(x, y, z),
                material: this.coinMaterial
            });

            body.allowSleep = false;
            this.world.addBody(body);

            this.coins.push({ mesh: coinMesh, body, collected: false });
        }

        eventBus.emit('hud.update', { coinsTotal: this.coinCount });
    }

    update(playerBodies: CANNON.Body[]) {
        // Check each coin for collision with any player
        for (const coin of this.coins) {
            if (coin.collected) continue;

            for (const playerBody of playerBodies) {
                if (this._isColliding(coin.body, playerBody)) {
                    coin.collected = true;

                    this.scene.remove(coin.mesh);
                    this.world.removeBody(coin.body);

                    this.coinsCollected++;
                    this.score += 100;

                    eventBus.emit('coin.collected', {
                        coins: this.coinsCollected,
                        coinsTotal: this.coinCount,
                        score: this.score
                    });

                    break;
                }
            }
        }
    }

    private _isColliding(bodyA: CANNON.Body, bodyB: CANNON.Body): boolean {
        const dx = bodyA.position.x - bodyB.position.x;
        const dy = bodyA.position.y - bodyB.position.y;
        const dz = bodyA.position.z - bodyB.position.z;

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return dist < 2.2; // Simplified collision threshold for coins/player
    }

    reset() {
        for (const coin of this.coins) {
            this.scene.remove(coin.mesh);
            this.world.removeBody(coin.body);
        }

        this.coins = [];
        this.coinsCollected = 0;
        this.score = 0;

        this.spawnCoins();
    }

    getAllCoins(): Coin[] {
        return this.coins;
    }
}
