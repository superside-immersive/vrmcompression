# VRM Previewer

React + Vite viewer for VRM avatars with animation retargeting, mesh visibility controls, and compressed asset support.

## What already works

- Load VRM avatars from the UI
- Auto-load a default VRM avatar on startup
- Load animations from `.fbx`, `.glb`, and `.gltf`
- Play bundled preset dances
- Pause the animation and restore a saved T-pose
- Retarget humanoid animation onto VRM 0.x and VRM 1.0 avatars
- Keep spring bones active during playback
- Show a hierarchical VRM element tree
- Toggle mesh visibility from the right-side control panel
- Use SLAM-style lighting with ambient + directional light
- Build successfully with Vite
- Run with GitHub Pages-compatible asset paths

## Yes, this already works with React

Yes. This project is already a React application.

- React 18 renders the app from [src/main.jsx](src/main.jsx)
- Vite builds and serves the project
- React Three Fiber integrates Three.js into the React component tree
- Drei provides camera controls

So this is not a plain Three.js demo. It is a React-based 3D application.

## Compatibility summary

### Supported avatar format

- `.vrm`

### Supported animation formats

- `.fbx`
- `.glb`
- `.gltf`

### VRM compatibility

- VRM 0.x: supported
- VRM 1.0: supported

The retargeting logic applies quaternion animation tracks to normalized humanoid bones and includes the coordinate-system correction needed for VRM 0.x.

### Compression / decompression compatibility

The app supports compressed assets using:

- **Draco** for compressed geometry
- **Meshopt** for optimized geometry streams
- **KTX2 / Basis** for compressed textures

These are used during GLTF/VRM loading so avatars can work with more optimized exports.

## How decompression works

### VRM loading

When a VRM is loaded, the app creates a `GLTFLoader` and configures:

- `MeshoptDecoder`
- `DRACOLoader`
- `KTX2Loader`
- `VRMLoaderPlugin`

This means the viewer can load VRM avatars that depend on mesh compression or compressed textures using vendored local decoder/transcoder assets served from `public/vendor/`.

### Animation loading

- `.fbx` animations use `FBXLoader`
- `.glb` and `.gltf` animations use `GLTFLoader` with `MeshoptDecoder` and `DRACOLoader`

## Retargeting behavior

Animation retargeting is based on VRM humanoid normalized bones.

### Supported

- Humanoid bone rotation retargeting
- VRM 0.x quaternion correction
- VRM 1.0 retargeting without the old T-pose bug
- `AnimationMixer`-based playback

### Current limitation

- Position/root-motion tracks are intentionally skipped
- Rotation tracks are the main retargeted data

So compatibility is strong for humanoid dance/body animation, but not full root-motion transfer.

## Project structure

The project was reorganized into a more standard React/Vite layout:

```text
public/
  SNOO (2).vrm
  Chicken Dance.fbx
  Locking Hip Hop Dance.fbx
  Macarena Dance.fbx
  Slide Hip Hop Dance.fbx
  Step Hip Hop Dance.fbx
  Twist Dance.fbx

src/
  components/
    scene/
      SceneContent.jsx
      ShadowReceiver.jsx
      ViewerCanvas.jsx
      VRMAvatar.jsx
    ui/
      DanceToggle.jsx
      DropBox.jsx
      MeshNavigator.jsx
      PanelSection.jsx
  constants/
    assets.js
  lib/
    threeLoaders.js
    vrm.js
  App.jsx
  main.jsx
  styles.css
```

## Why `public/` is used

The default avatar and bundled dances are static files. In Vite, `public/` is the correct place for files that must be fetched directly by URL at runtime.

That gives stable URLs like:

- `/SNOO%20(2).vrm`
- `/Step%20Hip%20Hop%20Dance.fbx`

This is cleaner and more compatible than leaving those binary files at the repository root.

## Main features

### 1. VRM viewer

- Loads a VRM avatar into a React Three Fiber scene
- Applies material cleanup and shadow settings
- Rotates the avatar to match expected viewer orientation

### 2. Animation system

- Manual animation upload from the UI
- Preset dance buttons
- Play / pause toggle
- T-pose restore when paused
- Retargeting for VRM humanoid rigs

### 3. Mesh visibility browser

- Builds a tree view from the loaded VRM scene
- Shows visibility state per mesh group
- Lets the user hide or show parts of the avatar

### 4. Spring bones

- Spring bones remain active during normal playback
- The viewer avoids deleting/re-adding spring joints dynamically because that was breaking runtime behavior

## Tech stack

- React 18
- Vite 5
- Three.js
- @react-three/fiber
- @react-three/drei
- @pixiv/three-vrm
- Tailwind CSS
- lucide-react
- r3f-perf

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## GitHub Pages

Yes, this project can run on GitHub Pages after the current changes.

### Why it works now

- Vite is configured with a relative base in [vite.config.js](vite.config.js)
- Public asset URLs are built from `import.meta.env.BASE_URL`
- Draco and KTX2/Basis decoder paths also use the Vite base URL
- The app does not depend on server-side rendering or custom backend routes

That means it can work both as:

- a repository GitHub Pages site
- a static deploy from the generated [dist](dist) output

### Important note

This project is a **static React + Vite app**, not a Next.js app.

So GitHub Pages is a good fit here because GitHub Pages serves static files.

### Typical deploy flow

1. Run `npm run build`
2. Publish the generated [dist](dist) folder to GitHub Pages

If you deploy with a GitHub Actions workflow, publish the build output from `dist/`.

## Notes about compatibility

### Compatible with React?

Yes.

### Compatible with Vite?

Yes.

### Compatible with GitHub Pages?

Yes.

The project now uses base-aware public asset paths and local decoder assets, which makes static hosting on GitHub Pages viable.

### Compatible with VRM 0.x and 1.0?

Yes, based on the current retargeting implementation.

### Compatible with compressed exports?

Yes. The project supports Draco, Meshopt, and KTX2/Basis. Draco and KTX2/Basis decoder assets are now vendored locally in `public/vendor/`.

### Compatible offline?

Yes, substantially more than before.

The app now serves Draco and KTX2/Basis decoder assets locally from `public/vendor/`, so it no longer depends on external CDN paths for those decoders.

## Known limitations

- Root motion is not transferred from source clips
- Full offline decoder support now uses local `public/vendor/` assets for Draco and KTX2/Basis
- The project still has room for further component splitting and cleanup, but it is now much better organized than the original single-file layout

## Performance improvements already applied

The project was also optimized to reduce startup cost and runtime overhead:

- heavy Three.js loaders are imported dynamically
- the 3D viewer canvas is lazy-loaded
- default assets are loaded in stages instead of all at once
- repeated animation retarget loops were fixed
- KTX2 loaders are disposed correctly
- React StrictMode double-mount overhead in development was removed
- runtime rendering cost was reduced with lower DPR and cheaper shadows

## Build status

The project builds successfully with Vite after this refactor.
