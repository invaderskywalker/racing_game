import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface BoxGridManagerConfig {
    mass?: number;
    size?: number;
    count?: number;
    cubeMaterial?: CANNON.Material;
    solidColor?: THREE.ColorRepresentation;
    wireColor?: THREE.ColorRepresentation;
}

export class BoxGridManager {
    public boxes: { body: CANNON.Body; mesh: THREE.Mesh; debug: THREE.Mesh }[] = [];
    constructor(
        public scene: THREE.Scene,
        public world: CANNON.World,
        config: BoxGridManagerConfig = {}
    ) {
        const {
            mass = 5,
            size = 2,
            count = 80,
            cubeMaterial = undefined,
            solidColor = 0x888888,
            wireColor = 0xff0000
        } = config;
        const halfExtents = new CANNON.Vec3(size, size, size);
        const boxShape = new CANNON.Box(halfExtents);
        const boxGeometry = new THREE.BoxGeometry(size * 2, size * 2, size * 2);
        boxGeometry.center();
        const solidMaterial = new THREE.MeshStandardMaterial({ color: solidColor });
        const wireMaterial = new THREE.MeshBasicMaterial({ color: wireColor, wireframe: true });
        for (let i = -count; i < count; i += 10) {
            for (let j = -count; j < count; j += 10) {
                const boxBody = new CANNON.Body({ mass, material: cubeMaterial });
                boxBody.addShape(boxShape);
                boxBody.position.set(i * 2, 3, j * 2);
                this.world.addBody(boxBody);
                const cube = new THREE.Mesh(boxGeometry, solidMaterial);
                cube.castShadow = true;
                cube.receiveShadow = true;
                this.scene.add(cube);
                const wire = new THREE.Mesh(boxGeometry, wireMaterial);
                this.scene.add(wire);
                this.boxes.push({ body: boxBody, mesh: cube, debug: wire });
            }
        }
    }
    update() {
        for (let { body, mesh, debug } of this.boxes) {
            const pos = body.position as unknown as THREE.Vector3;
            const quat = body.quaternion as unknown as THREE.Quaternion;
            mesh.position.copy(pos);
            mesh.quaternion.copy(quat);
            debug.position.copy(pos);
            debug.quaternion.copy(quat);
        }
    }
}
