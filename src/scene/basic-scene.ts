import * as THREE from 'three';

export interface BasicSceneConfig {
    groundColor?: THREE.ColorRepresentation;
    groundSize?: number;
    ambientIntensity?: number;
    directionalIntensity?: number;
}

export class BasicSceneModule {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public ground: THREE.Mesh;
    public ambientLight: THREE.AmbientLight;
    public directionalLight: THREE.DirectionalLight;
    public skybox: THREE.CubeTexture;

    constructor(config: BasicSceneConfig = {}) {
        const {
            groundColor = 0xffffff,
            groundSize = 10000,
            ambientIntensity = 0.7,
            directionalIntensity = 1
        } = config;
        this.scene = new THREE.Scene();
        // Skybox
        const loader = new THREE.CubeTextureLoader();
        this.skybox = loader.load([
            '/resources/sky/posx.jpg', '/resources/sky/negx.jpg',
            '/resources/sky/posy.jpg', '/resources/sky/negy.jpg',
            '/resources/sky/posz.jpg', '/resources/sky/negz.jpg',
        ]);
        this.scene.background = this.skybox;
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
        this.scene.add(this.ambientLight);
        // Directional light
        this.directionalLight = new THREE.DirectionalLight(0xffffff, directionalIntensity);
        this.directionalLight.position.set(50, 200, 50);
        this.directionalLight.castShadow = true;

        // Expand shadow camera frustum to cover the whole scene area
        const shadowCam = this.directionalLight.shadow.camera as THREE.OrthographicCamera;
        shadowCam.left = -200;
        shadowCam.right = 200;
        shadowCam.top = 200;
        shadowCam.bottom = -200;
        shadowCam.near = 0.1;
        shadowCam.far = 500;
        shadowCam.updateProjectionMatrix();

        this.directionalLight.shadow.mapSize.set(100000, 10000);
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 500;
        this.scene.add(this.directionalLight);
        // Ground plane
        this.ground = new THREE.Mesh(
            new THREE.PlaneGeometry(groundSize, groundSize),
            new THREE.MeshStandardMaterial({ color: groundColor })
        );
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 10000
        );
        this.camera.position.set(0, 12, -25);
    }
}
