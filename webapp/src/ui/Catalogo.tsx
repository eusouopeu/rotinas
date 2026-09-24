// Catálogo de desenvolvimento dos primitivos de ui/ — abra /#/ui com o
// `npm run dev:react` (não existe no build de produção: main.tsx só o importa
// em DEV). Cada linha mostra o componente NOVO ao lado do MESMO elemento feito
// com as classes do app.css antigo. Duas utilidades:
//   1. olho: ver todas as variantes, nos dois temas (botão "tema"), num lugar só;
//   2. teste: webapp/visual/catalogo.spec.mjs compara os estilos computados dos
//      dois lados e reprova se o primitivo divergir do legado (paridade).
// Ao criar um primitivo novo, acrescente aqui uma linha <Par> — é o que prova
// que ele bate com o que existia.
import { useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { Botao } from "./Botao";
import { BotaoIcone } from "./BotaoIcone";
import { CabecalhoTela } from "./CabecalhoTela";
import { Campo } from "./Campo";
import { CampoDuracao } from "./CampoDuracao";
import { Cartao } from "./Cartao";
import { Chip } from "./Chip";
import { EstadoVazio } from "./EstadoVazio";
import { Fab } from "./Fab";
import { Modal, ModalAcoes, ModalTexto } from "./Modal";
import { RotuloSecao } from "./RotuloSecao";
import { SegPill, Toggle } from "./Segmentado";
import { Switch } from "./Switch";

/** O que comparar num lado do par: o elemento raiz ({}), um descendente
 *  ({sel}) e/ou um pseudo-elemento ({pseudo}). */
type Alvo = { sel?: string; pseudo?: string };

function Par({
  nome,
  legado,
  novo,
  cmp = [{}],
  cmpNovo,
  contem,
  ignorar,
}: {
  nome: string;
  legado: ReactNode;
  novo: ReactNode;
  cmp?: Alvo[];
  cmpNovo?: Alvo[];
  /** cria um bloco próprio para filhos `position: fixed` (FAB, Modal) */
  contem?: boolean;
  /** propriedades que DIFEREM de propósito (comente o motivo no uso) */
  ignorar?: string[];
}) {
  const lado = (rotulo: "legado" | "novo", conteudo: ReactNode, alvos: Alvo[]) => (
    <div
      data-par={nome}
      data-lado={rotulo}
      data-comparar={JSON.stringify(alvos)}
      data-ignorar={JSON.stringify(ignorar ?? [])}
      className={contem ? "relative h-40 overflow-hidden rounded-md border border-dashed border-line [transform:translateZ(0)]" : "min-w-0"}
    >
      {conteudo}
    </div>
  );
  return (
    <div className="mb-4">
      <RotuloSecao className="mt-0 mb-1.5">{nome}</RotuloSecao>
      <div className="grid grid-cols-2 items-start gap-3">
        {lado("legado", legado, cmp)}
        {lado("novo", novo, cmpNovo ?? cmp)}
      </div>
    </div>
  );
}

const icone = <Icon name="settings" size={16} />;
const noop = () => {};

export function Catalogo() {
  const [escuro, setEscuro] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark", escuro);

  return (
    <div className="screen">
      <div data-catalogo className="tab-scroll pb-16">
        <CabecalhoTela titulo="ui/">
          <Botao variante="neutro" onClick={() => setEscuro(!escuro)}>
            tema
          </Botao>
        </CabecalhoTela>
        <p className="mb-4 text-sm text-sub">Esquerda: app.css legado. Direita: primitivo novo. Devem ser idênticos.</p>

        {/* .btn-primary traz flex:1 (encher a linha de botões); o Botao não: quem quer usa className="flex-1" */}
        <Par
          nome="botao-primario"
          legado={<button className="btn-primary">Salvar</button>}
          novo={<Botao>Salvar</Botao>}
          ignorar={["flexGrow", "flexBasis"]}
        />
        <Par
          nome="botao-neutro"
          legado={<button className="btn-cancel">Cancelar</button>}
          novo={<Botao variante="neutro">Cancelar</Botao>}
        />
        {/* legado esqueceu font-family e caía na fonte do sistema (Arial); o primitivo usa Montserrat como o resto do app */}
        <Par
          nome="botao-perigo"
          legado={<button className="btn-danger-outline">Excluir</button>}
          novo={<Botao variante="perigo">Excluir</Botao>}
          ignorar={["fontFamily", "largura", "altura"]}
        />
        <Par
          nome="botoes-modal"
          legado={
            <div className="confirm-actions">
              <button className="btn-cancel">Cancelar</button>
              <button className="btn-primary">Ok</button>
            </div>
          }
          novo={
            <ModalAcoes>
              <Botao variante="neutro" tamanho="modal">
                Cancelar
              </Botao>
              <Botao tamanho="modal">Ok</Botao>
            </ModalAcoes>
          }
          cmp={[{}, { sel: "button:first-child" }, { sel: "button:last-child" }]}
        />

        <Par
          nome="icone-padrao"
          legado={<button className="icon-btn">{icone}</button>}
          novo={<BotaoIcone rotulo="Ajustes">{icone}</BotaoIcone>}
          cmp={[{}, { pseudo: "::after" }]}
        />
        <Par
          nome="icone-ligado"
          legado={<button className="icon-btn on">{icone}</button>}
          novo={
            <BotaoIcone rotulo="Ajustes" ligado>
              {icone}
            </BotaoIcone>
          }
        />
        <Par
          nome="icone-sem-borda"
          legado={<button className="icon-btn borderless">{icone}</button>}
          novo={
            <BotaoIcone rotulo="Ajustes" semBorda>
              {icone}
            </BotaoIcone>
          }
        />
        {/* .bell-btn é inline-block; o primitivo centra o ícone com flex (mesmo tamanho) */}
        <Par
          ignorar={["display", "flexShrink", "alignItems", "justifyContent"]}
          nome="icone-pequeno"
          legado={<button className="bell-btn">{icone}</button>}
          novo={
            <BotaoIcone rotulo="Boletim" tamanho="sm">
              {icone}
            </BotaoIcone>
          }
        />

        <Par nome="fab" contem legado={<button className="fab" title="Novo">+</button>} novo={<Fab rotulo="Novo" onClick={noop} />} />

        <Par
          nome="chip"
          legado={<span className="area-chip">Saúde</span>}
          novo={<Chip>Saúde</Chip>}
        />
        <Par
          nome="chip-ativo"
          legado={
            <span className="area-chip sel" style={{ "--chip": "var(--ok)" } as React.CSSProperties}>
              Saúde
            </span>
          }
          novo={
            <Chip ativo cor="var(--ok)">
              Saúde
            </Chip>
          }
        />

        <Par
          nome="segpill-cheia"
          legado={
            <div className="type-toggle seg-pill view-toggle">
              <span className="active">Semana</span>
              <span>Dia</span>
              <span>Lista</span>
            </div>
          }
          novo={
            <SegPill
              cheia
              options={[
                { key: "a", label: "Semana" },
                { key: "b", label: "Dia" },
                { key: "c", label: "Lista" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />
        <Par
          nome="segpill-auto"
          legado={
            <div className="type-toggle seg-pill">
              <span className="active">Notas</span>
              <span>Outros</span>
            </div>
          }
          novo={
            <SegPill
              options={[
                { key: "a", label: "Notas" },
                { key: "b", label: "Outros" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />
        {/* cursor de mão nas opções: melhoria intencional para o desktop */}
        <Par
          ignorar={["cursor"]}
          nome="toggle"
          legado={
            <div className="type-toggle">
              <span className="active">Baixo</span>
              <span>Médio</span>
            </div>
          }
          novo={
            <Toggle
              options={[
                { key: "a", label: "Baixo" },
                { key: "b", label: "Médio" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />
        <Par
          ignorar={["cursor"]}
          nome="toggle-largo"
          legado={
            <div className="type-toggle mf-wide">
              <span className="active">Baixo</span>
              <span>Médio</span>
            </div>
          }
          novo={
            <Toggle
              larga
              options={[
                { key: "a", label: "Baixo" },
                { key: "b", label: "Médio" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />
        <Par
          ignorar={["cursor"]}
          nome="toggle-ajustes"
          legado={
            <div className="type-toggle mf-wide set-toggle">
              <span className="active">claro</span>
              <span>escuro</span>
            </div>
          }
          novo={
            <Toggle
              larga
              grande
              className="mb-1"
              options={[
                { key: "a", label: "claro" },
                { key: "b", label: "escuro" },
              ]}
              active="a"
              onSelect={noop}
            />
          }
          cmp={[{}, { sel: "span:first-child" }, { sel: "span:last-child" }]}
        />

        <Par
          ignorar={["transform", "translate"]} /* translateX() vs propriedade translate: mesmo efeito */
          nome="switch-ligado"
          legado={
            <label className="switch-row">
              <span>Ativar horário</span>
              <input type="checkbox" defaultChecked />
            </label>
          }
          novo={
            <Switch checked onChange={noop}>
              Ativar horário
            </Switch>
          }
          cmp={[{}, { sel: "span" }, { sel: "input" }, { sel: "input", pseudo: "::before" }]}
        />
        <Par
          nome="switch-desligado"
          legado={
            <label className="switch-row">
              <span>Ativar horário</span>
              <input type="checkbox" />
            </label>
          }
          novo={
            <Switch checked={false} onChange={noop}>
              Ativar horário
            </Switch>
          }
          cmp={[{}, { sel: "input" }, { sel: "input", pseudo: "::before" }]}
        />

        <Par
          nome="campo-duracao"
          legado={
            <label className="dur-field">
              <input className="dur-input" type="number" defaultValue={5} />
              <span className="dur-un">m</span>
            </label>
          }
          novo={<CampoDuracao unidade="m" defaultValue={5} />}
          cmp={[{}, { sel: "input" }, { sel: "span" }]}
        />
        {/* no legado o input é item de flex (.sched-time-row) e vira block; aqui ele é o próprio elemento */}
        <Par
          ignorar={["display", "minWidth", "minHeight"]}
          nome="campo"
          legado={
            <div className="sched-time-row" style={{ marginTop: 0 }}>
              <input type="time" defaultValue="06:30" />
            </div>
          }
          novo={<Campo type="time" defaultValue="06:30" />}
          cmp={[{ sel: "input" }]}
          cmpNovo={[{}]}
        />

        <Par
          nome="cartao"
          legado={
            <div className="stat-card" style={{ marginBottom: 0 }}>
              Conteúdo
            </div>
          }
          novo={<Cartao>Conteúdo</Cartao>}
        />
        <Par
          nome="cartao-formulario"
          legado={<div className="schedule-box">Conteúdo</div>}
          novo={<Cartao raio="lg">Conteúdo</Cartao>}
        />

        <Par
          nome="modal"
          contem
          legado={
            <div className="confirm-overlay">
              <div className="confirm-box">
                <p>Excluir esta rotina?</p>
                <div className="confirm-actions">
                  <button className="btn-cancel">Cancelar</button>
                  <button className="btn-primary">Excluir</button>
                </div>
              </div>
            </div>
          }
          novo={
            <Modal>
              <ModalTexto>Excluir esta rotina?</ModalTexto>
              <ModalAcoes>
                <Botao variante="neutro" tamanho="modal">
                  Cancelar
                </Botao>
                <Botao tamanho="modal">Excluir</Botao>
              </ModalAcoes>
            </Modal>
          }
          cmp={[{}, { sel: ".confirm-box" }, { sel: "p" }, { sel: ".confirm-actions" }]}
          cmpNovo={[{}, { sel: "[role=dialog]" }, { sel: "p" }, { sel: "[role=dialog] > div" }]}
        />

        <Par
          nome="estado-vazio"
          legado={
            <div className="empty-state">
              <h2>Nenhuma nota ainda</h2>
              <p>Listas de compras, tarefas, notas de estudo — tudo rápido.</p>
              <button className="btn-primary">+ Nova nota</button>
            </div>
          }
          novo={
            <EstadoVazio titulo="Nenhuma nota ainda" texto="Listas de compras, tarefas, notas de estudo — tudo rápido.">
              <Botao>+ Nova nota</Botao>
            </EstadoVazio>
          }
          cmp={[{}, { sel: "h2" }, { sel: "p" }, { sel: "button" }]}
        />
        <Par
          nome="rotulo-secao"
          legado={<div className="section-label">Etapas</div>}
          novo={<RotuloSecao>Etapas</RotuloSecao>}
        />
        <Par
          ignorar={["display", "flexShrink", "alignItems", "justifyContent"]} /* botão bell-btn: ver icone-pequeno */
          nome="cabecalho-tela"
          legado={
            <div className="home-header">
              <h1>Rotinas</h1>
              <button className="bell-btn">{icone}</button>
            </div>
          }
          novo={
            <CabecalhoTela titulo="Rotinas">
              <BotaoIcone rotulo="Boletim" tamanho="sm">
                {icone}
              </BotaoIcone>
            </CabecalhoTela>
          }
          cmp={[{}, { sel: "h1" }, { sel: "button" }]}
        />
      </div>
    </div>
  );
}
