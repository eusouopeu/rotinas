// Campos que recebem digitação em vez de abrir o seletor nativo (pedido do
// Pedro em 12/09/2026: no Android o popup de data/hora atrapalha mais do que
// ajuda). Todos guardam o mesmo formato de dado de antes — hora "HH:MM" e
// data ISO "AAAA-MM-DD" — só a entrada muda.
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { CAMPO_COMPACTO } from "./Campo";

/** Caixa do campo de hora avulso (era .time-kb-input): 66px, centralizado. */
const CAMPO_HORA_SOLTO =
  "w-[66px] rounded-lg border-[1.5px] border-line bg-card-2 px-[9px] py-[7px] text-center font-sans text-base text-ink focus:border-caneta focus:outline-none";

export type VarianteCampoDigitado = "solto" | "formulario";
const caixa = (v: VarianteCampoDigitado) => (v === "solto" ? CAMPO_HORA_SOLTO : CAMPO_COMPACTO);

/* Máscara dos campos de hora (timeKbInputHtml/wireTimeKbInputs,
   index.html:1851-1868): digita números, ganha ":" sozinho, normaliza no blur. */
export function TimeKbInput({
  value,
  onChange,
  label,
  className,
  disabled,
  variante = "solto",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  className?: string;
  disabled?: boolean;
  /** "solto" = campo de hora avulso (Home); "formulario" = dentro de um popup de meta */
  variante?: VarianteCampoDigitado;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className={cn(caixa(variante), className)}
      placeholder="--:--"
      maxLength={5}
      aria-label={label}
      disabled={disabled}
      value={value}
      onChange={(e) => {
        let v = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
        if (v.length >= 3) v = v.slice(0, 2) + ":" + v.slice(2);
        onChange(v);
      }}
      onBlur={() => {
        const m = value.match(/^(\d{1,2}):(\d{2})$/);
        if (!m) {
          onChange("");
          return;
        }
        const h = Math.min(23, +m[1]);
        const mi = Math.min(59, +m[2]);
        onChange(String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0"));
      }}
    />
  );
}

function isoParaBr(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/* Data digitada: mostra dd/mm/aaaa, guarda ISO. Só emite o valor quando a
   data está completa e é real (31/02 vira vazio no blur, como um seletor). */
export function DateKbInput({
  value,
  onChange,
  label,
  className,
  variante = "formulario",
}: {
  value: string;
  onChange: (iso: string) => void;
  label: string;
  className?: string;
  variante?: VarianteCampoDigitado;
}) {
  const [texto, setTexto] = useState(() => isoParaBr(value));
  const ultimoIso = useRef(value);

  // o pai pode trocar a data (abrir outra meta): re-sincroniza o texto
  useEffect(() => {
    if (value !== ultimoIso.current) {
      ultimoIso.current = value;
      setTexto(isoParaBr(value));
    }
  }, [value]);

  function emitir(t: string) {
    const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return "";
    const [, d, mes, ano] = m;
    const dt = new Date(+ano, +mes - 1, +d);
    if (dt.getFullYear() !== +ano || dt.getMonth() !== +mes - 1 || dt.getDate() !== +d) return "";
    return `${ano}-${mes}-${d}`;
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className={cn(caixa(variante), className)}
      placeholder="dd/mm/aaaa"
      maxLength={10}
      aria-label={label}
      value={texto}
      onChange={(e) => {
        const n = e.target.value.replace(/[^0-9]/g, "").slice(0, 8);
        let t = n;
        if (n.length > 4) t = `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
        else if (n.length > 2) t = `${n.slice(0, 2)}/${n.slice(2)}`;
        setTexto(t);
        const iso = emitir(t);
        ultimoIso.current = iso;
        onChange(iso);
      }}
      onBlur={() => {
        const iso = emitir(texto);
        if (!iso) {
          setTexto("");
          ultimoIso.current = "";
          onChange("");
        }
      }}
    />
  );
}

/* Área da roda digitada, com as áreas conhecidas sugeridas num menu suspenso
   conforme o texto. `onEscolher` recebe o rótulo digitado ou escolhido —
   área nova (fora do pool) é permitida, como nas caixas de chip de antes. */
export function AreaInput({
  valor,
  pool,
  placeholder,
  label,
  onEscolher,
  className,
  limpaAoEscolher,
}: {
  valor: string;
  pool: string[];
  placeholder: string;
  label: string;
  onEscolher: (label: string) => void;
  className?: string;
  /* campo de "adicionar área" (lista múltipla): o valor escolhido vira chip
     fora do campo, então o próprio campo esvazia — sem isto ele ficaria com
     o texto da última escolha, já que a prop `valor` não muda. */
  limpaAoEscolher?: boolean;
}) {
  const [texto, setTexto] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const ultimo = useRef(valor);

  useEffect(() => {
    if (valor !== ultimo.current) {
      ultimo.current = valor;
      setTexto(valor);
    }
  }, [valor]);

  const busca = texto.trim().toLowerCase();
  const sugestoes = pool.filter((a) => !busca || a.toLowerCase().includes(busca)).slice(0, 8);

  function escolher(v: string) {
    const fica = limpaAoEscolher ? "" : v;
    ultimo.current = fica;
    setTexto(fica);
    setAberto(false);
    onEscolher(v);
  }

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        className={CAMPO_COMPACTO}
        aria-label={label}
        placeholder={placeholder}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        // o clique numa sugestão dispara o blur antes do onMouseDown dela;
        // por isso a lista usa onMouseDown e o fecho aqui é adiado
        onBlur={() => setTimeout(() => setAberto(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            escolher(texto.trim());
          }
        }}
      />
      {aberto && sugestoes.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+4px)] z-[5] flex max-h-[180px] flex-col overflow-y-auto rounded-[9px] border-[1.5px] border-line bg-card p-1">
          {sugestoes.map((a) => (
            <span
              key={a}
              className="cursor-pointer rounded-xs px-2.5 py-2 font-sans text-md active:bg-card-2"
              onMouseDown={() => escolher(a)}
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
