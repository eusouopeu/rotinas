// Barra do topo do player: "Sair" à esquerda; à direita painel de etapas, nota
// anexada (se a rotina tem), lançar rápido e o contador "3 / 5". Os botões não
// têm moldura e usam a fonte do sistema, como no legado.
import { Icon } from "../../components/Icon";

const BOTAO = "border-0 bg-transparent text-lg text-sub";

type Props = {
  posicao: number;
  total: number;
  temNota: boolean;
  /** "HH:MM" da previsão de término (etapas restantes + estimativa por série). */
  fimPrevisto?: string;
  onSair: () => void;
  onEtapas: () => void;
  onNota: () => void;
  onRapido: () => void;
};

export function TopoPlayer({ posicao, total, temNota, fimPrevisto, onSair, onEtapas, onNota, onRapido }: Props) {
  return (
    <div className="flex w-full items-center justify-between px-1">
      <button className={BOTAO} onClick={onSair}>
        Sair
      </button>
      <div className="flex items-center gap-3">
        <button className={BOTAO} title="Ver todas as etapas" aria-label="Ver todas as etapas" onClick={onEtapas}>
          <Icon name="bars3" size={15} />
        </button>
        {temNota && (
          <button className={BOTAO} title="Abrir nota anexada" aria-label="Abrir nota anexada" onClick={onNota}>
            <Icon name="notes" size={14} />
          </button>
        )}
        <button className={BOTAO} title="Lançar rápido" aria-label="Lançar rápido" onClick={onRapido}>
          +
        </button>
        {fimPrevisto && (
          <div className="font-sans text-sm text-sub" title="Previsão de término">
            ~{fimPrevisto}
          </div>
        )}
        <div className="font-sans text-sm text-sub">
          {posicao} / {total}
        </div>
      </div>
    </div>
  );
}
