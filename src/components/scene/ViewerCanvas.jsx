import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Perf } from 'r3f-perf';
import * as THREE from 'three';
import { SceneContent } from './SceneContent.jsx';
import { ShadowReceiver } from './ShadowReceiver.jsx';

export default function ViewerCanvas({
  avatar,
  anim,
  dancePlaying,
  hiddenMeshes,
  onStatus,
  onError,
  onVrmLoaded,
  showPerf,
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.2, 2.5], fov: 40 }}
      performance={{ min: 0.75 }}
      shadows
      gl={{
        antialias: true,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      }}
    >
      <color attach="background" args={['#ffffff']} />

      <ambientLight intensity={0.95} color="#ffffff" />
      <directionalLight
        position={[-1, 2, 1]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-far={10}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.00035}
        color="#ffffff"
      />

      <SceneContent
        avatar={avatar}
        anim={anim}
        dancePlaying={dancePlaying}
        hiddenMeshes={hiddenMeshes}
        onStatus={onStatus}
        onError={onError}
        onVrmLoaded={onVrmLoaded}
      />

      <ShadowReceiver />
      <OrbitControls target={[0, 1, 0]} makeDefault />
      {showPerf ? <Perf position="top-left" /> : null}
    </Canvas>
  );
}
