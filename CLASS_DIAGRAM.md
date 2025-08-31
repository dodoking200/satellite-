# Class Diagram - Satellite Orbital Mechanics Simulation

## UML Class Diagram

```mermaid
classDiagram
    class SatelliteSimulation {
        +readonly EARTH_RADIUS: number
        +readonly EARTH_MASS: number
        +readonly G: number
        +readonly SCALE_FACTOR: number
        -scene: THREE.Scene
        -camera: THREE.PerspectiveCamera
        -renderer: THREE.WebGLRenderer
        -sceneSetup: SceneSetup
        -physicsEngine: PhysicsEngine
        -cameraController: CameraController
        -controlsManager: ControlsManager
        +isRunning: boolean
        +timeScale: number
        -lastTime: number
        
        +constructor()
        +animate(): void
        -addInitialSatellite(): Promise~void~
        +resetSatellite(): void
        +toggleSimulation(): void
    }
    
    class PhysicsEngine {
        -simulation: SatelliteSimulation
        +satellites: SatelliteState[]
        -atmosphericDensityCache: Map~number, number~
        
        +constructor(simulation: SatelliteSimulation)
        +calculateAtmosphericDensity(altitude: number): number
        +addSatelliteState(options?: SatelliteOptions): void
        +reset(): void
        +updatePhysics(deltaTime: number): void
        +updateInfo(): void
    }
    
    class SceneSetup {
        -simulation: SatelliteSimulation
        +scene: THREE.Scene
        +camera: THREE.PerspectiveCamera
        +renderer: THREE.WebGLRenderer
        +earth: THREE.Group
        +textureLoader: THREE.TextureLoader
        +satellites: THREE.Group[]
        +trails: THREE.Vector3[][]
        +trailLines: THREE.Line[]
        +maxTrailLength: number
        +sunLight: THREE.DirectionalLight
        +nightLight: THREE.AmbientLight
        
        +constructor(simulation: SatelliteSimulation)
        +addSatellite(options?: SatelliteOptions): Promise~void~
        -loadEarthModel(): Promise~void~
        -loadSatelliteModel(): Promise~void~
        +createEarth(): THREE.Group
        +createSatellite(): THREE.Group
        +addStars(count: number): void
        +addLighting(): void
        +updateTrails(): void
        +updateInfo(): void
    }
    
    class CameraController {
        -simulation: SatelliteSimulation
        +mode: CameraMode
        +orbitRadius: number
        +orbitPhi: number
        +orbitTheta: number
        +followSatelliteIndex: number
        +freeCameraPosition: THREE.Vector3
        +freeCameraRotation: CameraRotation
        -keys: Record~string, boolean~
        +cameraSpeed: number
        -mouseDown: boolean
        -lastMouseX: number
        -lastMouseY: number
        
        +constructor(simulation: SatelliteSimulation)
        -setupCameraControls(): void
        -handleFreeCameraInput(): void
        +updateCameraPosition(): void
        +setMode(mode: CameraMode): void
        +reset(): void
    }
    
    class ControlsManager {
        -simulation: SatelliteSimulation
        
        +constructor(simulation: SatelliteSimulation)
        +setupControls(): void
        +setScenario(scenario: ScenarioType): void
        +updateSimulation(): void
        +updateTimeScaleDisplay(): void
    }
    
    class SatelliteState {
        <<interface>>
        +position: THREE.Vector3
        +velocity: THREE.Vector3
        +mass: number
        +dragCoefficient?: number
        +area?: number
        +initialDensity?: number
        +densityScaleHeight?: number
        +airEnabled?: boolean
        +timeScale?: number
    }
    
    class SatelliteOptions {
        <<interface>>
        +position?: THREE.Vector3
        +velocity?: THREE.Vector3
        +mass?: number
        +dragCoefficient?: number
        +area?: number
        +initialDensity?: number
        +densityScaleHeight?: number
        +airEnabled?: boolean
        +timeScale?: number
    }
    
    class CameraMode {
        <<enumeration>>
        FREE
        ORBIT
        FOLLOW
    }
    
    class CameraRotation {
        <<interface>>
        +x: number
        +y: number
    }
    
    class ScenarioType {
        <<enumeration>>
        CRASH
        ORBIT
        ESCAPE
    }
    
    class ControlConfig {
        <<interface>>
        +slider: string
        +input: string
    }

    %% Relationships
    SatelliteSimulation ||--|| PhysicsEngine : contains
    SatelliteSimulation ||--|| SceneSetup : contains
    SatelliteSimulation ||--|| CameraController : contains
    SatelliteSimulation ||--|| ControlsManager : contains
    
    PhysicsEngine ||--o{ SatelliteState : manages
    PhysicsEngine ..> SatelliteOptions : uses
    
    SceneSetup ..> SatelliteOptions : uses
    SceneSetup ||--o{ "THREE.Group" : manages satellites
    SceneSetup ||--o{ "THREE.Vector3[]" : manages trails
    SceneSetup ||--o{ "THREE.Line" : manages trail lines
    
    CameraController ..> CameraMode : uses
    CameraController ..> CameraRotation : uses
    
    ControlsManager ..> ScenarioType : uses
    ControlsManager ..> ControlConfig : uses
    
    %% Three.js Dependencies (External)
    SceneSetup ..> "THREE.Scene" : uses
    SceneSetup ..> "THREE.PerspectiveCamera" : uses
    SceneSetup ..> "THREE.WebGLRenderer" : uses
    SceneSetup ..> "THREE.Group" : uses
    SceneSetup ..> "THREE.DirectionalLight" : uses
    SceneSetup ..> "THREE.AmbientLight" : uses
    SceneSetup ..> "THREE.TextureLoader" : uses
    
    PhysicsEngine ..> "THREE.Vector3" : uses
    CameraController ..> "THREE.Vector3" : uses
    
    %% Global Window Interface
    class WindowInterface {
        <<interface>>
        +simulation: SatelliteSimulation
    }
    
    WindowInterface ..> SatelliteSimulation : exposes globally
```

