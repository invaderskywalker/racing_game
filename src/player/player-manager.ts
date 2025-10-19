import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CubePlayer } from './cube';
import { CarPlayer } from './car';
import { BasePlayer } from './base';

export type PlayerKey = 'cube' | 'car';

export interface PlayerManagerConfig {
    enableCar?: boolean;
    enableCube?: boolean;
}

export class PlayerManager {
    private players: Map<PlayerKey, BasePlayer> = new Map();
    private currentKey: PlayerKey = 'cube';
    constructor(
        private scene: THREE.Scene,
        private world: CANNON.World,
        private cubeMaterial: CANNON.Material,
        private physicsMaterial: CANNON.Material,
        config: PlayerManagerConfig = { enableCar: true, enableCube: true }
    ) {
        if (config.enableCube !== false) {
            this.players.set('cube', new CubePlayer(scene, world, cubeMaterial));
        }
        if (config.enableCar !== false) {
            this.players.set('car', new CarPlayer(scene, world, physicsMaterial));
        }
        // Always default to cube if present, otherwise car
        if (this.players.has('cube')) {
            this.currentKey = 'cube';
        } else if (this.players.has('car')) {
            this.currentKey = 'car';
        }
    }
    setActivePlayer(key: PlayerKey) {
        if (this.players.has(key)) {
            this.currentKey = key;
        }
    }
    switchPlayer() {
        // Cycle: cube <-> car
        if (this.players.size < 2) return;
        if (this.currentKey === 'cube' && this.players.has('car') && (this.players.get('car') as any).gltfLoaded) {
            this.currentKey = 'car';
        } else {
            this.currentKey = 'cube';
        }
    }
    get activePlayer(): BasePlayer | undefined {
        return this.players.get(this.currentKey);
    }
    getAvailablePlayerKeys(): PlayerKey[] {
        return Array.from(this.players.keys());
    }
    tick(delta: number, keys: Record<string, boolean>) {
        const p = this.activePlayer;
        if (p) {
            p.move(delta, keys);
            p.syncToPhysics();
        }
    }
}
