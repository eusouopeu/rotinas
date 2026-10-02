// Alternar claro/escuro na barra superior de cada aba (pedido do Pedro,
// 02/10/2026). Troca para o tema oposto ao que está na tela — "sistema"
// resolve pelo prefers-color-scheme, como em App.tsx — e grava a escolha
// explícita; "sistema" continua disponível em Ajustes.
import { useAppStore } from "../store/useAppStore";
import { BotaoIcone } from "../ui/BotaoIcone";
import { Icon } from "./Icon";

function escuroAgora(theme: "auto" | "light" | "dark") {
  if (theme !== "auto") return theme === "dark";
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function BotaoTema() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const escuro = escuroAgora(theme);
  return (
    <BotaoIcone
      tamanho="sm"
      rotulo={escuro ? "Tema claro" : "Tema escuro"}
      onClick={() => setTheme(escuro ? "light" : "dark")}
    >
      <Icon name={escuro ? "sun" : "moon"} size={16} />
    </BotaoIcone>
  );
}
