import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CannonDebugger from 'cannon-es-debugger';
import { BasicSceneModule } from './scene/basic-scene';
import { InputManager, ActionMap } from './input/input-manager';
import { RendererManager } from './renderer/renderer-manager';
import { PhysicsEngine } from './physics/physics-engine';
import { PlayerManager } from './player/player-manager';
import { BoxGridManager } from './entities/box-grid-manager';
import { CoinManager } from './managers/CoinManager';
import { ProjectileManager } from './managers/ProjectileManager';
import { EnemyManager } from './managers/EnemyManager';
import { HUDManager } from './ui/HUDManager';
import { eventBus } from './utils/event-bus';

const timeStep = 1 / 60;

const DEFAULT_ACTION_MAP: ActionMap = {
    toggleCamera: ['KeyC'],
    switchPlayer: ['Tab'],
    moveForward: ['KeyW', 'ArrowUp'],
    moveBackward: ['KeyS', 'ArrowDown'],
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    jump: ['Space'],
    shoot: ['KeyF', 'Mouse0']
};

export class App {
    physics: PhysicsEngine;
    world: CANNON.World;
    lastCallTime: number | undefined;

    basicScene: BasicSceneModule;
    _scene: THREE.Scene;
    _perspectiveCamera: THREE.PerspectiveCamera;
    rendererManager: RendererManager;
    _orbitControls: OrbitControls;
    cannonDebugger: { update: () => void };
    _smoothedCameraPos?: THREE.Vector3;
    _smoothedLookTarget?: THREE.Vector3;

    input: InputManager;
    prevToggleCameraState = false;
    prevSwitchPlayerState = false;
    prevShootState = false;

    playerManager: PlayerManager;
    boxGridManager: BoxGridManager;
    coinManager: CoinManager;
    projectileManager: ProjectileManager;
    enemyManager: EnemyManager;
    hudManager: HUDManager;
    playerHealth: number = 100;

    constructor() {
        // --- Scene, Camera, Renderer ---
        this.basicScene = new BasicSceneModule();
        this._scene = this.basicScene.scene;
        this._perspectiveCamera = this.basicScene.camera;
        this.rendererManager = new RendererManager({ camera: this._perspectiveCamera });
        document.body.appendChild(this.rendererManager.domElement);
        this.rendererManager.addCamera('main', this._perspectiveCamera);

        // --- Input & Physics ---
        this.input = new InputManager(DEFAULT_ACTION_MAP);
        this.physics = new PhysicsEngine();
        this.world = this.physics.world;
        this.cannonDebugger = new (CannonDebugger as any)(this._scene, this.world, { color: '#8cd968ff' });

        // --- Managers & Entities ---
        this.initEntities();
        this.initPlayers();
        this.initCoinManager();
        this.initProjectileManager();
        this.initEnemyManager();
        this.initHUDManager();

        // --- Main Loop ---
        this.animate();
    }

    initEntities() {
        this.boxGridManager = new BoxGridManager(
            this._scene,
            this.physics.world,
            { cubeMaterial: this.physics.cubeMaterial }
        );
    }

    initPlayers() {
        this.playerManager = new PlayerManager(
            this._scene,
            this.physics.world,
            this.physics.cubeMaterial,
            this.physics.physicsMaterial
        );
    }

    initCoinManager() {
        this.coinManager = new CoinManager({
            scene: this._scene,
            world: this.physics.world,
            coinMaterial: this.physics.cubeMaterial,
            coinColor: 0xffe152,
            coinCount: 10
        });
    }

    initProjectileManager() {
        this.projectileManager = new ProjectileManager({
            scene: this._scene,
            world: this.physics.world,
            bulletMaterial: this.physics.cubeMaterial,
            bulletColor: 0xffff00,
            maxBullets: 10
        });
    }

    initEnemyManager() {
        this.enemyManager = new EnemyManager({
            scene: this._scene,
            world: this.physics.world,
            playerGetter: () => {
                const activePlayer = this.playerManager.activePlayer;
                return activePlayer ? activePlayer.body.position.clone() as unknown as THREE.Vector3 : new THREE.Vector3(0, 2, 0);
            },
            projectileManager: this.projectileManager,
            maxEnemies: 5,
            spawnArea: { x: 0, y: 2, z: 0, size: 100, range: 100 },
            spawnIntervalSec: 6
        });
    }

    initHUDManager() {
        this.hudManager = new HUDManager();
        eventBus.emit('player.health.changed', { health: this.playerHealth });
    }

