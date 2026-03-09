import React, { useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { FileVideo, User, AlertCircle, Loader2 } from 'lucide-react';

const DEFAULT_AVATAR_URLS = ['/SNOO%20(2).vrm', '/public/SNOO%20(2).vrm'];
const DEFAULT_ANIMATION_URLS = ['/Step%20Hip%20Hop%20Dance.fbx', '/public/Step%20Hip%20Hop%20Dance.fbx'];

const HUMANOID_BONES = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'leftToes',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
  'rightToes',
];

const SOURCE_TO_VRM_BONE = {
  hips: 'hips',
  pelvis: 'hips',
  spine: 'spine',
  spine1: 'chest',
  spine2: 'upperChest',
  chest: 'chest',
  upperchest: 'upperChest',
  neck: 'neck',
  head: 'head',
  leftshoulder: 'leftShoulder',
  leftarm: 'leftUpperArm',
  leftupperarm: 'leftUpperArm',
  leftforearm: 'leftLowerArm',
  leftlowerarm: 'leftLowerArm',
  lefthand: 'leftHand',
  rightshoulder: 'rightShoulder',
  rightarm: 'rightUpperArm',
  rightupperarm: 'rightUpperArm',
  rightforearm: 'rightLowerArm',
  rightlowerarm: 'rightLowerArm',
  righthand: 'rightHand',
  leftupleg: 'leftUpperLeg',
  leftupperleg: 'leftUpperLeg',
  leftleg: 'leftLowerLeg',
  leftlowerleg: 'leftLowerLeg',
  leftfoot: 'leftFoot',
  lefttoe: 'leftToes',
  lefttoebase: 'leftToes',
  lefttoes: 'leftToes',
  rightupleg: 'rightUpperLeg',
  rightupperleg: 'rightUpperLeg',
  rightleg: 'rightLowerLeg',
  rightlowerleg: 'rightLowerLeg',
  rightfoot: 'rightFoot',
  righttoe: 'rightToes',
  righttoebase: 'rightToes',
  righttoes: 'rightToes',
};

