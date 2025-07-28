import SatelliteSimulation from "./simulation";
import * as THREE from "three";
// main.ts
window.addEventListener("DOMContentLoaded", () => {
  // Handle window resize
  window.addEventListener("resize", () => {
    if (window.simulation) {
      window.simulation.camera.aspect = window.innerWidth / window.innerHeight;
      window.simulation.camera.updateProjectionMatrix();
      window.simulation.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  });

  // Start simulation
  window.simulation = new SatelliteSimulation();

  // --- Satellite UI logic ---
  function updateSatelliteUI() {
    const sim = window.simulation;
    const list = document.getElementById("satellite-list");
    const followSelect = document.getElementById("followSelect") as HTMLSelectElement;
    if (!list || !followSelect) return;
    // Clear
    list.innerHTML = "";
    followSelect.innerHTML = "";
    // List satellites
    sim.sceneSetup.satellites.forEach((sat, i) => {
      const div = document.createElement("div");
      div.textContent = `Satellite ${i + 1}`;
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.onclick = () => {
        // Remove satellite and its state
        sim.scene.remove(sat);
        sim.sceneSetup.satellites.splice(i, 1);
        sim.sceneSetup.trails.splice(i, 1);
        sim.sceneSetup.trailLines[i].geometry.dispose();
        sim.scene.remove(sim.sceneSetup.trailLines[i]);
        sim.sceneSetup.trailLines.splice(i, 1);
        sim.physicsEngine.satellites.splice(i, 1);
        updateSatelliteUI();
      };
      div.appendChild(delBtn);
      list.appendChild(div);
      // Add to follow dropdown
      const opt = document.createElement("option");
      opt.value = i.toString();
      opt.textContent = `Satellite ${i + 1}`;
      followSelect.appendChild(opt);
    });
    // Set dropdown to current follow index
    followSelect.value = sim.cameraController.followSatelliteIndex.toString();
  }

  document.getElementById("addSatelliteBtn")?.addEventListener("click", async () => {
    const heightInput = document.getElementById("height") as HTMLInputElement;
    const earthRadius = window.simulation.EARTH_RADIUS;
    const height = parseFloat(heightInput.value) * 1000; // km to m
    const x = earthRadius + height;
    const y = 0;
    const z = 0;
    const velocityMag = parseFloat((document.getElementById("velocity") as HTMLInputElement).value);
    const directionDeg = parseFloat((document.getElementById("direction") as HTMLInputElement).value);
    const mass = parseFloat((document.getElementById("mass") as HTMLInputElement).value);
    const directionRad = directionDeg * Math.PI / 180;
    const velocity = new THREE.Vector3(
      velocityMag * Math.cos(directionRad),
      velocityMag * Math.sin(directionRad),
      0
    );
    await window.simulation.sceneSetup.addSatellite({
      position: new THREE.Vector3(x, y, z),
      velocity,
      mass
    });
    updateSatelliteUI();
  });

  document.getElementById("followSelect")?.addEventListener("change", (e) => {
    const idx = parseInt((e.target as HTMLSelectElement).value, 10);
    window.simulation.cameraController.followSatelliteIndex = idx;
  });

  // Initial UI update after satellites are created
  setTimeout(updateSatelliteUI, 500);
});
