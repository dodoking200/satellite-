import * as THREE from "three";
import SatelliteSimulation from "./simulation";

export default class PhysicsEngine {
  simulation: SatelliteSimulation;

  // Store state for each satellite
  satellites: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    mass: number;
  }[] = [];

  constructor(simulation: SatelliteSimulation) {
    this.simulation = simulation;
    this.satellites = [];
    this.reset();
  }

  addSatelliteState(options?: { position?: THREE.Vector3; velocity?: THREE.Vector3; mass?: number }) {
    // Default values
    const height = options?.position?.length() || this.simulation.EARTH_RADIUS + 400000;
    const position = options?.position || new THREE.Vector3(height, 0, 0);
    const velocity = options?.velocity || new THREE.Vector3(0, 7800, 0);
    const mass = options?.mass || 1000;
    this.satellites.push({ position: position.clone(), velocity: velocity.clone(), mass });
  }

  reset() {
    this.satellites = [];
    // Reset all satellites (should be called before re-adding them)
    // The SceneSetup will re-add satellites and trails
    this.simulation.sceneSetup.satellites = [];
    this.simulation.sceneSetup.trails = [];
    this.simulation.sceneSetup.trailLines = [];
  }

  updatePhysics(deltaTime: number) {
    const dt = deltaTime * this.simulation.timeScale;
    for (let i = 0; i < this.satellites.length; i++) {
      const sat = this.satellites[i];
      // Calculate distance from Earth center
      const distance = sat.position.length();
      // Check if satellite crashed into Earth
      if (distance <= this.simulation.EARTH_RADIUS) {
        const statusElement = document.getElementById("status");
        if (statusElement) {
          statusElement.textContent = `Satellite ${i + 1}: Crashed!`;
        }
        continue;
      }
      // Calculate gravitational force
      const forceMagnitude =
        (this.simulation.G * this.simulation.EARTH_MASS * sat.mass) /
        (distance * distance);
      const forceDirection = sat.position.clone().normalize().multiplyScalar(-1);
      const force = forceDirection.multiplyScalar(forceMagnitude);
      // Calculate acceleration (F = ma, so a = F/m)
      const acceleration = force.divideScalar(sat.mass);
      // Update velocity and position
      sat.velocity.add(acceleration.multiplyScalar(dt));
      sat.position.add(sat.velocity.clone().multiplyScalar(dt));
      // Add to trail
      if (
        this.simulation.sceneSetup.trails[i].length === 0 ||
        sat.position.distanceTo(
          this.simulation.sceneSetup.trails[i][
            this.simulation.sceneSetup.trails[i].length - 1
          ]
        ) > 1000
      ) {
        this.simulation.sceneSetup.trails[i].push(sat.position.clone());
        if (
          this.simulation.sceneSetup.trails[i].length >
          this.simulation.sceneSetup.maxTrailLength
        ) {
          this.simulation.sceneSetup.trails[i].shift();
        }
      }
      // Update satellite visual position
      this.simulation.sceneSetup.satellites[i].position.copy(
        sat.position.clone().multiplyScalar(this.simulation.SCALE_FACTOR)
      );
      // Update status (for first satellite only, or extend for all)
      if (i === 0) {
        const currentDistance = distance;
        const escapeVelocity = Math.sqrt(
          (2 * this.simulation.G * this.simulation.EARTH_MASS) / currentDistance
        );
        const currentSpeed = sat.velocity.length();
        const statusElement = document.getElementById("status");
        if (statusElement) {
          if (currentSpeed > escapeVelocity) {
            statusElement.textContent = "Escaping!";
          } else {
            statusElement.textContent = "Orbiting";
          }
        }
      }
    }
    this.simulation.sceneSetup.updateTrails();
    this.updateInfo();
  }

  updateInfo() {
    this.simulation.sceneSetup.updateInfo();
  }
}