## Detailed Class Descriptions

### Core Classes

#### 1. SatelliteSimulation
**Purpose**: Main orchestrator class that coordinates all subsystems
**Responsibilities**:
- Initialize and manage all subsystem instances
- Run the main animation loop
- Handle global simulation state (running/paused, time scale)
- Coordinate between physics, rendering, and user interaction

**Key Relationships**:
- Aggregates PhysicsEngine, SceneSetup, CameraController, and ControlsManager
- Exposes itself to the global window object for UI interaction

#### 2. PhysicsEngine
**Purpose**: Handles all physics calculations and satellite state management
**Responsibilities**:
- Maintain array of satellite states with position, velocity, and properties
- Calculate gravitational forces using Newton's law of universal gravitation
- Apply atmospheric drag forces using exponential atmosphere model
- Integrate motion using Euler method
- Detect collisions and update satellite status
- Cache atmospheric density calculations for performance

**Key Relationships**:
- Manages collection of SatelliteState objects
- Uses SatelliteOptions interface for satellite creation
- Closely coupled with SatelliteSimulation for constants and scale factor

#### 3. SceneSetup
**Purpose**: Manages 3D scene, rendering, and visual assets
**Responsibilities**:
- Initialize Three.js scene, camera, and renderer
- Load and manage Earth and satellite 3D models
- Handle lighting and materials for realistic rendering
- Manage orbital trail visualization
- Coordinate visual updates with physics state
- Provide fallback primitive shapes when models fail to load

**Key Relationships**:
- Heavily dependent on Three.js library
- Manages multiple Three.js objects (Groups, Lines, Lights)
- Interfaces with PhysicsEngine for position updates

#### 4. CameraController
**Purpose**: Manages camera positioning and user input for different viewing modes
**Responsibilities**:
- Implement three camera modes: Orbit, Follow, and Free
- Handle mouse and keyboard input for camera control
- Smooth camera transitions and updates
- Maintain camera state for each mode

**Key Relationships**:
- Uses CameraMode enumeration for mode switching
- Interacts with Three.js camera object
- References SatelliteSimulation for satellite positions in Follow mode

#### 5. ControlsManager
**Purpose**: Bridges UI controls with simulation logic
**Responsibilities**:
- Set up event listeners for all UI controls
- Synchronize slider and number input values
- Handle scenario preset buttons
- Update simulation parameters from UI changes
- Manage time scale display updates

**Key Relationships**:
- References SatelliteSimulation for parameter updates
- Uses ScenarioType enumeration for preset scenarios
- Interfaces with DOM elements for UI synchronization

