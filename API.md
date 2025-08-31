# API Documentation

## Core Classes and Methods

### SatelliteSimulation

The main orchestrator class that manages the entire simulation.

```typescript
class SatelliteSimulation {
  // Constants
  readonly EARTH_RADIUS: number = 6371000;
  readonly EARTH_MASS: number = 5.972e24;
  readonly G: number = 6.6743e-11;
  readonly SCALE_FACTOR: number = 1e-5;

  // State
  isRunning: boolean;
  timeScale: number;

  // Methods
  constructor()
  animate(): void
  resetSatellite(): void
  toggleSimulation(): void
}
```

#### Methods

**`constructor()`**
Initializes the simulation with all subsystems and starts the animation loop.

**`animate()`**
Main animation loop that runs at ~60 FPS and updates physics, camera, and rendering.

**`resetSatellite()`**
Resets the currently selected satellite to initial parameters from UI controls.

**`toggleSimulation()`**
Pauses or resumes the physics simulation while maintaining rendering.

---

### PhysicsEngine

Handles all physics calculations including gravity, atmospheric drag, and integration.

```typescript
interface SatelliteState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
  dragCoefficient?: number;
  area?: number;
  airEnabled?: boolean;
  timeScale?: number;
}

class PhysicsEngine {
  satellites: SatelliteState[];
  
  constructor(simulation: SatelliteSimulation)
  updatePhysics(deltaTime: number): void
  addSatelliteState(options?: SatelliteOptions): void
  reset(): void
  updateInfo(): void
}
```

#### Methods

**`updatePhysics(deltaTime: number)`**
- Calculates gravitational and drag forces
- Integrates motion using Euler method
- Updates satellite positions and velocities
- Handles collision detection and status updates

**`addSatelliteState(options)`**
Adds a new satellite with specified parameters:
```typescript
interface SatelliteOptions {
  position?: THREE.Vector3;
  velocity?: THREE.Vector3; 
  mass?: number;
  dragCoefficient?: number;
  area?: number;
}
```

**`reset()`**
Clears all satellites and resets physics state.

---

### SceneSetup

Manages the 3D scene, rendering, and visual assets.

```typescript
class SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  earth: THREE.Group;
  satellites: THREE.Group[];
  trails: THREE.Vector3[][];
  trailLines: THREE.Line[];

  constructor(simulation: SatelliteSimulation)
  addSatellite(options?: SatelliteOptions): Promise<void>
  updateTrails(): void
  updateInfo(): void
}
```

#### Methods

**`addSatellite(options)`**
- Loads 3D satellite model or creates fallback primitive
- Adds to scene with proper scaling
- Initializes trail visualization
- Calls physics engine to add satellite state

**`updateTrails()`**
Updates the visual representation of orbital trails using Three.js Line objects.

**`updateInfo()`**
Updates the information panel with current satellite data.

---

### CameraController

Manages different camera modes and user input.

```typescript
type CameraMode = "free" | "orbit" | "follow";

class CameraController {
  mode: CameraMode;
  followSatelliteIndex: number;
  
  constructor(simulation: SatelliteSimulation)
  setMode(mode: CameraMode): void
  updateCameraPosition(): void
  reset(): void
}
```

#### Camera Modes

**Orbit Mode**
- Rotates around Earth's center
- Mouse drag to orbit, scroll to zoom
- Default camera position

**Follow Mode** 
- Tracks selected satellite
- Maintains fixed offset from satellite
- Automatically follows orbital motion

**Free Mode**
- First-person camera navigation
- WASD movement, arrow key rotation
- RF for vertical movement

---

### ControlsManager

Handles UI controls and user input synchronization.

```typescript
class ControlsManager {
  constructor(simulation: SatelliteSimulation)
  setupControls(): void
  setScenario(scenario: "crash" | "orbit" | "escape"): void
  updateSimulation(): void
  updateTimeScaleDisplay(): void
}
```

#### Scenarios

**Crash Scenario**
- Height: 300 km
- Velocity: 5,000 m/s  
- Direction: 45°

**Orbit Scenario**
- Height: 400 km
- Velocity: 7,800 m/s
- Direction: 90°

**Escape Scenario**
- Height: 400 km
- Velocity: 12,000 m/s
- Direction: 90°

---

## Physics Formulas

### Gravitational Force
```
F_gravity = G * M_earth * m_satellite / r²

Where:
- G = 6.6743 × 10⁻¹¹ m³/kg·s²
- M_earth = 5.972 × 10²⁴ kg
- m_satellite = satellite mass (kg)
- r = distance from Earth center (m)
```

### Atmospheric Drag
```
F_drag = 0.5 * ρ * v² * C_d * A

Where:
- ρ = atmospheric density (kg/m³)
- v = satellite velocity (m/s)
- C_d = drag coefficient (dimensionless)
- A = cross-sectional area (m²)
```

