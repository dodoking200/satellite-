import * as THREE from "three";
import CameraController from "./camera-controller";
import ControlsManager from "./controls-manager";
import SceneSetup from "./scene-setup";
import PhysicsEngine from "./physics-engine";

export default class SatelliteSimulation {
  // Constants
  readonly EARTH_RADIUS: number = 6371000; // meters
  readonly EARTH_MASS: number = 5.972e24; // kg
  readonly G: number = 6.6743e-11; // gravitational constant
  readonly SCALE_FACTOR: number = 1e-5; // Scale for visualization

  // Three.js components
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  // Simulation components
  sceneSetup: SceneSetup;
  physicsEngine: PhysicsEngine;
  cameraController: CameraController;
  controlsManager: ControlsManager;

  // Simulation state
  isRunning: boolean = true;
  timeScale: number = 1;

  constructor() {
    this.sceneSetup = new SceneSetup(this);
    this.scene = this.sceneSetup.scene;
    this.camera = this.sceneSetup.camera;
    this.renderer = this.sceneSetup.renderer;

    this.physicsEngine = new PhysicsEngine(this);
    this.cameraController = new CameraController(this);
    this.controlsManager = new ControlsManager(this);

    this.physicsEngine.reset();
    this.sceneSetup.updateInfo();

    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.isRunning) {
      this.physicsEngine.updatePhysics(1);
    }

    this.cameraController.updateCameraPosition();

    // Rotate Earth
    this.sceneSetup.earth.rotation.y += 0.001;

    // Update sun position for day/night cycle
    const time = Date.now() * 0.0001;
    const sunDistance = 500;
    this.sceneSetup.sunLight.position.set(
      Math.sin(time) * sunDistance,
      Math.cos(time * 0.5) * sunDistance,
      Math.cos(time) * sunDistance
    );

    this.renderer.render(this.scene, this.camera);
  }

  resetSatellite() {
    // Update the currently followed satellite's position using the UI fields
    const idx = this.cameraController.followSatelliteIndex;
    const satellites = this.sceneSetup.satellites;
    const states = this.physicsEngine.satellites;
    if (satellites[idx] && states[idx]) {
      const x = parseFloat((document.getElementById("posX") as HTMLInputElement).value);
      const y = parseFloat((document.getElementById("posY") as HTMLInputElement).value);
      const z = parseFloat((document.getElementById("posZ") as HTMLInputElement).value);
      const velocityMag = parseFloat((document.getElementById("velocity") as HTMLInputElement).value);
      const directionDeg = parseFloat((document.getElementById("direction") as HTMLInputElement).value);
      const mass = parseFloat((document.getElementById("mass") as HTMLInputElement).value);
      const directionRad = directionDeg * Math.PI / 180;
      // Update physics state
      states[idx].position.set(x, y, z);
      states[idx].velocity.set(
        velocityMag * Math.cos(directionRad),
        velocityMag * Math.sin(directionRad),
        0
      );
      states[idx].mass = mass;
      // Update mesh position
      satellites[idx].position.copy(states[idx].position.clone().multiplyScalar(this.SCALE_FACTOR));
      // Reset trail
      this.sceneSetup.trails[idx] = [];
      this.sceneSetup.updateTrails();
    }
  }

  toggleSimulation() {
    this.isRunning = !this.isRunning;
    const button = document.getElementById("playPause");
    if (button) {
      button.textContent = this.isRunning ? "Pause" : "Play";
    }
  }
}
