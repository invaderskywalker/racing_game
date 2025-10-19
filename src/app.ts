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

    boxes: any[] = [];
    boxMeshes: THREE.Mesh[] = [];

    carModel?: THREE.Group;
    carBody?: CANNON.Body;

    cannonDebugger: { update: () => void };
    keys: Record<string, boolean> = {};

    controlledCube?: CANNON.Body;
    cubeFacingAngle?: 0;
    cameraMode?: string;
    cubeMat?: CANNON.Material;

    _smoothedCameraPos?: THREE.Vector3;
    _smoothedLookTarget?: THREE.Vector3;



    constructor() {
        this.initThreeJs();
        this.initRenderer();
        this.initCannoJs();
        this.initCubesCannon();
        this.loadCar();
        this.setupKeyControls();
        this.animate();

        this.cubeFacingAngle = 0; // radians, 0 means facing +Z direction
        this.cameraMode = 'first';


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
            new THREE.PlaneGeometry(10000, 10000),
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
            10000
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

        // this._orbitControls = new OrbitControls(this._perspectiveCamera, this._renderer.domElement);
        // this._orbitControls.target.set(0, 5, 0);
        // this._orbitControls.enablePan = false;
        // this._orbitControls.enableZoom = false;
        // this._orbitControls.update();
    }

    initCannoJs() {
        this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

        const solver = new CANNON.GSSolver();
        solver.iterations = 10;
        solver.tolerance = 0.001;
        this.world.solver = new CANNON.SplitSolver(solver);

        // Ground material
        const groundMat = new CANNON.Material('ground');
        this.cubeMat = new CANNON.Material('cube');
        this.physicsMaterial = this.cubeMat;

        // Contact material (interaction between cube and ground)
        const contact = new CANNON.ContactMaterial(groundMat, this.cubeMat, {
            friction: 0.05,      // lower = easier to start moving
            restitution: 0.0,    // no bounce
        });
        this.world.addContactMaterial(contact);

        // Ground body
        const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
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
        boxGeometry.center(); // Ensure geometry is centered

        const solidMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const count = 80;

        // Reset lists
        this.boxes = [];

        for (let i = -count; i < count; i += 10) {
            for (let j = -count; j < count; j += 10) {
                // const boxBody = new CANNON.Body({ mass });
                const boxBody = new CANNON.Body({ mass, material: this.cubeMat });
                boxBody.addShape(boxShape);
                boxBody.position.set(i * 2, 3, j * 2);
                this.world.addBody(boxBody);

                const cube = new THREE.Mesh(boxGeometry, solidMaterial);
                cube.castShadow = true;
                cube.receiveShadow = true;
                this._scene.add(cube);

                const wire = new THREE.Mesh(boxGeometry, wireMaterial);
                this._scene.add(wire);

                if (!this.controlledCube) {
                    this.controlledCube = boxBody;
                    cube.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // highlight it

                    // 🚫 Lock rotation
                    boxBody.angularDamping = 1; // stop angular velocity
                    boxBody.angularVelocity.set(0, 0, 0);
                    boxBody.fixedRotation = true;

                    boxBody.linearDamping = 0.3; // smooth slowdown between frames
                    boxBody.allowSleep = false;


                    boxBody.updateMassProperties();
                }


                // Store objects as a single record for easy sync
                this.boxes.push({
                    body: boxBody,
                    mesh: cube,
                    debug: wire
                });
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
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyC') {
                this.cameraMode = this.cameraMode === 'first' ? 'third' : 'first';
            }
        });
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

    moveCube(delta: number) {
        if (!this.controlledCube) return;

        const body = this.controlledCube;
        const speed = 800; // forward force
        const turnSpeed = 2.5; // radians per second

        // Rotation controls
        if (this.keys['KeyA']) this.cubeFacingAngle += turnSpeed * delta;
        if (this.keys['KeyD']) this.cubeFacingAngle -= turnSpeed * delta;

        // --- Rotate the physics body to face the same angle ---
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.cubeFacingAngle);
        body.quaternion.copy(quat);

        // Calculate movement direction based on facing angle
        const forward = new CANNON.Vec3(
            Math.sin(this.cubeFacingAngle),
            0,
            Math.cos(this.cubeFacingAngle)
        );

        const moveForce = new CANNON.Vec3(0, 0, 0);

        if (this.keys['KeyW']) {
            moveForce.x += forward.x * speed;
            moveForce.z += forward.z * speed;
        }
        if (this.keys['KeyS']) {
            moveForce.x -= forward.x * speed;
            moveForce.z -= forward.z * speed;
        }
        // console.log("move", moveForce)
        body.applyForce(moveForce, body.position);

        // --- Limit speed ---
        const maxSpeed = 40;
        const velocity = body.velocity;
        const velLen = velocity.length();
        if (velLen > maxSpeed) {
            velocity.scale(maxSpeed / velLen, velocity);
        }
    }



    animate() {
        requestAnimationFrame(() => this.animate());

        const time = performance.now() / 1000;
        const delta = this.lastCallTime ? time - this.lastCallTime : 0;
        this.lastCallTime = time;

        // this.moveCar(delta);
        this.moveCube(delta);
        this.world.step(timeStep, delta);

        // Update all cubes (solid + wire)
        for (let { body, mesh, debug } of this.boxes) {
            const pos = body.position as unknown as THREE.Vector3;
            const quat = body.quaternion as unknown as THREE.Quaternion;

            mesh.position.copy(pos);
            mesh.quaternion.copy(quat);

            debug.position.copy(pos);
            debug.quaternion.copy(quat);
        }

        // make the controlled cube face the direction it's moving
        if (this.controlledCube) {
            const controlledBox = this.boxes.find(b => b.body === this.controlledCube);
            if (controlledBox) {
                controlledBox.mesh.rotation.y = this.cubeFacingAngle;
                controlledBox.debug.rotation.y = this.cubeFacingAngle;
            }
        }

        // --- FIRST-PERSON CAMERA ---
        if (this.controlledCube) {
            if (this.cameraMode == "first") {
                const cubePos = this.controlledCube.position as unknown as THREE.Vector3;

                // Eye offset (slightly above center of cube)
                const eyeHeight = 3;

                // Facing direction based on cube's rotation
                const forward = new THREE.Vector3(
                    Math.sin(this.cubeFacingAngle),
                    0,
                    Math.cos(this.cubeFacingAngle)
                );

                // Move slightly forward in local facing direction (not just world Z)
                const forwardOffset = forward.clone().multiplyScalar(2); // increase for more forward camera
                const heightOffset = new THREE.Vector3(0, eyeHeight, 0);

                // Combine offsets
                const cameraPos = new THREE.Vector3().copy(cubePos).add(heightOffset).add(forwardOffset);

                // Look further ahead
                const lookTarget = new THREE.Vector3().copy(cubePos).add(forward.clone().multiplyScalar(10));

                // Update camera instantly for now (can smooth with lerp)
                this._perspectiveCamera.position.copy(cameraPos);
                this._perspectiveCamera.lookAt(lookTarget);
            } else if (this.cameraMode === "third") {
                const cubePos = this.controlledCube.position as unknown as THREE.Vector3;


                // Facing direction based on cube's rotation
                const forward = new THREE.Vector3(
                    Math.sin(this.cubeFacingAngle),
                    0,
                    Math.cos(this.cubeFacingAngle)
                );

                // Camera offset parameters
                const followDistance = 10; // distance behind cube
                const height = 5;          // height above cube



                // Desired camera position (target)
                const targetCamPos = new THREE.Vector3()
                    .copy(cubePos)
                    .add(forward.clone().multiplyScalar(-followDistance))
                    .add(new THREE.Vector3(0, height, 0));

                if (!this._smoothedCameraPos)
                    this._smoothedCameraPos = new THREE.Vector3().copy(targetCamPos);



                // --- SMOOTH DAMP (fix for jitter) ---
                if (!this._smoothedCameraPos) this._smoothedCameraPos = new THREE.Vector3().copy(targetCamPos);
                this._smoothedCameraPos.lerp(targetCamPos, 0.08); // <— smoothing factor (0.05–0.2 works well)

                // Use smoothed position instead of direct
                this._perspectiveCamera.position.copy(this._smoothedCameraPos);



                // Smooth look-at too
                const lookTarget = new THREE.Vector3().copy(cubePos).add(forward.clone().multiplyScalar(5));

                if (!this._smoothedLookTarget)
                    this._smoothedLookTarget = new THREE.Vector3().copy(lookTarget);

                if (!this._smoothedLookTarget) this._smoothedLookTarget = new THREE.Vector3().copy(lookTarget);
                this._smoothedLookTarget.lerp(lookTarget, 0.1);

                this._perspectiveCamera.lookAt(this._smoothedLookTarget);
            }


        }



        if (this.cannonDebugger) this.cannonDebugger.update();
        this._renderer.render(this._scene, this._perspectiveCamera);
    }


    onWindowResize() {
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();
        this._renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

new App();
