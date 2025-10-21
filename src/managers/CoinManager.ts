// CoinManager: spawn, manage, and handle collection of coins/collectibles - NON-PHYSICS version

import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { eventBus } from '../utils/event-bus';

export interface Coin {
    mesh: THREE.Mesh;
    collected: boolean;
}

export interface CoinManagerConfig {
    scene: THREE.Scene;
    world?: any; // physics world no longer required
    coinCount?: number;
    coinColor?: THREE.ColorRepresentation;
    area?: { x: number; y: number; z: number; size: number };
}

export class CoinManager {
    private coins: Coin[] = [];
    private scene: THREE.Scene;
    private coinColor: THREE.ColorRepresentation;
    private coinCount: number;
    private area: { x: number; y: number; z: number; size: number };

    public coinsCollected: number = 0;
    public score: number = 0;

    constructor(cfg: CoinManagerConfig) {
        this.scene = cfg.scene;
        this.coinColor = cfg.coinColor ?? 0xffe152;
        this.coinCount = cfg.coinCount ?? 10;
        this.area = cfg.area ?? { x: 0, y: 2, z: 0, size: 40 };
        this.spawnCoins();
        AudioManager.getInstance().preload(['coin-get.mp3']);
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
            this.coins.push({ mesh: coinMesh, collected: false });
        }
        eventBus.emit('hud.update', { coinsTotal: this.coinCount });
    }

    update(playerPositions: THREE.Vector3[] | { position: THREE.Vector3 }[]) {
        // update expects an array of player positions (THREE.Vector3 or wrappers)
        for (const coin of this.coins) {
            if (coin.collected) continue;
            for (const playerObj of playerPositions) {
                // allow both {position} and Vector3
                let playerPos: THREE.Vector3 = (playerObj instanceof THREE.Vector3) ? playerObj : playerObj.position;
                const dx = coin.mesh.position.x - playerPos.x;
                const dy = coin.mesh.position.y - playerPos.y;
                const dz = coin.mesh.position.z - playerPos.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < 2.2) {
                    coin.collected = true;
                    if (coin.mesh && this.scene) {
                        this.scene.remove(coin.mesh);
                    }
                    AudioManager.getInstance().play('coin-get.mp3');
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

    reset() {
        for (const coin of this.coins) {
            if (coin.mesh && this.scene) {
                this.scene.remove(coin.mesh);
            }
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
