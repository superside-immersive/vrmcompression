import { Suspense } from 'react';
import { VRMAvatar } from './VRMAvatar.jsx';

export function SceneContent({
  avatar,
  anim,
  dancePlaying,
  hiddenMeshes,
  onStatus,
  onError,
  onVrmLoaded,
}) {
  return (
    <Suspense fallback={null}>
      <VRMAvatar
        avatarFile={avatar}
        animationFile={anim}
        dancePlaying={dancePlaying}
        hiddenMeshes={hiddenMeshes}
        onLoadStart={onStatus}
        onLoadComplete={onStatus}
        onError={onError}
        onVrmLoaded={onVrmLoaded}
      />
    </Suspense>
  );
}