    /**
     * Check all bullets' collisions with enemies and players (and update states, HUD, etc)
     */
    handleProjectileCollisions() {
        // Player bullets hit enemies
        const bullets = this.projectileManager.getActiveBullets('player');
        for (const proj of bullets) {
            for (const enemy of this.enemyManager.enemies) {
                if (!enemy.alive) continue;
                // Simple overlap collision test
                const d = proj.body.position.vsub(enemy.body.position);
                if (d.length() < 2.5) {
                    this.enemyManager.checkHit(enemy.body, proj.damage);
                    this.projectileManager._despawn(proj);
                    break;
                }
            }
        }
        // Enemy bullets hit player
        const activePlayer = this.playerManager.activePlayer;
        if (activePlayer) {
            const playerBody = activePlayer.body;
            const eBullets = this.projectileManager.getActiveBullets('enemy');
            for (const proj of eBullets) {
                const d = proj.body.position.vsub(playerBody.position);
                if (d.length() < 2.5) {
                    // Damage player
                    this.playerHealth -= proj.damage;
                    eventBus.emit('player.health.changed', { health: this.playerHealth });
                    this.projectileManager._despawn(proj);
                    // Optionally trigger screen shake/damage effect
                    if (this.playerHealth <= 0) {
                        this.playerHealth = 0;
                        // TODO: handle player death (respawn/restart logic, show overlay, etc.)
                    }
                    break;
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const time = performance.now() / 1000;
        const delta = this.lastCallTime ? time - this.lastCallTime : 0;
        this.lastCallTime = time;

        const activePlayer = this.playerManager.activePlayer;
        // === Input Handling for Camera/Player Toggles ===
        const cameraAction = this.input.isActionActive('toggleCamera');
        if (cameraAction && !this.prevToggleCameraState && activePlayer) {
            activePlayer.toggleCameraMode();
        }
        this.prevToggleCameraState = cameraAction;
        const switchPlayerAction = this.input.isActionActive('switchPlayer');
        if (switchPlayerAction && !this.prevSwitchPlayerState) {
            this.playerManager.switchPlayer();
        }
        this.prevSwitchPlayerState = switchPlayerAction;

        // === Player Movement (Per-frame WASD) ===
        if (activePlayer) {
            const keys: Record<string, boolean> = {};
            for (const key of this.input.pressed) keys[key] = true;
            this.playerManager.tick(delta, keys);
        }

        // --- Shooting ---
        const shootAction = this.input.isActionActive('shoot');
        if (activePlayer && shootAction && !this.prevShootState) {
            // Shoot bullet in facing direction from activePlayer
            const camParams = activePlayer.getCameraParams();
            const muzzle = camParams.position.clone(); // muzzle position
            let shootDir = camParams.lookTarget.clone().sub(camParams.position).normalize();
            // If the cam is very near lookTarget (first-person), ensure forward vector
            if (shootDir.length() < 0.1) shootDir = new THREE.Vector3(0,0,1);
            this.projectileManager.spawnBullet(
                muzzle,
                shootDir,
                'player',
                120,
                25
            );
        }
        this.prevShootState = shootAction;

        // --- Physics ---
        this.physics.step(delta, timeStep);

        // --- Coin Collection ---
        const playerBodies: CANNON.Body[] = [];
        for (const key of this.playerManager.getAvailablePlayerKeys()) {
            const player = (this.playerManager as any).players.get(key);
            if (player && player.body) playerBodies.push(player.body);
        }
        if (this.coinManager && playerBodies.length > 0) {
            this.coinManager.update(playerBodies);
        }

        // --- Update modular managers per frame ---
        if (this.boxGridManager) this.boxGridManager.update();
        if (this.projectileManager) this.projectileManager.update();
        if (this.enemyManager) this.enemyManager.update(delta, time, playerBodies);
        this.handleProjectileCollisions();

        // --- Camera Follow/Orbit ---
        if (activePlayer) {
            const camParams = activePlayer.getCameraParams();
            if (activePlayer.cameraMode === 'third') {
                if (!this._smoothedCameraPos)
                    this._smoothedCameraPos = new THREE.Vector3().copy(camParams.position);
                this._smoothedCameraPos.lerp(camParams.position, 0.08);
                this._perspectiveCamera.position.copy(this._smoothedCameraPos);
                if (!this._smoothedLookTarget)
                    this._smoothedLookTarget = new THREE.Vector3().copy(camParams.lookTarget);
                this._smoothedLookTarget.lerp(camParams.lookTarget, 0.1);
                this._perspectiveCamera.lookAt(this._smoothedLookTarget);
            } else {
                this._perspectiveCamera.position.copy(camParams.position);
                this._perspectiveCamera.lookAt(camParams.lookTarget);
            }
        }

        if (this.cannonDebugger) this.cannonDebugger.update();
        this.rendererManager.render(this._scene, this._perspectiveCamera);
    }
}

new App();
