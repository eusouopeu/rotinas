// Gráfico de linha em SVG para percentuais (0–100%) ao longo do tempo, com
// grade horizontal a cada 25% e linha tracejada opcional de meta. Pontos
// nulos (sem nada agendado) quebram a linha em vez de cair para zero.

interface Ponto {
  label: string;
  pct: number | null;
}

interface Props {
  pontos: Ponto[];
  /** % da linha tracejada de referência */
  meta?: number;
  ariaLabel: string;
}

const W = 320;
const H = 150;
const ESQ = 34;
const DIR = 8;
const TOPO = 8;
const BASE = 22;

export function GraficoLinhaPct({ pontos, meta, ariaLabel }: Props) {
  const pw = W - ESQ - DIR;
  const ph = H - TOPO - BASE;
  const x = (i: number) => ESQ + (pontos.length > 1 ? (i / (pontos.length - 1)) * pw : pw / 2);
  const y = (v: number) => TOPO + ph - (Math.max(0, Math.min(100, v)) / 100) * ph;

  const trechos: string[] = [];
  let atual: string[] = [];
  pontos.forEach((p, i) => {
    if (p.pct == null) {
      if (atual.length) trechos.push(atual.join(" "));
      atual = [];
    } else {
      atual.push(`${x(i)},${y(p.pct)}`);
    }
  });
  if (atual.length) trechos.push(atual.join(" "));

  // rótulo do eixo x em pontos alternados, sempre incluindo o último
  const ultimo = pontos.length - 1;

  return (
    <svg className="linha-pct" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line className="lp-grade" x1={ESQ} x2={W - DIR} y1={y(v)} y2={y(v)} />
          <text className="lp-eixo" x={ESQ - 6} y={y(v) + 3.5} textAnchor="end">
            {v}%
          </text>
        </g>
      ))}
      {meta != null && <line className="lp-meta" x1={ESQ} x2={W - DIR} y1={y(meta)} y2={y(meta)} />}
      {trechos.map((pts, i) => (
        <polyline key={i} className="lp-linha" points={pts} />
      ))}
      {pontos.map((p, i) =>
        p.pct == null ? null : (
          <circle key={i} className="lp-ponto" cx={x(i)} cy={y(p.pct)} r={3.5}>
            <title>{`${p.label}: ${p.pct}%`}</title>
          </circle>
        ),
      )}
      {pontos.map((p, i) =>
        (ultimo - i) % 2 === 0 ? (
          <text key={`x-${i}`} className="lp-eixo" x={x(i)} y={H - 6} textAnchor={i === ultimo ? "end" : "middle"}>
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