### Interfaces and Types

#### SatelliteState Interface
Defines the complete state of a satellite in the physics simulation:
- **Physical properties**: position, velocity, mass
- **Atmospheric properties**: drag coefficient, cross-sectional area
- **Simulation properties**: time scale, air resistance enable/disable

#### SatelliteOptions Interface
Used for satellite creation, allowing optional parameter specification:
- Extends SatelliteState but makes all properties optional
- Provides sensible defaults when properties are not specified

#### CameraMode Enumeration
Defines the three camera viewing modes:
- **ORBIT**: Rotate around Earth's center
- **FOLLOW**: Track selected satellite
- **FREE**: First-person navigation

#### ScenarioType Enumeration
Defines preset orbital scenarios:
- **CRASH**: Insufficient velocity for orbit
- **ORBIT**: Stable circular orbit
- **ESCAPE**: Velocity exceeding escape threshold

## Architecture Patterns

### 1. Composition Pattern
The SatelliteSimulation class uses composition to aggregate all major subsystems:
```typescript
class SatelliteSimulation {
    private physicsEngine: PhysicsEngine;
    private sceneSetup: SceneSetup;
    private cameraController: CameraController;
    private controlsManager: ControlsManager;
}
```

### 2. Strategy Pattern
CameraController implements the strategy pattern for different camera behaviors:
```typescript
updateCameraPosition() {
    switch(this.mode) {
        case "orbit": /* orbit behavior */
        case "follow": /* follow behavior */ 
        case "free": /* free behavior */
    }
}
```

### 3. Observer Pattern
UI controls act as observers of simulation state:
- Controls update simulation parameters
- Simulation notifies UI of state changes
- Real-time synchronization between model and view

### 4. Facade Pattern
SatelliteSimulation acts as a facade, providing simple interface to complex subsystems:
```typescript
window.simulation = new SatelliteSimulation(); // Single entry point
window.simulation.timeScale = 100; // Simple parameter access
window.simulation.resetSatellite(); // High-level operations
```

## Data Flow

### 1. Initialization Flow
```
main.ts → SatelliteSimulation() → [PhysicsEngine, SceneSetup, CameraController, ControlsManager]
    → addInitialSatellite() → animate()
```

### 2. Animation Loop Flow
```
animate() → updatePhysics() → updateCameraPosition() → render()
    ↓
updateTrails() → updateInfo() → DOM updates
```

### 3. User Interaction Flow
```
UI Event → ControlsManager → SatelliteSimulation → PhysicsEngine/SceneSetup
    ↓
State Change → updateInfo() → UI Feedback
```

### 4. Satellite Addition Flow
```
Add Button Click → getSatelliteParametersFromUI() → sceneSetup.addSatellite()
    ↓
Load 3D Model → physicsEngine.addSatelliteState() → updateSatelliteUI()
```

## Dependencies

### External Dependencies
- **Three.js**: 3D graphics library for rendering
- **GLTFLoader**: 3D model loading from Three.js examples
- **Vite**: Build tool and development server
- **TypeScript**: Type-safe JavaScript compilation

### Internal Dependencies
- All classes depend on SatelliteSimulation for coordination
- PhysicsEngine and SceneSetup are tightly coupled for state synchronization
- ControlsManager bridges DOM events with simulation logic
- CameraController requires access to satellite positions for Follow mode

## Extensibility Points

### 1. Adding New Forces
Extend PhysicsEngine.updatePhysics() to include:
- Solar radiation pressure
- Gravitational perturbations from Moon/Sun
- Magnetic field interactions

### 2. Adding New Camera Modes
Extend CameraMode enumeration and CameraController.updateCameraPosition():
- Chase camera following satellite closely
- Cinematic camera with predefined paths
- Split-screen multi-satellite view

### 3. Adding New Visualization
Extend SceneSetup for additional visual elements:
- Velocity vectors
- Force vectors
- Orbital parameters display
- Ground track visualization

### 4. Adding New UI Controls
Extend ControlsManager.setupControls() for:
- Advanced satellite parameters
- Environmental settings
- Mission planning tools
- Data export capabilities

This class diagram provides a complete architectural overview of the satellite orbital mechanics simulation, showing how each component fits together to create a cohesive, extensible system.
