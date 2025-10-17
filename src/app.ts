import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CannonDebugger from 'cannon-es-debugger';

const timeStep = 1 / 60;

export class App {
    world: CANNON.World;
    lastCallTime: number | undefined;

    _scene: THREE.Scene;
    _perspectiveCamera: THREE.PerspectiveCamera;
    _renderer: THREE.WebGLRenderer;
    _orbitControls: OrbitControls;
    physicsMaterial: CANNON.Material;

    boxes: CANNON.Body[] = [];
    boxMeshes: THREE.Mesh[] = [];

    carModel?: THREE.Group;
    carBody?: CANNON.Body;

    cannonDebugger: { update: () => void };
    keys: Record<string, boolean> = {};

    constructor() {
        this.initThreeJs();
        this.initRenderer();
        this.initCannoJs();
        this.initCubesCannon();
        this.loadCar();
        // this.setupKeyControls();
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    initThreeJs() {
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));

        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(50, 50, 50);
        light.castShadow = true;
        light.shadow.mapSize.set(2048, 2048);
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500;
        scene.add(light);

        // Skybox
        const loader = new THREE.CubeTextureLoader();
        const skybox = loader.load([
            '/resources/sky/posx.jpg',
            '/resources/sky/negx.jpg',
            '/resources/sky/posy.jpg',
            '/resources/sky/negy.jpg',
            '/resources/sky/posz.jpg',
            '/resources/sky/negz.jpg',
        ]);
        scene.background = skybox;

        // Ground plane
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(5000, 5000),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        scene.add(plane);

        this._scene = scene;

        const camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 12, -25);
        this._perspectiveCamera = camera;
    }

    initRenderer() {
        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this._renderer.domElement);

        this._orbitControls = new OrbitControls(this._perspectiveCamera, this._renderer.domElement);
        this._orbitControls.target.set(0, 5, 0);
        this._orbitControls.enablePan = false;
        this._orbitControls.enableZoom = false;
        this._orbitControls.update();
    }

    initCannoJs() {
        this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

        const solver = new CANNON.GSSolver();
        solver.iterations = 10;
        solver.tolerance = 0.001;
        this.world.solver = new CANNON.SplitSolver(solver);

        this.physicsMaterial = new CANNON.Material('ground');
        const contact = new CANNON.ContactMaterial(this.physicsMaterial, this.physicsMaterial, {
            friction: 0.5,
            restitution: 0.3,
        });
        this.world.addContactMaterial(contact);

        const groundBody = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
        groundBody.addShape(new CANNON.Plane());
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);

        this.cannonDebugger = new (CannonDebugger as any)(this._scene, this.world, {
            color: '#8cd968ff',
        });
    }

    initCubesCannon() {
        const mass = 5;
        const size = 2;
        const halfExtents = new CANNON.Vec3(size, size, size);
        const boxShape = new CANNON.Box(halfExtents);
        const boxGeometry = new THREE.BoxGeometry(size * 2, size * 2, size * 2);
        const material = new THREE.MeshStandardMaterial({ color: 0x888888 });

        for (let i = -20; i < 20; i += 10) {
            for (let j = -20; j < 20; j += 10) {
                const boxBody = new CANNON.Body({ mass });
                boxBody.addShape(boxShape);
                boxBody.position.set(i * 2, 20, j * 2);
                this.world.addBody(boxBody);

                const cube = new THREE.Mesh(boxGeometry, material);
                cube.castShadow = true;
                cube.receiveShadow = true;
                cube.position.copy(boxBody.position as unknown as THREE.Vector3);
                this._scene.add(cube);

                this.boxes.push(boxBody);
                this.boxMeshes.push(cube);
            }
        }
    }

    async loadCar() {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync('/models/tesla_model_s_plaid_2023.glb');
        const car = gltf.scene;
        car.scale.set(0.1, 0.1, 0.1);
        car.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).castShadow = true;
                (child as THREE.Mesh).receiveShadow = true;
            }
        });
        this._scene.add(car);
        this.carModel = car;

        const carBodyShape = new CANNON.Box(new CANNON.Vec3(1.5, 0.6, 3));
        const carBody = new CANNON.Body({
            mass: 150,
            shape: carBodyShape,
            position: new CANNON.Vec3(0, 5, 0),
            material: this.physicsMaterial,
        });
        this.world.addBody(carBody);
        this.carBody = carBody;
    }

    setupKeyControls() {
        window.addEventListener('keydown', (e) => (this.keys[e.code] = true));
        window.addEventListener('keyup', (e) => (this.keys[e.code] = false));
    }

    moveCar(delta: number) {
        if (!this.carBody) return;
        const force = 120;
        const turnSpeed = 1.5;

        if (this.keys['KeyW']) {
            const impulse = new CANNON.Vec3(
                -Math.sin(this.carBody.quaternion.y) * force * delta,
                0,
                -Math.cos(this.carBody.quaternion.y) * force * delta
            );
            this.carBody.velocity.vadd(impulse, this.carBody.velocity);
        }

        if (this.keys['KeyS']) {
            const impulse = new CANNON.Vec3(
                Math.sin(this.carBody.quaternion.y) * force * delta,
                0,
                Math.cos(this.carBody.quaternion.y) * force * delta
            );
            this.carBody.velocity.vadd(impulse, this.carBody.velocity);
        }

        if (this.keys['KeyA']) {
            this.carBody.angularVelocity.y += turnSpeed * delta;
        }
        if (this.keys['KeyD']) {
            this.carBody.angularVelocity.y -= turnSpeed * delta;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = performance.now() / 1000;
        const delta = this.lastCallTime ? time - this.lastCallTime : 0;
        this.lastCallTime = time;

        this.moveCar(delta);
        this.world.step(timeStep);

        for (let i = 0; i < this.boxes.length; i++) {
            this.boxMeshes[i].position.copy(this.boxes[i].position as unknown as THREE.Vector3);
            this.boxMeshes[i].quaternion.copy(this.boxes[i].quaternion as unknown as THREE.Quaternion);
        }

        if (this.carModel && this.carBody) {
            this.carModel.position.copy(this.carBody.position as unknown as THREE.Vector3);
            this.carModel.quaternion.copy(this.carBody.quaternion as unknown as THREE.Quaternion);

            const camTarget = new THREE.Vector3(
                this.carModel.position.x,
                this.carModel.position.y + 4,
                this.carModel.position.z
            );
            const camPos = new THREE.Vector3(
                this.carModel.position.x - 15 * Math.sin(this.carBody.quaternion.y),
                this.carModel.position.y + 8,
                this.carModel.position.z - 15 * Math.cos(this.carBody.quaternion.y)
            );
            this._perspectiveCamera.position.lerp(camPos, 0.1);
            this._perspectiveCamera.lookAt(camTarget);
        }

        this.cannonDebugger.update();
        this._renderer.render(this._scene, this._perspectiveCamera);
    }

    onWindowResize() {
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();
        this._renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

new App();
