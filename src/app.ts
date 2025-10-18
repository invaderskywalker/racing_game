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
        this.setupKeyControls();
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
            friction: 0.1,
            restitution: 0.1,
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
        const count = 80

        for (let i = -count; i < count; i += 10) {
            for (let j = -count; j < count; j += 10) {
                const boxBody = new CANNON.Body({ mass });
                boxBody.addShape(boxShape);
                boxBody.position.set(i * 2, 10, j * 2);
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
        car.scale.set(0.05, 0.05, 0.05);
        car.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).castShadow = true;
                (child as THREE.Mesh).receiveShadow = true;
            }
        });
        this._scene.add(car);
        this.carModel = car;

        // ⚙️ Adjust physics box to match model
        const carHalfExtents = new CANNON.Vec3(3, 0.1, 1.0); // much smaller box
        const carBodyShape = new CANNON.Box(carHalfExtents);

        const carBody = new CANNON.Body({
            mass: 10,
            shape: carBodyShape,
            position: new CANNON.Vec3(4, 40, 5),
            material: this.physicsMaterial,
        });
        // carBody.position.set(4,40,5);

        carBody.allowSleep = false;
        carBody.linearDamping = 0.05;
        carBody.angularDamping = 0.01;

        // Slight Y offset to match car wheels' approximate height
        carBody.position.y = 2.5;
        this.world.addBody(carBody);
        this.carBody = carBody;

        const debugMesh = new THREE.Mesh(
            new THREE.BoxGeometry(carHalfExtents.x * 2, carHalfExtents.y * 2, carHalfExtents.z * 2),
            new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        );
        this._scene.add(debugMesh);
        const box = new THREE.Box3().setFromObject(car);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        console.log('Tesla size:', size, 'center:', center);

    }

    setupKeyControls() {
        window.addEventListener('keydown', (e) => (this.keys[e.code] = true));
        window.addEventListener('keyup', (e) => (this.keys[e.code] = false));
    }

    moveCar(delta: number) {
        if (!this.carBody) return;

        const forwardForce = 55000; // increased, since applyForce needs more strength
        const turnSpeed = 1.5;

        // Get car's forward direction from quaternion
        const forward = new CANNON.Vec3(1, 0, 0);
        this.carBody.quaternion.vmult(forward, forward); // rotate vector by car orientation


        // Move forward/backward
        if (this.keys['KeyW']) {
            const force = forward.scale(forwardForce * delta);
            this.carBody.applyForce(force, this.carBody.position);
        }

        if (this.keys['KeyS']) {
            const force = forward.scale(-forwardForce * delta);
            this.carBody.applyForce(force, this.carBody.position);
        }

        // Rotate car in place (simplified steering)
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
        this.world.step(timeStep, delta);

        // Update cube positions
        for (let i = 0; i < this.boxes.length; i++) {
            this.boxMeshes[i].position.copy(this.boxes[i].position as unknown as THREE.Vector3);
            this.boxMeshes[i].quaternion.copy(this.boxes[i].quaternion as unknown as THREE.Quaternion);
        }

        // Car + camera follow
        if (this.carModel && this.carBody) {
            this.carModel.position.copy(this.carBody.position as unknown as THREE.Vector3);
            this.carModel.quaternion.copy(this.carBody.quaternion as unknown as THREE.Quaternion);

            // Simple follow camera
            const offset = new THREE.Vector3(0, 6, -15); // camera offset relative to car
            const carPos = this.carModel.position.clone();

            // Create a rotation matrix from car's quaternion to apply offset in car's direction
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationFromQuaternion(this.carModel.quaternion);

            const cameraOffset = offset.applyMatrix4(rotationMatrix);
            const cameraPosition = carPos.clone().add(cameraOffset);

            // this._perspectiveCamera.position.copy(cameraPosition);
            // this._perspectiveCamera.lookAt(carPos);
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
