import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  HUMANOID_BONES,
  buildElementNode,
  createRetargetedClip,
  normalizeBoneName,
  prepareVrmSceneMaterials,
} from '../../lib/vrm.js';
import { createConfiguredGltfLoader, loadFbxLoaderDeps, loadGltfLoaderDeps, loadVrmLoaderDeps } from '../../lib/threeLoaders.js';

function resetSpringBones(vrm) {
  if (!vrm) return;

  vrm.scene?.updateMatrixWorld?.(true);
  vrm.nodeConstraintManager?.reset?.();
  vrm.springBoneManager?.reset?.();
}

function logSpringBoneDiagnostics(vrm, avatarFile) {
  if (!import.meta.env.DEV || !vrm) return;

  const joints = Array.from(vrm.springBoneManager?.joints || []);
  const jointsWithCenter = joints.filter((joint) => joint.center != null);
  const uniqueColliderGroups = new Set(
    joints.flatMap((joint) => joint.colliderGroups || [])
  );

  console.info('[VRM Diagnostics]', {
    fileName: avatarFile?.name ?? null,
    metaVersion: vrm.meta?.metaVersion ?? 'unknown',
    springJointCount: joints.length,
    jointsWithCenterCount: jointsWithCenter.length,
    colliderGroupCount: uniqueColliderGroups.size,
    sampleJoints: joints.slice(0, 8).map((joint) => ({
      boneName: joint.bone?.name ?? null,
      childName: joint.child?.name ?? null,
      centerName: joint.center?.name ?? null,
      hitRadius: joint.settings?.hitRadius ?? null,
      stiffness: joint.settings?.stiffness ?? null,
      gravityPower: joint.settings?.gravityPower ?? null,
    })),
  });
}