function normalizeBoneName(rawName) {
  return rawName
    .replace(/^mixamorig[:_\-]?/i, '')
    .replace(/^armature[:_\-]?/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function getVrmBoneNode(vrm, boneName) {
  const humanoid = vrm?.humanoid;
  if (!humanoid) return null;

  const normalizedNode = humanoid.getNormalizedBoneNode?.(boneName);
  if (normalizedNode) return normalizedNode;

  const rawNode = humanoid.getRawBoneNode?.(boneName);
  if (rawNode) return rawNode;

  return null;
}

function findSourceBoneNode(sourceRoot, sourceTrackBoneName) {
  if (!sourceRoot) return null;

  const candidates = [
    sourceTrackBoneName,
    sourceTrackBoneName.split('/').pop(),
    sourceTrackBoneName.split('|').pop(),
    sourceTrackBoneName.split(':').pop(),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const node = sourceRoot.getObjectByName(candidate);
    if (node) return node;
  }

  const normalizedTarget = normalizeBoneName(sourceTrackBoneName);
  let found = null;
  sourceRoot.traverse((node) => {
    if (found || !node?.name) return;
    if (normalizeBoneName(node.name) === normalizedTarget) {
      found = node;
    }
  });

  return found;
}

function createRetargetedClip(sourceClip, vrm, sourceRoot) {
  if (!sourceClip || !vrm?.humanoid) return sourceClip;

  sourceRoot?.updateMatrixWorld?.(true);
  vrm.scene?.updateMatrixWorld?.(true);

  const vrmNodeByBone = {};
  HUMANOID_BONES.forEach((boneName) => {
    const node = getVrmBoneNode(vrm, boneName);
    if (node) {
      vrmNodeByBone[boneName] = node;
    }
  });

  const restWorldRotation = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const restRotationInverse = new THREE.Quaternion();
  const sourceQuat = new THREE.Quaternion();
  const convertedQuat = new THREE.Quaternion();

  const retargetedTracks = sourceClip.tracks
    .map((track) => {
      const separatorIndex = track.name.indexOf('.');
      if (separatorIndex === -1) return null;

      const sourceBoneName = track.name.slice(0, separatorIndex);
      const propertyPath = track.name.slice(separatorIndex + 1);
      const sourceTrackBoneName = sourceBoneName.split('/').pop()?.split('|').pop()?.split(':').pop() || sourceBoneName;
      const normalizedSourceBone = normalizeBoneName(sourceTrackBoneName);
      const vrmBoneName = SOURCE_TO_VRM_BONE[normalizedSourceBone];
      const targetNode = vrmBoneName ? vrmNodeByBone[vrmBoneName] : null;
      if (!targetNode) return null;

      const sourceNode = findSourceBoneNode(sourceRoot, sourceBoneName);
      if (!sourceNode) return null;

      if (propertyPath === 'quaternion') {
        sourceNode.getWorldQuaternion(restWorldRotation);
        sourceNode.parent?.getWorldQuaternion(parentRestWorldRotation) || parentRestWorldRotation.identity();
        restRotationInverse.copy(restWorldRotation).invert();

        const sourceValues = track.values;
        const remappedValues = new Float32Array(sourceValues.length);

        for (let i = 0; i < sourceValues.length; i += 4) {
          sourceQuat.set(sourceValues[i], sourceValues[i + 1], sourceValues[i + 2], sourceValues[i + 3]).normalize();
          convertedQuat
            .copy(sourceQuat)
            .premultiply(parentRestWorldRotation)
            .multiply(restRotationInverse)
            .normalize();

          if (vrm.meta?.metaVersion === '0') {
            convertedQuat.x *= -1;
            convertedQuat.z *= -1;
          }

          remappedValues[i] = convertedQuat.x;
          remappedValues[i + 1] = convertedQuat.y;
          remappedValues[i + 2] = convertedQuat.z;
          remappedValues[i + 3] = convertedQuat.w;
        }

        const retargetedTrack = new THREE.QuaternionKeyframeTrack(
          `${targetNode.name}.quaternion`,
          track.times,
          remappedValues
        );
        retargetedTrack.setInterpolation(track.getInterpolation());
        return retargetedTrack;
      }

      if (propertyPath === 'position') {
        return null;
      }

      return null;
    })
    .filter(Boolean);

  if (retargetedTracks.length === 0) {
    return sourceClip;
  }

  return new THREE.AnimationClip(`${sourceClip.name || 'retargeted'}_vrm`, sourceClip.duration, retargetedTracks);
}

// --- COMPONENTE DEL MODELO VRM ---
function VRMAvatar({ avatarFile, animationFile, onLoadStart, onLoadComplete, onError }) {
  const { gl } = useThree();
  const [vrm, setVrm] = useState(null);
  const [mixer, setMixer] = useState(null);

  // Cargar el Avatar Principal
  useEffect(() => {
    if (!avatarFile) return;

    onLoadStart('Descomprimiendo modelo VRM...');
    const url = URL.createObjectURL(avatarFile);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    // Decodificador Draco para geometría comprimida (Needle/8thWall)
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    // Decodificador KTX2 para texturas optimizadas
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/');
    ktx2Loader.detectSupport(gl);
    loader.setKTX2Loader(ktx2Loader);

    // Plugin específico de VRM
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      url,
      (gltf) => {
        const loadedVrm = gltf.userData.vrm;

        if (vrm) {
          vrm.scene.traverse((child) => {
            if (child.isMesh) {
              child.geometry?.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((m) => m.dispose());
              } else {
                child.material?.dispose();
              }
            }
          });
        }

        // Corrección de rotación típica de VRM en Three.js
        loadedVrm.scene.rotation.y = Math.PI;
        setVrm(loadedVrm);
        onLoadComplete('Avatar cargado. ¡Ahora arrastra una animación!');
      },
      undefined,
      (error) => {
        console.error(error);
        onError('Error al procesar el VRM. Revisa el archivo.');
      }
    );

    return () => URL.revokeObjectURL(url);
  }, [avatarFile, gl]);

  // Aplicar Animación desde otro archivo
  useEffect(() => {
    if (!vrm || !animationFile) return;

    onLoadStart('Transfiriendo animación...');
    const url = URL.createObjectURL(animationFile);
    const extension = animationFile.name.split('.').pop()?.toLowerCase();

    const applyClip = (clip, sourceRoot) => {
      if (!clip) {
        onError('Este archivo no tiene clips de animación.');
        return;
      }

      const playableClip = createRetargetedClip(clip, vrm, sourceRoot);

      if (mixer) {
        mixer.stopAllAction();
      }

      const newMixer = new THREE.AnimationMixer(vrm.scene);
      newMixer.clipAction(playableClip).reset().play();
      setMixer(newMixer);
      onLoadComplete('Animación activa.');
    };

    const handleLoadError = () => onError('No se pudo leer el archivo de animación.');

    if (extension === 'fbx') {
      const loader = new FBXLoader();
      loader.load(
        url,
        (fbx) => {
          const clip = fbx.animations?.[0];
          applyClip(clip, fbx);
        },
        undefined,
        handleLoadError
      );

      return () => URL.revokeObjectURL(url);
    }

    if (extension !== 'glb' && extension !== 'gltf') {
      onError('Formato no compatible. Usa .fbx, .glb o .gltf');
      URL.revokeObjectURL(url);
      return;
    }

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (gltf) => {
        const clip = gltf.animations?.[0];
        applyClip(clip, gltf.scene);
      },
      undefined,
      handleLoadError
    );

    return () => URL.revokeObjectURL(url);
  }, [vrm, animationFile]);

  useFrame((_state, delta) => {
    if (vrm) vrm.update(delta);
    if (mixer) mixer.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

// --- UI DE CARGA (DRAG & DROP) ---
function DropBox({ label, icon: Icon, onFileDrop, active, accept }) {
  const [drag, setDrag] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFileDrop(e.dataTransfer.files[0]);
      }}
      className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl transition-all h-32
        ${drag ? 'border-cyan-400 bg-cyan-500/10 scale-105' : 'border-slate-700 bg-slate-900/50'}
        ${active ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
    >
      <input
        type="file"
        className="absolute inset-0 opacity-0 cursor-pointer"
        accept={accept}
        onChange={(e) => onFileDrop(e.target.files[0])}
      />
      <Icon className={`w-6 h-6 mb-2 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
      <p className="text-xs font-semibold text-slate-300 text-center uppercase tracking-wider">{label}</p>
    </div>
  );
}

// --- APLICACIÓN ---
export default function App() {
  const [avatar, setAvatar] = useState(null);
  const [anim, setAnim] = useState(null);
  const [status, setStatus] = useState('Listo para recibir archivos');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStatus = (msg, isErr = false) => {
    setStatus(msg);
    setError(isErr);
    setLoading(msg.includes('...') && !isErr);
  };

  useEffect(() => {
    let cancelled = false;

    const loadDefaultFile = async (urls, fileName) => {
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const blob = await response.blob();
          return new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
        } catch {
          continue;
        }
      }
      return null;
    };

    const loadDefaults = async () => {
      handleStatus('Cargando archivos por defecto...');

      const [defaultAvatar, defaultAnimation] = await Promise.all([
        loadDefaultFile(DEFAULT_AVATAR_URLS, 'SNOO (2).vrm'),
        loadDefaultFile(DEFAULT_ANIMATION_URLS, 'Step Hip Hop Dance.fbx'),
      ]);

      if (cancelled) return;

      if (defaultAvatar) {
        setAvatar((prev) => prev ?? defaultAvatar);
      }

      if (defaultAnimation) {
        setAnim((prev) => prev ?? defaultAnimation);
      }

      if (defaultAvatar || defaultAnimation) {
        handleStatus('Archivos por defecto cargados.');
      } else {
        handleStatus('Listo para recibir archivos');
      }
    };

    loadDefaults();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black flex flex-col overflow-hidden text-white selection:bg-cyan-500/30">
      {/* UI FLOTANTE */}
      <div className="absolute top-0 left-0 w-full p-8 z-20 pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
            <h1 className="text-xl font-black italic tracking-tighter mb-4 flex items-center gap-2">
              <span className="bg-cyan-500 w-2 h-6 rounded-full inline-block"></span>
              VRM PREVIEWER <span className="text-[10px] text-cyan-400 font-mono opacity-60">PRO</span>
            </h1>

            <div className="grid grid-cols-2 gap-4">
              <DropBox
                label={avatar ? avatar.name : 'Soltar VRM'}
                icon={User}
                onFileDrop={setAvatar}
                active={!!avatar}
                accept=".vrm"
              />
              <DropBox
                label={anim ? anim.name : 'Soltar Animación'}
                icon={FileVideo}
                onFileDrop={setAnim}
                active={!!anim}
                accept=".fbx,.glb,.gltf"
              />
            </div>

            <div
              className={`mt-4 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all
              ${error ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-white/5 text-slate-400 border border-white/5'}`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : error ? (
                <AlertCircle className="w-4 h-4" />
              ) : null}
              {status}
            </div>
          </div>
        </div>
      </div>

      {/* ESCENA 3D */}
      <div className="flex-1 w-full relative">
        <Canvas camera={{ position: [0, 1.2, 2.5], fov: 40 }} shadows>
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#050505', 5, 15]} />

          <ambientLight intensity={0.4} />
          <spotLight position={[5, 10, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={1} color="#3b82f6" />

          <Environment preset="night" />

          <Suspense fallback={null}>
            <VRMAvatar
              avatarFile={avatar}
              animationFile={anim}
              onLoadStart={(m) => handleStatus(m)}
              onLoadComplete={(m) => handleStatus(m)}
              onError={(m) => handleStatus(m, true)}
            />
          </Suspense>

          <Grid
            infiniteGrid
            fadeDistance={12}
            sectionColor="#1e293b"
            cellColor="#0f172a"
            position={[0, -0.01, 0]}
          />
          <ContactShadows position={[0, 0, 0]} opacity={0.7} scale={10} blur={3} far={2} color="#000000" />
          <OrbitControls target={[0, 1, 0]} makeDefault />
        </Canvas>
      </div>

      {/* INSTRUCCIONES PIE DE PÁGINA */}
      <div className="p-4 bg-slate-900/50 text-[10px] text-slate-500 uppercase tracking-[0.2em] text-center border-t border-white/5">
        Optimized for Compressed VRM (Draco/KTX2) • Powered by Three.js
      </div>
    </div>
  );
}
