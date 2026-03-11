import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AlertCircle, FileVideo, Layers, Loader2, User } from 'lucide-react';
import {
  AVAILABLE_ANIMATIONS,
  COMPATIBLE_ANIMATION_EXTENSIONS,
  DEFAULT_ANIMATION_FILE_NAME,
  DEFAULT_ANIMATION_URLS,
  DEFAULT_AVATAR_FILE_NAME,
  DEFAULT_AVATAR_URLS,
  withBasePath,
} from './constants/assets.js';
import { PanelSection } from './components/ui/PanelSection.jsx';
import { DropBox } from './components/ui/DropBox.jsx';
import { DanceToggle } from './components/ui/DanceToggle.jsx';
import { MeshNavigator } from './components/ui/MeshNavigator.jsx';

const ViewerCanvas = lazy(() => import('./components/scene/ViewerCanvas.jsx'));

export default function App() {
  const showPerf = import.meta.env.DEV;
  const [avatar, setAvatar] = useState(null);
  const [anim, setAnim] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dancePlaying, setDancePlaying] = useState(true);
  const [vrmElements, setVrmElements] = useState([]);
  const [hiddenMeshes, setHiddenMeshes] = useState(new Set());
  const [defaultAvatarAttempted, setDefaultAvatarAttempted] = useState(false);
  const [defaultAnimationAttempted, setDefaultAnimationAttempted] = useState(false);

  const handleToggleMesh = useCallback((uuids) => {
    setHiddenMeshes((prev) => {
      const next = new Set(prev);
      const targetUuids = Array.isArray(uuids) ? uuids : [uuids];
      const shouldReveal = targetUuids.every((uuid) => next.has(uuid));

      targetUuids.forEach((uuid) => {
        if (shouldReveal) {
          next.delete(uuid);
        } else {
          next.add(uuid);
        }
      });

      return next;
    });
  }, []);

  const handleVrmLoaded = useCallback((elements) => {
    setVrmElements(elements);
    setHiddenMeshes(new Set());
  }, []);

  const handleSetAvatar = useCallback((file) => {
    if (!file) return;
    setAvatar(file);
    setVrmElements([]);
    setHiddenMeshes(new Set());
  }, []);

  const handleSetAnimation = useCallback((file) => {
    if (!file) return;
    setAnim(file);
  }, []);

  const handleSelectAnimation = useCallback(async (animDef) => {
    const encodedName = encodeURIComponent(animDef.file);
    const url = withBasePath(encodedName);

    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const blob = await response.blob();
      const file = new File([blob], animDef.file, { type: 'application/octet-stream' });
      setAnim(file);
    } catch {
      // noop
    }
  }, []);

  const handleStatus = useCallback((message, isErr = false) => {
    setStatus(message);
    setError(isErr);
    setLoading(message.includes('...') && !isErr);
  }, []);

  const handleError = useCallback((message) => {
    handleStatus(message, true);
  }, [handleStatus]);

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
          // try next
        }
      }
      return null;
    };

    const loadDefaultAvatar = async () => {
      handleStatus('Loading default avatar...');
      const defaultAvatar = await loadDefaultFile(DEFAULT_AVATAR_URLS, DEFAULT_AVATAR_FILE_NAME);

      if (cancelled) return;

      if (defaultAvatar) {
        setAvatar((prev) => prev ?? defaultAvatar);
        handleStatus('Default avatar loaded.');
      } else {
        handleStatus('Ready');
      }

      setDefaultAvatarAttempted(true);
    };

    loadDefaultAvatar();

    return () => {
      cancelled = true;
    };
  }, [handleStatus]);

  useEffect(() => {
    if (!defaultAvatarAttempted || defaultAnimationAttempted || anim) return;

    let cancelled = false;

    const loadDefaultFile = async (urls, fileName) => {
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const blob = await response.blob();
          return new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
        } catch {
          // try next
        }
      }
      return null;
    };

    const schedule = globalThis.requestIdleCallback
      ? globalThis.requestIdleCallback(async () => {
          const defaultAnimation = await loadDefaultFile(DEFAULT_ANIMATION_URLS, DEFAULT_ANIMATION_FILE_NAME);
          if (cancelled) return;
          if (defaultAnimation) {
            setAnim((prev) => prev ?? defaultAnimation);
          }
          setDefaultAnimationAttempted(true);
        }, { timeout: 1200 })
      : globalThis.setTimeout(async () => {
          const defaultAnimation = await loadDefaultFile(DEFAULT_ANIMATION_URLS, DEFAULT_ANIMATION_FILE_NAME);
          if (cancelled) return;
          if (defaultAnimation) {
            setAnim((prev) => prev ?? defaultAnimation);
          }
          setDefaultAnimationAttempted(true);
        }, 600);

    return () => {
      cancelled = true;
      if (globalThis.cancelIdleCallback && typeof schedule === 'number') {
        globalThis.cancelIdleCallback(schedule);
      } else {
        globalThis.clearTimeout(schedule);
      }
    };
  }, [anim, defaultAnimationAttempted, defaultAvatarAttempted]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-black text-white selection:bg-cyan-500/30">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-[312px] p-3">
        <div className="pointer-events-auto flex h-full w-full flex-col rounded-[24px] border border-black bg-black p-3 shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          <div className="mb-2 border-b border-white/8 pb-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-7 w-1.5 rounded-full bg-cyan-400"></span>
              <div>
                <h1 className="text-[15px] font-black italic tracking-tight text-white">VRM Previewer</h1>
                <p className="text-[9px] uppercase tracking-[0.22em] text-cyan-300/60">Controls</p>
              </div>
            </div>
          </div>

          <div className="panel-scroll flex-1 space-y-2 overflow-y-auto">
            <PanelSection icon={User} title="VRM Model">
              <DropBox
                label={avatar ? avatar.name : 'Drop or select .vrm'}
                icon={User}
                onFileDrop={handleSetAvatar}
                active={!!avatar}
                accept=".vrm"
              />
            </PanelSection>

            <PanelSection icon={FileVideo} title="Animation">
              <DropBox
                label={anim ? anim.name : 'Drop or select .fbx, .glb or .gltf'}
                icon={FileVideo}
                onFileDrop={handleSetAnimation}
                active={!!anim}
                accept={COMPATIBLE_ANIMATION_EXTENSIONS}
              />
              <div className="mb-2 mt-2 grid grid-cols-3 gap-1.5">
                {AVAILABLE_ANIMATIONS.map((animation) => {
                  const isActive = anim?.name === animation.file;
                  return (
                    <button
                      key={animation.file}
                      onClick={() => handleSelectAnimation(animation)}
                      className={`relative rounded-xl px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide leading-tight transition-all
                        ${isActive
                          ? 'border border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.15)]'
                          : 'border border-white/8 bg-white/5 text-slate-300 hover:border-white/16 hover:bg-white/10'}`}
                    >
                      {animation.name}
                      {isActive && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-cyan-400"></span>}
                    </button>
                  );
                })}
              </div>
              <DanceToggle dancePlaying={dancePlaying} onToggle={() => setDancePlaying((prev) => !prev)} />
            </PanelSection>

            <PanelSection icon={Layers} title="VRM Elements">
              <MeshNavigator
                meshes={vrmElements}
                hiddenMeshes={hiddenMeshes}
                onToggleMesh={handleToggleMesh}
              />
            </PanelSection>

            <PanelSection icon={AlertCircle} title="Status">
              <div
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition-all ${error
                  ? 'border border-red-500/20 bg-red-500/15 text-red-200'
                  : 'border border-white/10 bg-black/80 text-slate-100'}`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                ) : error ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-300"></div>
                )}
                <span className="leading-relaxed">{status}</span>
              </div>
            </PanelSection>
          </div>
        </div>
      </div>

      <div className="relative w-full flex-1">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-white">
              <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                Initializing 3D viewer...
              </div>
            </div>
          }
        >
          <ViewerCanvas
            avatar={avatar}
            anim={anim}
            dancePlaying={dancePlaying}
            hiddenMeshes={hiddenMeshes}
            onStatus={handleStatus}
            onError={handleError}
            onVrmLoaded={handleVrmLoaded}
            showPerf={showPerf}
          />
        </Suspense>
      </div>

      <div className="border-t border-white/5 bg-slate-900/50 p-4 text-center text-[10px] uppercase tracking-[0.2em] text-slate-500">
        Optimized for compressed VRM (Draco/KTX2) • Powered by React + Three.js
      </div>
    </div>
  );
}
