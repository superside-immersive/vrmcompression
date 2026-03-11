export function PanelSection({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-black/70 px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-lg border border-white/10 bg-white/5 p-1.5">
          <Icon className="h-3.5 w-3.5 text-white/70" />
        </div>
        <h2 className="text-[13px] font-bold tracking-tight text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}
