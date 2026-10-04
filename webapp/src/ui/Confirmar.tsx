// Confirmação na janela do app — substitui window.confirm, que no Android
// abre o diálogo cru do sistema (pedido do Pedro, 03/10/2026). Uso:
//   if (await confirmar("Excluir a nota?", { acao: "Excluir", perigo: true })) ...
// <ConfirmarHost /> fica montado uma vez no App; sem ele (ambiente sem a
// casca), cai no window.confirm para não travar a ação.
import { useSyncExternalStore } from "react";
import { Botao } from "./Botao";
import { Modal, ModalAcoes, ModalTexto } from "./Modal";

type Pedido = {
  mensagem: string;
  acao: string;
  perigo: boolean;
  resolver: (sim: boolean) => void;
};

let atual: Pedido | null = null;
let hostMontado = 0;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function confirmar(mensagem: string, opcoes: { acao?: string; perigo?: boolean } = {}): Promise<boolean> {
  if (!hostMontado) return Promise.resolve(typeof window !== "undefined" && window.confirm(mensagem));
  atual?.resolver(false);
  return new Promise((resolver) => {
    atual = { mensagem, acao: opcoes.acao ?? "Confirmar", perigo: !!opcoes.perigo, resolver };
    avisar();
  });
}

function responder(sim: boolean) {
  const p = atual;
  atual = null;
  avisar();
  p?.resolver(sim);
}

export function ConfirmarHost() {
  const pedido = useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      hostMontado++;
      return () => {
        ouvintes.delete(f);
        hostMontado--;
      };
    },
    () => atual
  );
  if (!pedido) return null;
  // a primeira linha é a pergunta; o resto (depois de \n) vira explicação
  const [pergunta, ...resto] = pedido.mensagem.split("\n");
  return (
    <Modal onFechar={() => responder(false)}>
      <ModalTexto className={resto.length ? "mb-1.5" : undefined}>{pergunta}</ModalTexto>
      {resto.length > 0 && <p className="m-0 mb-[18px] font-sans text-md text-sub">{resto.join(" ")}</p>}
      <ModalAcoes>
        <Botao variante="neutro" tamanho="modal" onClick={() => responder(false)}>
          Cancelar
        </Botao>
        <Botao variante={pedido.perigo ? "destrutivo" : "solido"} tamanho="modal" onClick={() => responder(true)}>
          {pedido.acao}
        </Botao>
      </ModalAcoes>
    </Modal>
  );
}
