const FILL = { reservoir: ['#8a5a2b', '#fff'], well: ['#3b6ea5', '#fff'], manifold: ['#4b8a6a', '#fff'], process: ['#5b5f97', '#fff'], boundary: ['#a0453c', '#fff'], utility: ['#6f6f6f', '#fff'] };
export default function Schematic({ data }) {
  const byId = Object.fromEntries(data.nodes.map((n) => [n.id, n]));
  const W = 134, H = 54;
  return (
    <div className="scroll" style={{ maxHeight: 'none' }}>
      <svg viewBox="0 0 1100 400" width="100%" role="img" aria-label="Block schematic of the K-17 production system">
        <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor" /></marker></defs>
        <g style={{ color: 'var(--ink-3)' }}>
          {data.edges.map(([a, b, label], i) => {
            const A = byId[a], B = byId[b];
            const x1 = A.x + W / 2, y1 = A.y, x2 = B.x - W / 2, y2 = B.y;
            const mx = (x1 + x2) / 2;
            return (
              <g key={i}>
                <path d={`M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke="currentColor" strokeWidth="1.6" markerEnd="url(#arr)" />
                <text x={mx} y={(y1 + y2) / 2 - 4} fontSize="10" textAnchor="middle" fill="var(--ink-2)">{label}</text>
              </g>
            );
          })}
        </g>
        {data.nodes.map((n) => {
          const [bg, fg] = FILL[n.kind] || FILL.process;
          const lines = n.label.split('\n');
          return (
            <g key={n.id}>
              <rect x={n.x - W / 2} y={n.y - H / 2} width={W} height={H} rx="9" fill={bg} />
              {lines.map((l, i) => <text key={i} x={n.x} y={n.y + (i - (lines.length - 1) / 2) * 14 + 4} fontSize="11.5" fill={fg} textAnchor="middle" fontWeight={i === 0 ? 700 : 400}>{l}</text>)}
            </g>
          );
        })}
      </svg>
      <div className="row small muted" style={{ padding: '4px 10px 8px' }}>
        {Object.entries(FILL).map(([k, [c]]) => <span key={k} className="row" style={{ gap: 4 }}><span style={{ width: 10, height: 10, background: c, borderRadius: 3, display: 'inline-block' }} />{k}</span>)}
      </div>
    </div>
  );
}
