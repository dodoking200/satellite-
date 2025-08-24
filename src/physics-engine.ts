import * as THREE from "three";
import SatelliteSimulation from "./simulation";

export default class PhysicsEngine {
  simulation: SatelliteSimulation;

  // Store state for each satellite
  satellites: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    mass: number;
    
    /* Drag force properties */
    dragCoefficient?: number;
    area?: number;
    initialDensity?: number;
    densityScaleHeight?: number;
    airEnabled?: boolean;
    timeScale?: number;
  }[] = [];

  constructor(simulation: SatelliteSimulation) {
    this.simulation = simulation;
    this.satellites = [];
    this.reset();
  }

  addSatelliteState(options?: { position?: THREE.Vector3; velocity?: THREE.Vector3; mass?: number; dragCoefficient?: number; area?: number; initialDensity?: number; densityScaleHeight?: number; airEnabled?: boolean; timeScale?: number }) {
    // Default values
    const height = options?.position?.length() || this.simulation.EARTH_RADIUS + 400000;
    const position = options?.position || new THREE.Vector3(height, 0, 0);
    const velocity = options?.velocity || new THREE.Vector3(0, 7800, 0);
    const mass = options?.mass || 1000;
    
    // Drag force defaults
    const dragCoefficient = options?.dragCoefficient ?? 2.2;
    const area = options?.area ?? 4;
    const initialDensity = options?.initialDensity ?? 1.225;
    const densityScaleHeight = options?.densityScaleHeight ?? 8500;
    const airEnabled = options?.airEnabled ?? true;
    const timeScale = options?.timeScale ?? 1;
    
    this.satellites.push({ 
      position: position.clone(), 
      velocity: velocity.clone(), 
      mass,
      dragCoefficient,
      area,
      initialDensity,
      densityScaleHeight,
      airEnabled,
      timeScale
    });
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
    for (let i = 0; i < this.satellites.length; i++) {
      const sat = this.satellites[i];
      // Per-satellite scaled dt
      let dt = deltaTime * this.simulation.timeScale * (sat.timeScale ?? 1);
      
      // Safety check: Limit time scale to prevent orbital instability and performance issues
      const maxSafeTimeScale = 20;
      const maxSatelliteTimeScale = 10;
      
      if (this.simulation.timeScale > maxSafeTimeScale) {
        console.warn(`Time scale ${this.simulation.timeScale} is too high for stable orbital mechanics. Limiting to ${maxSafeTimeScale}.`);
        dt = deltaTime * maxSafeTimeScale * (sat.timeScale ?? 1);
      }
      
      if ((sat.timeScale ?? 1) > maxSatelliteTimeScale) {
        console.warn(`Satellite time scale ${sat.timeScale} is too high. Limiting to ${maxSatelliteTimeScale}.`);
        dt = deltaTime * this.simulation.timeScale * maxSatelliteTimeScale;
      }
      
      // Ensure associated arrays exist to avoid runtime errors
      if (!this.simulation.sceneSetup.trails[i]) this.simulation.sceneSetup.trails[i] = [];

      // Auto-disable air resistance for escape scenarios (very high velocities)
      const velocityMagnitude = sat.velocity.length();
      const escapeVelocity = Math.sqrt((2 * this.simulation.G * this.simulation.EARTH_MASS) / sat.position.length());
      if (velocityMagnitude > escapeVelocity * 0.95) {
        // Near escape velocity - disable air resistance to prevent unrealistic effects
        sat.airEnabled = false;
      }
      
      // Auto-disable air resistance for very low altitudes (crash scenarios)
      const altitude = sat.position.length() - this.simulation.EARTH_RADIUS;
      if (altitude < 100000) { // Below 100km
        sat.airEnabled = false;
      }
      
      // Integrate with substeps for stability
      const maxStep = 0.01; // seconds
      const maxSubsteps = 50;
      let substepCount = 0;
      
      while (dt > 0 && substepCount < maxSubsteps) {
        const step = Math.min(maxStep, dt);
        substepCount++;

        // Calculate distance from Earth center
        const distance = sat.position.length();
        const altitude = distance - this.simulation.EARTH_RADIUS;
        
        // Check if satellite crashed into Earth
        const crashThreshold = 80000; // 80km above surface
        if (altitude <= crashThreshold) {
          console.log(`Satellite ${i + 1} altitude ${(altitude/1000).toFixed(1)}km <= crash threshold ${(crashThreshold/1000).toFixed(1)}km - CRASHING!`);
          const statusElement = document.getElementById("status");
          if (statusElement) {
            statusElement.textContent = `Satellite ${i + 1}: Crashed!`;
          }
          continue;
        }

        // Calculate gravitational force
        const gravityMagnitude =
          (this.simulation.G * this.simulation.EARTH_MASS * sat.mass) /
          (distance * distance);
        const gravityDirection = sat.position.clone().normalize().multiplyScalar(-1);
        const gravityForce = gravityDirection.multiplyScalar(gravityMagnitude);

        // Atmospheric drag calculation
        let dragForce = new THREE.Vector3(0, 0, 0);
        if (sat.airEnabled) {
          const h = Math.max(0, distance - this.simulation.EARTH_RADIUS);
          
          // Enhanced atmospheric density model
          let rho;
          if (h < 11000) { // Troposphere (0-11km)
            rho = 1.225 * Math.pow(1 - 0.0065 * h / 288.15, 4.256);
          } else if (h < 20000) { // Lower stratosphere (11-20km)
            rho = 0.3639 * Math.exp(-(h - 11000) / 6341.6);
          } else if (h < 32000) { // Upper stratosphere (20-32km)
            rho = 0.0880 * Math.exp(-(h - 20000) / 7360.0);
          } else if (h < 47000) { // Lower mesosphere (32-47km)
            rho = 0.0132 * Math.exp(-(h - 32000) / 8000.0);
          } else if (h < 51000) { // Upper mesosphere (47-51km)
            rho = 0.00143 * Math.exp(-(h - 47000) / 7500.0);
          } else if (h < 71000) { // Lower thermosphere (51-71km)
            rho = 0.000086 * Math.exp(-(h - 51000) / 10000.0);
          } else if (h < 100000) { // Upper thermosphere (71-100km)
            rho = 0.0000032 * Math.exp(-(h - 71000) / 15000.0);
          } else if (h < 200000) { // Low Earth Orbit (100-200km)
            rho = 0.0000001 * Math.exp(-(h - 100000) / 25000.0);
          } else if (h < 500000) { // Medium Earth Orbit (200-500km)
            rho = 0.00000001 * Math.exp(-(h - 200000) / 100000.0);
          } else { // High Earth Orbit (500km+)
            rho = 0.000000001 * Math.exp(-(h - 500000) / 500000.0);
          }
          
          const v = sat.velocity.length();
          if (v > 1) { // Only apply drag if velocity is significant
            const Cd = sat.dragCoefficient ?? 2.2;
            const A = sat.area ?? 4;
            const dragMagnitude = 0.5 * rho * v * v * Cd * A;
            
            // Debug drag force at orbital altitudes
            if (h > 100000 && h < 500000) { // LEO altitudes
              console.log(`Drag at ${(h/1000).toFixed(1)}km: ρ=${rho.toExponential(3)} kg/m³, v=${v.toFixed(0)} m/s, F=${(dragMagnitude/1000).toFixed(2)} kN`);
            }
            
            const vhat = sat.velocity.clone().normalize();
            dragForce = vhat.multiplyScalar(-dragMagnitude);
          }
        }

        // Sum forces and integrate
        const totalForce = gravityForce.add(dragForce);
        const acceleration = totalForce.divideScalar(sat.mass);
        
        // Velocity Verlet integration for orbital stability
        const velocityHalf = sat.velocity.clone().add(acceleration.clone().multiplyScalar(step * 0.5));
        sat.position.add(velocityHalf.clone().multiplyScalar(step));
        
        // Recalculate acceleration at new position for better accuracy
        const newDistance = sat.position.length();
        const newAltitude = newDistance - this.simulation.EARTH_RADIUS;
        
        // Check for crash after position update
        if (newAltitude <= crashThreshold) {
          console.log(`Satellite ${i + 1} new altitude ${(newAltitude/1000).toFixed(1)}km <= crash threshold ${(crashThreshold/1000).toFixed(1)}km - CRASHING after position update!`);
          const statusElement = document.getElementById("status");
          if (statusElement) {
            statusElement.textContent = `Satellite ${i + 1}: Crashed!`;
          }
          continue;
        }
        
        const newGravityMagnitude = (this.simulation.G * this.simulation.EARTH_MASS * sat.mass) / (newDistance * newDistance);
        const newGravityDirection = sat.position.clone().normalize().multiplyScalar(-1);
        const newGravityForce = newGravityDirection.multiplyScalar(newGravityMagnitude);
        
        // Recalculate drag at new position
        let newDragForce = new THREE.Vector3(0, 0, 0);
        if (sat.airEnabled) {
          const h = Math.max(0, newDistance - this.simulation.EARTH_RADIUS);
          
          // Use the same enhanced atmospheric density model
          let rho;
          if (h < 11000) { // Troposphere (0-11km)
            rho = 1.225 * Math.pow(1 - 0.0065 * h / 288.15, 4.256);
          } else if (h < 20000) { // Lower stratosphere (11-20km)
            rho = 0.3639 * Math.exp(-(h - 11000) / 6341.6);
          } else if (h < 32000) { // Upper stratosphere (20-32km)
            rho = 0.0880 * Math.exp(-(h - 20000) / 7360.0);
          } else if (h < 47000) { // Lower mesosphere (32-47km)
            rho = 0.0132 * Math.exp(-(h - 32000) / 8000.0);
          } else if (h < 51000) { // Upper mesosphere (47-51km)
            rho = 0.00143 * Math.exp(-(h - 47000) / 7500.0);
          } else if (h < 71000) { // Lower thermosphere (51-71km)
            rho = 0.000086 * Math.exp(-(h - 51000) / 10000.0);
          } else if (h < 100000) { // Upper thermosphere (71-100km)
            rho = 0.0000032 * Math.exp(-(h - 71000) / 15000.0);
          } else if (h < 200000) { // Low Earth Orbit (100-200km)
            rho = 0.0000001 * Math.exp(-(h - 100000) / 25000.0);
          } else if (h < 500000) { // Medium Earth Orbit (200-500km)
            rho = 0.00000001 * Math.exp(-(h - 200000) / 100000.0);
          } else { // High Earth Orbit (500km+)
            rho = 0.000000001 * Math.exp(-(h - 500000) / 500000.0);
          }
          
          const v = velocityHalf.length();
          if (v > 1) { // Only apply drag if velocity is significant
            const Cd = sat.dragCoefficient ?? 2.2;
            const A = sat.area ?? 4;
            const dragMagnitude = 0.5 * rho * v * v * Cd * A;
            const vhat = velocityHalf.clone().normalize();
            newDragForce = vhat.multiplyScalar(-dragMagnitude);
          }
        }
        
        const newTotalForce = newGravityForce.add(newDragForce);
        const newAcceleration = newTotalForce.divideScalar(sat.mass);
        
        // Update velocity using the new acceleration
        sat.velocity.add(newAcceleration.clone().multiplyScalar(step));

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
        
        // Update status (for first satellite only)
        if (i === 0) {
          const currentDistance = sat.position.length();
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
    }
    
    this.simulation.sceneSetup.updateTrails();
    this.updateInfo();
  }

  updateInfo() {
    this.simulation.sceneSetup.updateInfo();
  }
}