### Atmospheric Density Model
```
ρ(h) = 1.225 * e^(-h/8500)

Where:
- h = altitude above sea level (m)
- Valid for altitudes up to ~500 km
```

### Euler Integration
```
v_new = v_old + a * dt
x_new = x_old + v_new * dt

Where:
- v = velocity vector
- x = position vector  
- a = acceleration vector
- dt = time step
```

---

## Events and Callbacks

### UI Event Handlers

**Time Scale Controls**
```javascript
// Slider input
document.getElementById('simSpeed').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  simulation.timeScale = value;
  updateTimeScaleDisplay();
});

// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const speed = parseInt(btn.getAttribute('data-speed'));
    simulation.timeScale = speed;
  });
});
```

**Satellite Controls**
```javascript
// Add satellite
document.getElementById('addSatelliteBtn').addEventListener('click', async () => {
  const options = getSatelliteParametersFromUI();
  await simulation.sceneSetup.addSatellite(options);
  updateSatelliteUI();
});

// Follow satellite
document.getElementById('followSelect').addEventListener('change', (e) => {
  const idx = parseInt(e.target.value);
  simulation.cameraController.followSatelliteIndex = idx;
});
```

### Custom Events

You can extend the system by adding custom event listeners:

```javascript
// Custom satellite crash event
class PhysicsEngine {
  updatePhysics(deltaTime) {
    // ... physics calculations
    
    if (satelliteCrashed) {
      window.dispatchEvent(new CustomEvent('satelliteCrash', {
        detail: { satelliteId: i, altitude: altitude }
      }));
    }
  }
}

// Listen for crashes
window.addEventListener('satelliteCrash', (e) => {
  console.log(`Satellite ${e.detail.satelliteId} crashed at ${e.detail.altitude}km`);
});
```

---

## Configuration Options

### Performance Settings
```javascript
// Adjust physics timestep for performance
const PHYSICS_TIMESTEP = 0.016; // 60 FPS

// Trail length limits
const MAX_TRAIL_LENGTH = 1000;

// Scale factor for visualization
const SCALE_FACTOR = 1e-5;

// Time scale limits
const MAX_TIME_SCALE = 10000;
```

### Rendering Settings
```javascript
// Renderer configuration
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

// Camera settings
const camera = new THREE.PerspectiveCamera(
  75,                           // FOV
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1,                         // Near clipping
  1000000                      // Far clipping
);
```

---

## Extension Examples

### Adding New Satellite Parameter

1. **Update interface**
```typescript
interface SatelliteState {
  // ... existing properties
  solarPanelArea?: number;
}
```

2. **Add UI control**
```html
<div class="control-group">
  <label>Solar Panel Area (m²)</label>
  <input type="range" id="solarPanelArea" min="1" max="50" value="10">
  <input type="number" id="solarPanelAreaVal" min="1" max="50" value="10">
</div>
```

3. **Add synchronization**
```javascript
document.getElementById('solarPanelArea').addEventListener('input', (e) => {
  const value = e.target.value;
  document.getElementById('solarPanelAreaVal').value = value;
  updateCurrentSatelliteProperties();
});
```

4. **Use in physics**
```typescript
updatePhysics(deltaTime: number) {
  // ... existing physics
  
  // Solar radiation pressure
  const solarPressure = calculateSolarPressure(sat.solarPanelArea);
  totalForce.add(solarPressure);
}
```

### Adding New Time Scale Preset

Simply add a button with the `preset-btn` class and `data-speed` attribute:

```html
<button class="preset-btn" data-speed="2500">2500x</button>
```

The existing event system will automatically handle it.

---

## Error Handling

### Common Error Patterns

**Asset Loading Failures**
```typescript
async loadSatelliteModel() {
  try {
    const satData = await loader.loadAsync(modelPath);
    return satData.scene;
  } catch (error) {
    console.warn('Failed to load satellite model:', error);
    return this.createFallbackSatellite(); // Use primitive shape
  }
}
```

**Physics Instabilities**
```typescript
updatePhysics(deltaTime: number) {
  // Prevent extreme time steps
  const dt = Math.min(deltaTime * this.simulation.timeScale, MAX_TIMESTEP);
  
  // Check for NaN values
  if (!isFinite(sat.position.length())) {
    console.error('Invalid satellite position detected');
    this.resetSatelliteToSafeState(sat);
  }
}
```

**UI Synchronization Issues**
```typescript
updateTimeScaleDisplay() {
  try {
    const display = document.querySelector('.time-scale-display');
    if (display) {
      display.textContent = `${this.simulation.timeScale}x`;
    }
  } catch (error) {
    console.error('Failed to update time scale display:', error);
  }
}
```

---

This API documentation provides the technical foundation for understanding and extending the satellite simulation. For usage examples, see the main README.md file.
