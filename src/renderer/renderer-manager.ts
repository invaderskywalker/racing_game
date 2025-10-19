import * as THREE from 'three';

export interface RendererManagerConfig {
    width?: number;
    height?: number;
    antialias?: boolean;
    camera?: THREE.Camera;
    canvas?: HTMLCanvasElement;
}

export class RendererManager {
    public renderer: THREE.WebGLRenderer;
    public cameras: Record<string, THREE.Camera> = {};
    public activeCameraKey: string = 'main';
    public domElement: HTMLCanvasElement;

    constructor(config: RendererManagerConfig = {}) {
        const {
            width = window.innerWidth,
            height = window.innerHeight,
            antialias = true,
            camera,
            canvas
        } = config;
        this.renderer = new THREE.WebGLRenderer({
            antialias,
            canvas: canvas || undefined
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setSize(width, height);
        this.domElement = this.renderer.domElement;
        if (camera) {
            this.cameras['main'] = camera;
        }
        window.addEventListener('resize', this.handleResize);
    }

    addCamera(key: string, camera: THREE.Camera) {
        this.cameras[key] = camera;
    }

    setActiveCamera(key: string) {
        if (this.cameras[key]) {
            this.activeCameraKey = key;
        }
    }

    get activeCamera(): THREE.Camera | undefined {
        return this.cameras[this.activeCameraKey];
    }

    render(scene: THREE.Scene, camera?: THREE.Camera) {
        this.renderer.render(scene, camera || this.activeCamera || undefined);
    }

    handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);
        Object.values(this.cameras).forEach((cam) => {
            if ((cam as THREE.PerspectiveCamera).isPerspectiveCamera) {
                const persp = cam as THREE.PerspectiveCamera;
                persp.aspect = width / height;
                persp.updateProjectionMatrix();
            }
        });
    }

    destroy() {
        window.removeEventListener('resize', this.handleResize);
        // Optionally dispose renderer
        this.renderer.dispose();
    }
}
