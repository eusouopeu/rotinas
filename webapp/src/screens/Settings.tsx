// Aba Ajustes (porta parcial de renderSettings, index.html:13700-14142).
// Tema e tamanho do texto ficam sempre à vista; o resto é uma pilha de seções
// retráteis filtrada pela busca — cada seção mora em features/ajustes/.
// PIN e atalhos de teclado ficam de fora por decisão de escopo (CLAUDE.md).
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { CabecalhoTela } from "../ui/CabecalhoTela";
import { Tabbar } from "../components/Tabbar";
import { isDesktop } from "../lib/storage";
import { CampoBusca } from "../ui/CampoBusca";
import { RotuloSecao } from "../ui/RotuloSecao";
import { Toggle } from "../ui/Segmentado";
import { FiltroAjustes } from "../features/ajustes/SecaoAjuste";
import { SecaoAvisos } from "../features/ajustes/SecaoAvisos";
import { SecaoCalendario } from "../features/ajustes/SecaoCalendario";
import { SecaoDados } from "../features/ajustes/SecaoDados";
import { SecaoInicioSemana } from "../features/ajustes/SecaoInicioSemana";
import { SecaoMcp, SecaoMiniPlayer } from "../features/ajustes/SecoesDesktop";
import { SecaoPontuacao } from "../features/ajustes/SecaoPontuacao";
import { SecaoRoda } from "../features/ajustes/SecaoRoda";
import { tela } from "../ui/Tela";

const TEMAS = [
  { key: "auto", label: "sistema" },
  { key: "light", label: "claro" },
  { key: "dark", label: "escuro" },
] as const;
const TAMANHOS_TEXTO = [
  { key: "0.9", label: "P" },
  { key: "1", label: "M" },
  { key: "1.15", label: "G" },
  { key: "1.3", label: "GG" },
] as const;

export function Settings() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const fontScale = useAppStore((s) => s.fontScale);
  const setFontScale = useAppStore((s) => s.setFontScale);
  const [busca, setBusca] = useState("");

  return (
    <FiltroAjustes.Provider value={busca}>
      <div {...tela({ comAbas: true, larga: true })}>
        <div className="flex-1 overflow-x-hidden overflow-y-auto pb-6" data-rolagem>
          <CabecalhoTela titulo="Ajustes" margem="1.5" />

          <RotuloSecao>Tema</RotuloSecao>
          <Toggle larga grande className="mb-1" options={[...TEMAS]} active={theme} onSelect={setTheme} />
          <RotuloSecao>Tamanho do texto</RotuloSecao>
          <Toggle
            larga
            grande
            className="mb-1"
            options={[...TAMANHOS_TEXTO]}
            active={String(fontScale) as (typeof TAMANHOS_TEXTO)[number]["key"]}
            onSelect={(k) => setFontScale(Number(k))}
          />

          <CampoBusca
            className="mt-4 mb-3.5"
            placeholder="Buscar em Ajustes..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <SecaoInicioSemana />
          <SecaoAvisos />
          <SecaoRoda />
          <SecaoPontuacao />
          <SecaoDados />
          <SecaoCalendario />
          {isDesktop && <SecaoMiniPlayer />}
          {isDesktop && <SecaoMcp />}
        </div>

        <Tabbar />
      </div>
    </FiltroAjustes.Provider>
  );
}
