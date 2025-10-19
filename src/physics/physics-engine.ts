import * as CANNON from 'cannon-es';

export interface PhysicsEngineConfig {
    gravity?: [number, number, number];
    groundFriction?: number;
    groundRestitution?: number;
    cubeFriction?: number;
    cubeRestitution?: number;
}

export class PhysicsEngine {
    public world: CANNON.World;
    public groundMaterial: CANNON.Material;
    public cubeMaterial: CANNON.Material;
    public physicsMaterial: CANNON.Material;
    public contactMaterial: CANNON.ContactMaterial;
    public groundBody: CANNON.Body;

    constructor(config: PhysicsEngineConfig = {}) {
        const {
            gravity = [0, -9.82, 0],
            groundFriction = 0.05,
            groundRestitution = 0.0,
            cubeFriction = 0.05,
            cubeRestitution = 0.0,
        } = config;
        // Init world
        this.world = new CANNON.World({ gravity: new CANNON.Vec3(...gravity) });
        const solver = new CANNON.GSSolver();
        solver.iterations = 10;
        solver.tolerance = 0.001;
        this.world.solver = new CANNON.SplitSolver(solver);
        // Materials
        this.groundMaterial = new CANNON.Material('ground');
        this.cubeMaterial = new CANNON.Material('cube');
        this.physicsMaterial = this.cubeMaterial; // for compatibility
        this.contactMaterial = new CANNON.ContactMaterial(this.groundMaterial, this.cubeMaterial, {
            friction: groundFriction,
            restitution: groundRestitution,
        });
        this.world.addContactMaterial(this.contactMaterial);
        // Ground body
        this.groundBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
        this.groundBody.addShape(new CANNON.Plane());
        this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(this.groundBody);
    }

    addBody(body: CANNON.Body) {
        this.world.addBody(body);
    }

    addContactMaterial(mat: CANNON.ContactMaterial) {
        this.world.addContactMaterial(mat);
    }

    step(delta: number, fixedTimeStep: number = 1 / 60) {
        this.world.step(fixedTimeStep, delta);
    }
}
