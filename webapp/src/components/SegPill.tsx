// Seletor segmentado padrão do app (visual da pill Notas/Outros de Modelos,
// app.css .seg-pill). Um só componente para trocar de visão em Rotinas,
// Metas, Notas/Modelos e Dados — mude aqui/no CSS e todas acompanham.
// `active` aceita lista quando mais de uma opção pode ficar ligada (Metas).
import type { CSSProperties } from "react";

export interface SegOpcao<K extends string> {
  key: K;
  label: string;
}

export function SegPill<K extends string>({
  options,
  active,
  onSelect,
  className = "",
  style,
}: {
  options: SegOpcao<K>[];
  active: K | K[];
  onSelect: (key: K) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const ativo = (k: K) => (Array.isArray(active) ? active.includes(k) : active === k);
  return (
    <div className={`type-toggle seg-pill ${className}`.trim()} style={style}>
      {options.map((o) => (
        <span key={o.key} className={ativo(o.key) ? "active" : ""} onClick={() => onSelect(o.key)}>
          {o.label}
        </span>
      ))}
    </div>
  );
}
