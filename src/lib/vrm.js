import * as THREE from 'three';

export const HUMANOID_BONES = [
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

export function normalizeBoneName(rawName) {
  return rawName
    .replace(/^mixamorig[:_\-]?/i, '')
    .replace(/^armature[:_\-]?/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

export function getVrmBoneNode(vrm, boneName) {
  const humanoid = vrm?.humanoid;
  if (!humanoid) return null;
  return humanoid.getRawBoneNode?.(boneName)
    || humanoid.getNormalizedBoneNode?.(boneName)
    || null;
}

export function prepareVrmSceneMaterials(vrm) {
  vrm.scene.traverse((obj) => {
    obj.frustumCulled = false;
    if (!obj.isMesh) return;

    obj.castShadow = true;
    obj.receiveShadow = true;

    if (obj.geometry?.attributes?.uv && !obj.geometry.attributes.uv2) {
      obj.geometry.setAttribute(
        'uv2',
        new THREE.BufferAttribute(obj.geometry.attributes.uv.array.slice(), 2)
      );
    }

    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

    materials.forEach((mat) => {
      if (!mat) return;

      if ('aoMapIntensity' in mat) {
        mat.aoMapIntensity = 0;
      }

      if ('envMapIntensity' in mat) {
        mat.envMapIntensity = 0;
      }

      if ('roughness' in mat) {
        mat.roughness = Math.min(mat.roughness ?? 0.8, 0.72);
      }

      if ('metalness' in mat) {
        mat.metalness = Math.min(mat.metalness ?? 0, 0.05);
      }

      if ('color' in mat && !mat.map) {
        mat.color.lerp(new THREE.Color(0xffffff), 0.18);
      }

      mat.needsUpdate = true;
    });
  });
}

function getObjectLabel(object) {
  if (object.name?.trim()) return object.name.trim();
  if (object.isSkinnedMesh) return 'Skinned Mesh';
  if (object.isMesh) return 'Mesh';
  return object.type || 'Node';
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildElementNode(object, springBoneNameSet) {
  if (!object || object.isBone) return null;

  const children = object.children
    .map((child) => buildElementNode(child, springBoneNameSet))
    .filter(Boolean);

  const ownMeshUuids = object.isMesh ? [object.uuid] : [];
  const ownBoneNames = object.isSkinnedMesh
    ? uniqueStrings(object.skeleton?.bones?.map((bone) => normalizeBoneName(bone.name)) || [])
    : [];

  const meshUuids = uniqueStrings([
    ...ownMeshUuids,
    ...children.flatMap((child) => child.meshUuids),
  ]);

  if (meshUuids.length === 0) return null;

  const boneNames = uniqueStrings([
    ...ownBoneNames,
    ...children.flatMap((child) => child.boneNames),
  ]);

  const springBoneNames = boneNames.filter((boneName) => springBoneNameSet.has(boneName));

  return {
    uuid: object.uuid,
    name: getObjectLabel(object),
    type: object.isSkinnedMesh ? 'SkinnedMesh' : object.isMesh ? 'Mesh' : object.type,
    children,
    meshUuids,
    boneNames,
    springBoneNames,
  };
}

export function countVisibleMeshes(nodes, hiddenMeshes) {
  return nodes.reduce((count, node) => {
    const ownVisible = node.type?.includes('Mesh')
      ? node.meshUuids.some((uuid) => !hiddenMeshes.has(uuid))
      : 0;
    const childVisible = countVisibleMeshes(node.children || [], hiddenMeshes);
    return count + (ownVisible ? 1 : 0) + childVisible;
  }, 0);
}

export function countTotalMeshes(nodes) {
  return nodes.reduce((count, node) => {
    const ownCount = node.type?.includes('Mesh') ? 1 : 0;
    return count + ownCount + countTotalMeshes(node.children || []);
  }, 0);
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

export function createRetargetedClip(sourceClip, vrm, sourceRoot) {
  if (!sourceClip || !vrm?.humanoid) return sourceClip;

  sourceRoot?.updateMatrixWorld?.(true);
  vrm.scene?.updateMatrixWorld?.(true);

  const isVrm0 = vrm.meta?.metaVersion === '0';
  const tracks = [];
  const vrmHipsHeight = vrm.humanoid.normalizedRestPose?.hips?.position?.[1] ?? 1;

  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const quatA = new THREE.Quaternion();

  for (const track of sourceClip.tracks) {
    const separatorIndex = track.name.indexOf('.');
    if (separatorIndex === -1) continue;

    const sourceBoneName = track.name.slice(0, separatorIndex);
    const propertyPath = track.name.slice(separatorIndex + 1);

    const sourceTrackBoneName = sourceBoneName.split('/').pop()?.split('|').pop()?.split(':').pop() || sourceBoneName;
    const normalizedSourceBone = normalizeBoneName(sourceTrackBoneName);
    const vrmBoneName = SOURCE_TO_VRM_BONE[normalizedSourceBone];
    if (!vrmBoneName) continue;

    const vrmNodeName = vrm.humanoid.getNormalizedBoneNode?.(vrmBoneName)?.name;
    if (!vrmNodeName) continue;

    const sourceNode = findSourceBoneNode(sourceRoot, sourceBoneName);
    if (!sourceNode) continue;

    if (propertyPath === 'quaternion') {
      sourceNode.getWorldQuaternion(restRotationInverse).invert();
      sourceNode.parent?.getWorldQuaternion(parentRestWorldRotation) ?? parentRestWorldRotation.identity();

      const values = new Float32Array(track.values.length);
      for (let i = 0; i < track.values.length; i += 4) {
        quatA.set(track.values[i], track.values[i + 1], track.values[i + 2], track.values[i + 3]);
        quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);

        if (isVrm0) {
          quatA.x *= -1;
          quatA.z *= -1;
        }

        values[i] = quatA.x;
        values[i + 1] = quatA.y;
        values[i + 2] = quatA.z;
        values[i + 3] = quatA.w;
      }

      tracks.push(new THREE.QuaternionKeyframeTrack(
        `${vrmNodeName}.quaternion`,
        track.times,
        values
      ));
      continue;
    }

    if (propertyPath === 'position' && vrmBoneName === 'hips' && track instanceof THREE.VectorKeyframeTrack) {
      const motionHipsHeight = Math.abs(sourceNode.position.y) > 1e-5 ? sourceNode.position.y : 1;
      const hipsPositionScale = vrmHipsHeight / motionHipsHeight;
      const values = track.values.map((value, index) => {
        const adjusted = isVrm0 && index % 3 !== 1 ? -value : value;
        return adjusted * hipsPositionScale;
      });

      tracks.push(new THREE.VectorKeyframeTrack(
        `${vrmNodeName}.position`,
        track.times,
        values
      ));
    }
  }

  if (tracks.length === 0) {
    console.warn('[Retarget] 0 tracks mapped.', `Source: ${sourceClip.tracks.length} tracks`, `VRM version: ${isVrm0 ? '0.x' : '1.0'}`);
    return sourceClip;
  }

  return new THREE.AnimationClip('vrmAnimation', sourceClip.duration, tracks);
}
