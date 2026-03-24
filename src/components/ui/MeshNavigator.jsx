import { Eye, EyeOff } from 'lucide-react';
import { countTotalMeshes, countVisibleMeshes } from '../../lib/vrm.js';

function countTotalGroups(nodes) {
  return nodes.reduce((count, node) => count + 1 + countTotalGroups(node.children || []), 0);
}

function MeshTreeNode({ node, hiddenMeshes, onToggleMesh, depth = 0 }) {
  const hiddenCount = node.meshUuids.filter((uuid) => hiddenMeshes.has(uuid)).length;
  const visibleCount = node.meshUuids.length - hiddenCount;
  const isVisible = visibleCount > 0;
  const isPartial = visibleCount > 0 && visibleCount < node.meshUuids.length;

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onToggleMesh(node.meshUuids)}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-all ${isVisible
          ? 'border-emerald-400/25 bg-emerald-500/10 hover:bg-emerald-500/18'
          : 'border-red-400/25 bg-red-500/10 hover:bg-red-500/18'}`}
        style={{ marginLeft: depth * 10 }}
      >
        <div className="flex items-center gap-2">
          <div className={`shrink-0 rounded-md p-1 ${isVisible ? 'bg-emerald-400/20 text-emerald-300' : 'bg-red-400/20 text-red-300'}`}>
            {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-[11px] font-semibold leading-tight ${isVisible ? 'text-emerald-100' : 'text-red-200/70 line-through'}`}>{node.name}</p>
            <p className={`text-[9px] ${isVisible ? 'text-emerald-300/50' : 'text-red-300/40'}`}>
              {node.type}{node.springBoneNames?.length ? ' · Spring' : ''}
            </p>
          </div>
          {isPartial && <span className="shrink-0 rounded bg-amber-400/15 px-1 py-0.5 text-[8px] font-bold text-amber-200">MIX</span>}
        </div>
      </button>
      {node.children?.length ? (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <MeshTreeNode
              key={child.uuid}
              node={child}
              hiddenMeshes={hiddenMeshes}
              onToggleMesh={onToggleMesh}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MeshNavigator({ meshes, hiddenMeshes, onToggleMesh }) {
  if (meshes.length === 0) return null;

  const visibleCount = countVisibleMeshes(meshes, hiddenMeshes);
  const totalCount = countTotalMeshes(meshes);
  const totalGroups = countTotalGroups(meshes);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-white/6 bg-white/4 px-3 py-1.5 text-[11px] text-slate-200">
        <div>
          <span className="font-semibold">Visible</span>
          <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-slate-400">
            {totalGroups} groups
          </p>
        </div>
        <span className="rounded-full bg-black/60 px-2 py-0.5 font-bold text-white">{visibleCount}/{totalCount}</span>
      </div>
      <div className="panel-scroll max-h-[42vh] space-y-1 overflow-y-auto overscroll-contain pr-1">
        {meshes.map((mesh) => (
          <MeshTreeNode
            key={mesh.uuid}
            node={mesh}
            hiddenMeshes={hiddenMeshes}
            onToggleMesh={onToggleMesh}
          />
        ))}
      </div>
    </div>
  );
}