export function VRMAvatar({
  avatarFile,
  animationFile,
  dancePlaying,
  hiddenMeshes,
  onLoadStart,
  onLoadComplete,
  onError,
  onVrmLoaded,
}) {
  const { gl } = useThree();
  const [vrm, setVrm] = useState(null);
  const [mixer, setMixer] = useState(null);
  const mixerRef = useRef(null);
  const runtimeRef = useRef({
    meshObjects: new Map(),
  });

  useEffect(() => {
    if (!avatarFile) return;

    onLoadStart('Loading VRM...');
    const url = URL.createObjectURL(avatarFile);
    let cancelled = false;
    let ktx2Loader = null;

    const loadAvatar = async () => {
      try {
        const { GLTFLoader, DRACOLoader, KTX2Loader, MeshoptDecoder, VRMLoaderPlugin, VRMUtils } = await loadVrmLoaderDeps();
        if (cancelled) return;

        const { loader, ktx2Loader: localKtx2Loader } = createConfiguredGltfLoader({
          GLTFLoader,
          DRACOLoader,
          MeshoptDecoder,
          KTX2Loader,
          gl,
          useKtx2: true,
        });
        ktx2Loader = localKtx2Loader;
        loader.register((parser) => new VRMLoaderPlugin(parser));

        loader.load(
          url,
          (gltf) => {
            if (cancelled) return;
            const loadedVrm = gltf.userData.vrm;

            if (vrm) {
              vrm.scene.traverse((child) => {
                if (!child.isMesh) return;
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                  child.material.forEach((material) => material.dispose());
                } else {
                  child.material?.dispose();
                }
              });
            }

            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            VRMUtils.combineSkeletons(gltf.scene);
            VRMUtils.combineMorphs(loadedVrm);
            VRMUtils.rotateVRM0(loadedVrm);
            prepareVrmSceneMaterials(loadedVrm);

            const meshObjects = new Map();
            loadedVrm.scene.traverse((child) => {
              if (child.isMesh) {
                meshObjects.set(child.uuid, child);
              }
            });

            const springBoneNameSet = new Set(
              Array.from(loadedVrm.springBoneManager?.joints || [])
                .map((joint) => normalizeBoneName(joint.bone?.name || ''))
                .filter(Boolean)
            );

            const elementTree = loadedVrm.scene.children
              .map((child) => buildElementNode(child, springBoneNameSet))
              .filter(Boolean);

            runtimeRef.current = {
              meshObjects,
            };

            logSpringBoneDiagnostics(loadedVrm, avatarFile);
            resetSpringBones(loadedVrm);
            onVrmLoaded?.(elementTree);
            setVrm(loadedVrm);
            mixerRef.current?.stopAllAction();
            mixerRef.current = null;
            setMixer(null);
            onLoadComplete('Avatar loaded. Add an animation.');
          },
          undefined,
          (error) => {
            if (cancelled) return;
            console.error(error);
            onError('Failed to process the VRM file.');
          }
        );
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        onError('Failed to process the VRM file.');
      }
    };

    loadAvatar();

    return () => {
      cancelled = true;
      ktx2Loader?.dispose();
      URL.revokeObjectURL(url);
    };
  }, [avatarFile, gl, onError, onLoadComplete, onLoadStart, onVrmLoaded]);

  useEffect(() => {
    if (!vrm || !animationFile) return;

    onLoadStart('Applying animation...');
    const url = URL.createObjectURL(animationFile);
    const extension = animationFile.name.split('.').pop()?.toLowerCase();
    let cancelled = false;

    const applyClip = (clip, sourceRoot) => {
      if (!clip) {
        onError('This file has no animation clips.');
        return;
      }

      const playableClip = createRetargetedClip(clip, vrm, sourceRoot);
      if (mixerRef.current) mixerRef.current.stopAllAction();

      const newMixer = new THREE.AnimationMixer(vrm.scene);
      newMixer.clipAction(playableClip).reset().play();
      newMixer.update(0);
      mixerRef.current = newMixer;
      setMixer(newMixer);

      vrm.update(1 / 60);
      resetSpringBones(vrm);

      onLoadComplete('Animation active.');
    };

    const handleLoadError = () => onError('Could not read the animation file.');

    const loadAnimation = async () => {
      if (extension === 'fbx') {
        const { FBXLoader } = await loadFbxLoaderDeps();
        if (cancelled) return;

        const loader = new FBXLoader();
        loader.load(
          url,
          (fbx) => {
            if (cancelled) return;
            const clip = fbx.animations?.[0];
            applyClip(clip, fbx);
          },
          undefined,
          handleLoadError
        );
        return;
      }

      if (extension !== 'glb' && extension !== 'gltf') {
        onError('Unsupported format. Use .fbx, .glb, or .gltf.');
        return;
      }

      const { GLTFLoader, DRACOLoader, KTX2Loader, MeshoptDecoder } = await loadGltfLoaderDeps();
      if (cancelled) return;

      const { loader } = createConfiguredGltfLoader({
        GLTFLoader,
        DRACOLoader,
        MeshoptDecoder,
        KTX2Loader,
        useKtx2: false,
      });

      loader.load(
        url,
        (gltf) => {
          if (cancelled) return;
          const clip = gltf.animations?.[0];
          applyClip(clip, gltf.scene);
        },
        undefined,
        handleLoadError
      );
    };

    loadAnimation().catch((error) => {
      if (cancelled) return;
      console.error(error);
      onError('Could not read the animation file.');
    });

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [animationFile, onError, onLoadComplete, onLoadStart, vrm]);

  useEffect(() => {
    if (!mixer) return;

    if (dancePlaying) {
      mixer.timeScale = 1;
      return;
    }

    mixer.timeScale = 0;
    if (!vrm) return;

    vrm.humanoid?.resetNormalizedPose?.();
    vrm.update(1 / 60);
    resetSpringBones(vrm);
  }, [dancePlaying, mixer, vrm]);

  useEffect(() => {
    if (!vrm) return;

    runtimeRef.current.meshObjects.forEach((mesh, uuid) => {
      const hidden = hiddenMeshes.has(uuid);
      mesh.visible = !hidden;
      mesh.castShadow = !hidden;
      mesh.receiveShadow = !hidden;
      mesh.matrixAutoUpdate = !hidden;
      mesh.matrixWorldAutoUpdate = !hidden;
      mesh.frustumCulled = hidden;
    });
  }, [hiddenMeshes, vrm]);

  useFrame((_state, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
    if (vrm) vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}
