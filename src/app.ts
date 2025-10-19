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

const timeStep = 1 / 60;

const DEFAULT_ACTION_MAP: ActionMap = {
    toggleCamera: ['KeyC'],
    switchPlayer: ['Tab'],
    moveForward: ['KeyW', 'ArrowUp'],
    moveBackward: ['KeyS', 'ArrowDown'],
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight']
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

    // Input
    input: InputManager;
    prevToggleCameraState = false;
    prevSwitchPlayerState = false;

    // Players
    playerManager: PlayerManager;

    // Box Grid Manager
    boxGridManager: BoxGridManager;

    constructor() {
        this.basicScene = new BasicSceneModule();
        this._scene = this.basicScene.scene;
        this._perspectiveCamera = this.basicScene.camera;
        this.rendererManager = new RendererManager({ camera: this._perspectiveCamera });
        document.body.appendChild(this.rendererManager.domElement);
        this.rendererManager.addCamera('main', this._perspectiveCamera);
        this.input = new InputManager(DEFAULT_ACTION_MAP);
        this.physics = new PhysicsEngine();
        this.world = this.physics.world;
        this.cannonDebugger = new (CannonDebugger as any)(this._scene, this.world, { color: '#8cd968ff', });
        this.initEntities();
        this.initPlayers();
        this.animate();
    }
    initEntities() {
        // Modularized box grid manager
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
    animate() {
        requestAnimationFrame(() => this.animate());
        const time = performance.now() / 1000;
        const delta = this.lastCallTime ? time - this.lastCallTime : 0;
        this.lastCallTime = time;
        // === Input handling for toggles (camera/player) ===
        const activePlayer = this.playerManager.activePlayer;
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
        // === Player movement (keyboard) ===
        if (activePlayer) {
            const keys: Record<string, boolean> = {};
            for (const key of this.input.pressed) keys[key] = true;
            this.playerManager.tick(delta, keys);
        }
        // Step physics world
        this.physics.step(delta, timeStep);
        // Update all cubes/box grid from entity manager
        this.boxGridManager.update();
        // Camera follow logic
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
