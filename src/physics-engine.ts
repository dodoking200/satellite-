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

  // Cache for atmospheric density calculation
  private atmosphericDensityCache = new Map<number, number>();

  constructor(simulation: SatelliteSimulation) {
    this.simulation = simulation;
    this.satellites = [];
    this.reset();
  }

  /**
   * Calculate atmospheric density at given altitude
   * @param altitude Altitude above Earth surface in meters
   * @returns Atmospheric density in kg/m³
   */
  public calculateAtmosphericDensity(altitude: number): number {
    // Round altitude to nearest 100m for caching
    const cacheKey = Math.round(altitude / 100) * 100;

    if (this.atmosphericDensityCache.has(cacheKey)) {
      return this.atmosphericDensityCache.get(cacheKey)!;
    }

    const h = Math.max(0, altitude);
    let rho = 0;

    // Enhanced atmospheric density model based on US Standard Atmosphere
    if (h >= 1000000) {
      // Beyond 1000 km — essentially no atmosphere
      rho = 0;
    } else if (h < 11000) {
      // Troposphere (0-11km)
      rho = 1.225 * Math.pow(1 - (0.0065 * h) / 288.15, 4.256);
    } else if (h < 20000) {
      // Lower stratosphere (11-20km)
      rho = 0.3639 * Math.exp(-(h - 11000) / 6341.6);
    } else if (h < 32000) {
      // Upper stratosphere (20-32km)
      rho = 0.088 * Math.exp(-(h - 20000) / 7360.0);
    } else if (h < 47000) {
      // Lower mesosphere (32-47km)
      rho = 0.0132 * Math.exp(-(h - 32000) / 8000.0);
    } else if (h < 51000) {
      // Upper mesosphere (47-51km)
      rho = 0.00143 * Math.exp(-(h - 47000) / 7500.0);
    } else if (h < 71000) {
      // Lower thermosphere (51-71km)
      rho = 0.000086 * Math.exp(-(h - 51000) / 10000.0);
    } else if (h < 100000) {
      // Upper thermosphere (71-100km)
      rho = 0.0000032 * Math.exp(-(h - 71000) / 15000.0);
    } else if (h < 200000) {
      // Low Earth Orbit (100-200km)
      // Thermosphere baseline — tuned for realistic densities (~1e-10 to 1e-11 kg/m³ around 150–200 km)
      rho = 1e-9 * Math.exp(-(h - 100000) / 25000.0);
    } else if (h < 500000) {
      // Medium Earth Orbit (200-500km)
      // 200–500 km: densities ~1e-12 to 1e-13 kg/m³
      rho = 1e-11 * Math.exp(-(h - 200000) / 100000.0);
    } else if (h < 1000000) {
      // High Earth Orbit (500-1000km)
      // Above 500 km but below 1000 km: extremely thin, ~1e-14 kg/m³
      rho = 1e-13 * Math.exp(-(h - 500000) / 500000.0);
    }

    // Cache the result
    this.atmosphericDensityCache.set(cacheKey, rho);
    return rho;
  }

  addSatelliteState(options?: {
    position?: THREE.Vector3;
    velocity?: THREE.Vector3;
    mass?: number;
    dragCoefficient?: number;
    area?: number;
    initialDensity?: number;
    densityScaleHeight?: number;
    airEnabled?: boolean;
    timeScale?: number;
  }) {
    // Default values
    const height =
      options?.position?.length() || this.simulation.EARTH_RADIUS + 400000;
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
      timeScale,
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

      // Safety check: Allow ultra-high speeds up to 10,000x
      const maxSafeTimeScale = 10000; // Ultra-high speed support up to 10,000x
      const maxSatelliteTimeScale = 1000; // Individual satellites up to 1,000x

      if (this.simulation.timeScale > maxSafeTimeScale) {
        console.warn(
          `Time scale ${this.simulation.timeScale} is too high for stable orbital mechanics. Limiting to ${maxSafeTimeScale}.`
        );
        dt = deltaTime * maxSafeTimeScale * (sat.timeScale ?? 1);
      }

      if ((sat.timeScale ?? 1) > maxSatelliteTimeScale) {
        console.warn(
          `Satellite time scale ${sat.timeScale} is too high. Limiting to ${maxSatelliteTimeScale}.`
        );
        dt = deltaTime * this.simulation.timeScale * maxSatelliteTimeScale;
      }

      // Ensure associated arrays exist to avoid runtime errors
      if (!this.simulation.sceneSetup.trails[i])
        this.simulation.sceneSetup.trails[i] = [];

      // Auto-disable air resistance for escape scenarios (very high velocities)
      const velocityMagnitude = sat.velocity.length();
      const escapeVelocity = Math.sqrt(
        (2 * this.simulation.G * this.simulation.EARTH_MASS) /
          sat.position.length()
      );
      if (velocityMagnitude > escapeVelocity * 0.95) {
        // Near escape velocity - disable air resistance to prevent unrealistic effects
        sat.airEnabled = false;
      }

      // Auto-disable air resistance for very low altitudes (crash scenarios)
      const altitude = sat.position.length() - this.simulation.EARTH_RADIUS;
      if (altitude < 100000) {
        // Below 100km
        sat.airEnabled = false;
      }

      // Adaptive integration: Scale step size and substeps based on time scale
      let maxStep, maxSubsteps;

      if (this.simulation.timeScale <= 10) {
        // Normal speed: Small steps for maximum accuracy
        maxStep = 0.1;
        maxSubsteps = Math.min(10, Math.ceil(dt / 0.1));
      } else if (this.simulation.timeScale <= 50) {
        // Medium speed: Balanced steps
        maxStep = 0.2;
        maxSubsteps = Math.min(8, Math.ceil(dt / 0.2));
      } else if (this.simulation.timeScale <= 200) {
        // High speed: Larger steps with fewer substeps
        maxStep = 0.5;
        maxSubsteps = Math.min(5, Math.ceil(dt / 0.5));
      } else {
        // Ultra high speed: Very large steps, minimal substeps
        maxStep = 1.0;
        maxSubsteps = Math.min(3, Math.ceil(dt / 1.0));
      }

      let substepCount = 0;
      let remainingDt = dt;

      while (remainingDt > 0.001 && substepCount < maxSubsteps) {
        const step = Math.min(maxStep, remainingDt);
        remainingDt -= step;
        substepCount++;

        // Calculate distance from Earth center
        const distance = sat.position.length();
        const altitude = distance - this.simulation.EARTH_RADIUS;

        // Check if satellite crashed into Earth
        const crashThreshold = 80000; // 80km above surface
        if (altitude <= crashThreshold) {
          console.log(
            `Satellite ${i + 1} altitude ${(altitude / 1000).toFixed(
              1
            )}km <= crash threshold ${(crashThreshold / 1000).toFixed(
              1
            )}km - CRASHING!`
          );
          const statusElement = document.getElementById("status");
          if (statusElement) {
            statusElement.textContent = `Satellite ${i + 1}: Crashed!`;
          }
          break; // Exit the substep loop for this satellite
        }

        // Calculate gravitational force
        const gravityMagnitude =
          (this.simulation.G * this.simulation.EARTH_MASS * sat.mass) /
          (distance * distance);
        const gravityDirection = sat.position
          .clone()
          .normalize()
          .multiplyScalar(-1);
        const gravityForce = gravityDirection.multiplyScalar(gravityMagnitude);

        // Atmospheric drag calculation
        let dragForce = new THREE.Vector3(0, 0, 0);
        if (sat.airEnabled) {
          const h = Math.max(0, distance - this.simulation.EARTH_RADIUS);
          const rho = this.calculateAtmosphericDensity(h);

          const v = sat.velocity.length();
          if (v > 1 && rho > 0) {
            // Only apply drag if velocity is significant and atmosphere exists
            const Cd = sat.dragCoefficient ?? 2.2;
            const A = sat.area ?? 4;
            const dragMagnitude = 0.5 * rho * v * v * Cd * A;

            // Remove debug logging for performance

            const vhat = sat.velocity.clone().normalize();
            dragForce = vhat.multiplyScalar(-dragMagnitude);
          }
        }

        // Semi-implicit Euler integration (Symplectic Euler)
        // This method is perfect for orbital mechanics - faster and more stable than Verlet

        // Step 1: Calculate acceleration from current position
        const totalForce = gravityForce.add(dragForce);
        const acceleration = totalForce.divideScalar(sat.mass);

        // Step 2: Update velocity first (using current acceleration)
        sat.velocity.add(acceleration.clone().multiplyScalar(step));

        // Step 3: Update position using NEW velocity (this is the "semi-implicit" part)
        sat.position.add(sat.velocity.clone().multiplyScalar(step));

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

        // Position tracking removed for performance

        // Update status (for first satellite only)
        if (i === 0) {
          const currentDistance = sat.position.length();
          const escapeVelocity = Math.sqrt(
            (2 * this.simulation.G * this.simulation.EARTH_MASS) /
              currentDistance
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
