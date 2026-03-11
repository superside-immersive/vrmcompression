import { useState } from 'react';

export function DropBox({ label, icon: Icon, onFileDrop, active, accept }) {
  const [drag, setDrag] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDrag(false);
        onFileDrop(event.dataTransfer.files[0]);
      }}
      className={`relative flex min-h-[74px] flex-col justify-between rounded-2xl border border-dashed p-2.5 transition-all
        ${drag ? 'scale-[1.02] border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(103,232,249,0.25)]' : 'border-white/10 bg-black/80'}
        ${active ? 'border-emerald-300/30 bg-emerald-400/10' : ''}`}
    >
      <input
        type="file"
        className="absolute inset-0 cursor-pointer opacity-0"
        accept={accept}
        onChange={(event) => onFileDrop(event.target.files[0])}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="rounded-lg bg-black/80 p-1.5">
          <Icon className={`h-3.5 w-3.5 ${active ? 'text-emerald-300' : 'text-slate-400'}`} />
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${active ? 'bg-emerald-400/15 text-emerald-300' : 'bg-black/80 text-slate-300'}`}>
          {active ? 'Loaded' : 'Ready'}
        </span>
      </div>
      <div>
        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">File</p>
        <p className="line-clamp-2 break-words text-[12px] font-semibold leading-snug text-slate-100">{label}</p>
      </div>
    </div>
  );
}
