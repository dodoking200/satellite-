import * as THREE from "three";
import SatelliteSimulation from "./simulation";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class SceneSetup {
  simulation: SatelliteSimulation;

  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  // earth: THREE.Mesh;
  // satellite: THREE.Mesh;
  // trailLine: THREE.Line;

  earth: THREE.Group;
  textureLoader: THREE.TextureLoader;

  satellites: THREE.Group[] = [];
  trails: THREE.Vector3[][] = [];
  trailLines: THREE.Line[] = [];
  maxTrailLength: number = 1000;
  sunLight!: THREE.DirectionalLight;
  nightLight!: THREE.AmbientLight;

  constructor(simulation: SatelliteSimulation) {
    this.simulation = simulation;

    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000011, 1);
    document.getElementById("container")?.appendChild(this.renderer.domElement);

    // Create Earth (always use procedural sphere)
    this.earth = this.createEarth();
    this.scene.add(this.earth);
    this.textureLoader = new THREE.TextureLoader();

    // Remove default satellites. Do not add any satellites in the constructor.
    // Satellites will be added via the UI only.

    // Add stars in the background
    this.addStars(2000);

    // Add lighting
    this.addLighting();

    // Camera position
    this.camera.position.set(0, 0, 800);
    this.camera.lookAt(0, 0, 0);
  }

  async addSatellite(options?: { position?: THREE.Vector3; velocity?: THREE.Vector3; mass?: number; dragCoefficient?: number; area?: number }) {
    // Create satellite group
    const satellite = new THREE.Group();
    try {
      const loader = new GLTFLoader();
      const satData = await loader.loadAsync(
        "../assets/models/Satellite/Satellite.gltf"
      );
      const satModel = satData.scene;
      satModel.scale.set(0.01, 0.01, 0.01);
      satellite.add(satModel);
    } catch (error) {
      // Fallback to primitive
      const fallback = this.createSatellite();
      satellite.add(fallback);
    }
    this.scene.add(satellite);
    this.satellites.push(satellite);
    // Create trail for this satellite
    const trail: THREE.Vector3[] = [];
    this.trails.push(trail);
    // Create trail line
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.8,
    });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    this.scene.add(trailLine);
    this.trailLines.push(trailLine);
    // Register initial state in physics engine
    this.simulation.physicsEngine.addSatelliteState(options);
  }

  createEarth(): THREE.Group {
    const group = new THREE.Group();
    const earthGeometry = new THREE.SphereGeometry(
      this.simulation.EARTH_RADIUS * this.simulation.SCALE_FACTOR,
      64,
      64
    );

    // Load Earth textures
    const textureLoader = new THREE.TextureLoader();

    // Use available textures
    const albedoTexture = textureLoader.load(
      "../assets/models/earth/textures/earth albedo.jpg"
    );
    const bumpTexture = textureLoader.load(
      "../assets/models/earth/textures/earth bump.jpg"
    );
    const nightLightsTexture = textureLoader.load(
      "../assets/models/earth/textures/earth night_lights_modified.png"
    );

    // Create Earth material (simplified)
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: albedoTexture, // Main color texture
      bumpMap: bumpTexture, // Elevation/bump map
      bumpScale: 0.05, // Adjust bump intensity
      shininess: 30, // Adjust shininess
      specular: 0x222222, // Specular color
      emissive: 0x000000, // Base emissive color
      emissiveMap: nightLightsTexture, // Night lights texture
    });

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    group.add(earthMesh);
    return group;
  }

  createSatellite(): THREE.Group {
    const group = new THREE.Group();
    const satGeometry = new THREE.SphereGeometry(5, 16, 16);
    const satMaterial = new THREE.MeshPhongMaterial({
      color: 0xff6b35,
      emissive: 0x222222,
      shininess: 50,
    });

    const body = new THREE.Mesh(satGeometry, satMaterial);
    group.add(body);

    // Solar panels
    const panelGeometry = new THREE.BoxGeometry(20, 5, 1);
    const panelMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      emissive: 0x111111,
    });

    const panel1 = new THREE.Mesh(panelGeometry, panelMaterial);
    panel1.position.set(15, 0, 0);
    group.add(panel1);

    const panel2 = new THREE.Mesh(panelGeometry, panelMaterial);
    panel2.position.set(-15, 0, 0);
    group.add(panel2);

    return group;
  }

  addStars(count: number) {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
    });

    const vertices = [];
    for (let i = 0; i < count; i++) {
      const x = THREE.MathUtils.randFloatSpread(2000);
      const y = THREE.MathUtils.randFloatSpread(2000);
      const z = THREE.MathUtils.randFloatSpread(2000);
      vertices.push(x, y, z);
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(starField);
  }

  addLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // Create directional light for the sun
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.position.set(100, 100, 50);
    this.scene.add(this.sunLight);

    // Add a second light for night side illumination
    this.nightLight = new THREE.AmbientLight(0x111133, 0.2);
    this.scene.add(this.nightLight);
  }

  updateTrails() {
    for (let i = 0; i < this.trails.length; i++) {
      const trail = this.trails[i];
      if (trail.length > 1) {
        const points = trail.map((pos) =>
          pos.clone().multiplyScalar(this.simulation.SCALE_FACTOR)
        );
        const trailGeometry = new THREE.BufferGeometry();
        trailGeometry.setFromPoints(points);
        this.trailLines[i].geometry = trailGeometry;
      }
    }
  }

  updateInfo() {
    // Show info for the first satellite (or extend for all)
    if (this.simulation.physicsEngine.satellites.length > 0) {
      const sat = this.simulation.physicsEngine.satellites[0];
      const distance = sat.position.length();
      const altitude = (distance - this.simulation.EARTH_RADIUS) / 1000; // km
      const speed = sat.velocity.length(); // m/s
      const distanceFromEarth = distance / 1000; // km

      const altitudeElement = document.getElementById("currentAltitude");
      if (altitudeElement) {
        altitudeElement.textContent = `${altitude.toFixed(1)} km`;
      }

      const speedElement = document.getElementById("currentSpeed");
      if (speedElement) {
        speedElement.textContent = `${speed.toFixed(0)} m/s`;
      }

      const distanceElement = document.getElementById("currentDistance");
      if (distanceElement) {
        distanceElement.textContent = `${distanceFromEarth.toFixed(1)} km`;
      }

      // Add drag force information
      const dragCoeffElement = document.getElementById("currentDragCoeff");
      if (dragCoeffElement) {
        dragCoeffElement.textContent = `${sat.dragCoefficient ?? 2.2}`;
      }

      const areaElement = document.getElementById("currentArea");
      if (areaElement) {
        areaElement.textContent = `${sat.area ?? 4} m²`;
      }

      const airEnabledElement = document.getElementById("currentAirEnabled");
      if (airEnabledElement) {
        airEnabledElement.textContent = sat.airEnabled ? "Enabled" : "Disabled";
      }

      // Calculate and display current atmospheric density
      const densityElement = document.getElementById("currentDensity");
      if (densityElement) {
        const h = Math.max(0, altitude * 1000); // Convert back to meters
        let rho = 0;
        
        // Set density to 0 for very high altitudes (>= 1000 km)
        if (h >= 1000000) {
          rho = 0;
        } else if (h < 11000) { // Troposphere (0-11km)
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
          // Thermosphere baseline — tuned for realistic densities (~1e-10 to 1e-11 kg/m³ around 150–200 km)
          rho = 1e-9 * Math.exp(-(h - 100000) / 25000.0);
        } else if (h < 500000) { // Medium Earth Orbit (200-500km)
          // 200–500 km: densities ~1e-12 to 1e-13 kg/m³
          rho = 1e-11 * Math.exp(-(h - 200000) / 100000.0);
        } else if (h < 1000000) { // High Earth Orbit (500-1000km)
          // Above 500 km but below 1000 km: extremely thin, ~1e-14 kg/m³
          rho = 1e-13 * Math.exp(-(h - 500000) / 500000.0);
        } else {
          // Beyond 1000 km — essentially no atmosphere
          rho = 0;
        }
        
        densityElement.textContent = `${rho.toExponential(3)} kg/m³`;
      }

      // Calculate and display current drag force
      const dragForceElement = document.getElementById("currentDragForce");
      if (dragForceElement && sat.airEnabled) {
        const h = Math.max(0, altitude * 1000);
        let rho = 0;
        
        // Set density to 0 for very high altitudes (>= 1000 km)
        if (h >= 1000000) {
          rho = 0;
        } else if (h < 11000) {
          rho = 1.225 * Math.pow(1 - 0.0065 * h / 288.15, 4.256);
        } else if (h < 20000) {
          rho = 0.3639 * Math.exp(-(h - 11000) / 6341.6);
        } else if (h < 32000) {
          rho = 0.0880 * Math.exp(-(h - 20000) / 7360.0);
        } else if (h < 47000) {
          rho = 0.0132 * Math.exp(-(h - 32000) / 8000.0);
        } else if (h < 51000) {
          rho = 0.00143 * Math.exp(-(h - 47000) / 7500.0);
        } else if (h < 71000) {
          rho = 0.000086 * Math.exp(-(h - 51000) / 10000.0);
        } else if (h < 100000) {
          rho = 0.0000032 * Math.exp(-(h - 71000) / 15000.0);
        } else if (h < 200000) {
          // Thermosphere baseline — tuned for realistic densities (~1e-10 to 1e-11 kg/m³ around 150–200 km)
          rho = 1e-9 * Math.exp(-(h - 100000) / 25000.0);
        } else if (h < 500000) {
          // 200–500 km: densities ~1e-12 to 1e-13 kg/m³
          rho = 1e-11 * Math.exp(-(h - 200000) / 100000.0);
        } else if (h < 1000000) {
          // Above 500 km but below 1000 km: extremely thin, ~1e-14 kg/m³
          rho = 1e-13 * Math.exp(-(h - 500000) / 500000.0);
        } else {
          // Beyond 1000 km — essentially no atmosphere
          rho = 0;
        }
        
        // Force drag force to 0 if density is 0 (very high altitudes)
        if (rho === 0) {
          dragForceElement.textContent = "0 N";
        } else {
          const Cd = sat.dragCoefficient ?? 2.2;
          const A = sat.area ?? 4;
          const dragMagnitude = 0.5 * rho * speed * speed * Cd * A;
          
          if (dragMagnitude > 0.001) { // Only show if drag is significant
            dragForceElement.textContent = `${(dragMagnitude/1000).toFixed(3)} N`;
          } else {
            dragForceElement.textContent = `${(dragMagnitude).toExponential(2)} N`;
          }
        }
      } else if (dragForceElement) {
        dragForceElement.textContent = "0 N";
      }
    }
  }
}
