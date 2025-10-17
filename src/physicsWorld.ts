import * as CANNON from 'cannon-es';

export function initPhysicsWorld(): CANNON.World {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0)
  });

  // Use a proper GSSolver (so we can set iterations)
  const solver = new CANNON.GSSolver();
  solver.iterations = 10;
  solver.tolerance = 0.001;

  // Optionally wrap with SplitSolver for better stability
  world.solver = new CANNON.SplitSolver(solver);

  world.broadphase = new CANNON.NaiveBroadphase();

  // --- Ground setup ---
  const groundMaterial = new CANNON.Material('ground');
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({
    mass: 0,
    material: groundMaterial
  });

  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  return world;
}
