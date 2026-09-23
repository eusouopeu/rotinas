// Slice de notas simples, modelos/documentos e despesas — extraído de
// useAppStore.ts (recomendação 7 de docs/react-migration.md) por ser o
// domínio menos acoplado a gamificação/pontuação/notificação do resto da
// store: CRUD puro sobre `notes`/`templates` + save(), sem side-effect de
// score ou agendamento. Mesmo padrão "slices" do Zustand — API pública da
// store não muda, é só onde o código mora.
import type { StateCreator } from "zustand";
import { save } from "../../lib/storage";
import { K_NOTES, K_TEMPLATES } from "../../lib/constants";
import { nomeAutoDoc } from "../../lib/notes";
import { apagarNotaMd, sincronizarNotaMd } from "../../lib/mdMirror";
import { newTemplateDoc } from "../../lib/templates";
import { uid } from "../../lib/uid";
import type { AnyTemplateDoc, Note } from "../../lib/types";
import type { AppState } from "../useAppStore";

export type NotesSlice = Pick<
  AppState,
  | "openNote"
  | "closeNoteEditor"
  | "updateNote"
  | "toggleNotePinned"
  | "deleteNote"
  | "addNoteAt"
  | "addNote"
  | "createTemplateDoc"
  | "updateTemplateDoc"
  | "deleteTemplateDoc"
  | "deleteTemplateDocWithUndo"
  | "addExpense"
  | "addExpenses"
  | "openSearch"
  | "closeSearch"
>;

/* Espelho Markdown (lib/mdMirror.ts): toda gravação de nota regrava o .md
   correspondente em Documentos. Debounce porque `updateNote` é chamado a cada
   tecla pelo editor live — sem ele seria um arquivo por caractere digitado. O
   caminho volta para `note._mdPath` (sem disparar novo espelho) para que a
   troca de título apague o arquivo antigo em vez de deixar dois. */
const ESPELHO_MS = 1200;
const espelhoTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const createNotesSlice: StateCreator<AppState, [], [], NotesSlice> = (set, get) => {
  function espelharMd(id: string) {
    clearTimeout(espelhoTimers.get(id));
    espelhoTimers.set(
      id,
      setTimeout(() => {
        espelhoTimers.delete(id);
        const nota = get().notes.find((n) => n.id === id);
        if (!nota) return;
        void sincronizarNotaMd(nota, get().notes).then((caminho) => {
          if (!caminho) return;
          const atuais = get().notes;
          const alvo = atuais.find((n) => n.id === id);
          if (!alvo || alvo._mdPath === caminho) return;
          const notes = atuais.map((n) => (n.id === id ? { ...n, _mdPath: caminho } : n));
          save(K_NOTES, notes);
          set({ notes });
        });
      }, ESPELHO_MS)
    );
  }

  return {
  openNote: (id) => {
    if (id) {
      set({ view: { tab: "templates", screen: "noteEditor", id } });
      return;
    }
    const nota: Note = { id: uid(), title: nomeAutoDoc(), content: "", subjects: [], createdAt: Date.now(), updatedAt: Date.now() };
    const notes = [...get().notes, nota];
    save(K_NOTES, notes);
    set({ notes, view: { tab: "templates", screen: "noteEditor", id: nota.id } });
    espelharMd(nota.id);
  },
  closeNoteEditor: () => set({ view: { tab: "templates", screen: "notes" } }),
  updateNote: (id, patch) => {
    const notes = get().notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n));
    save(K_NOTES, notes);
    set({ notes });
    espelharMd(id);
  },
  toggleNotePinned: (id) => {
    const notes = get().notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    save(K_NOTES, notes);
    set({ notes });
  },
  deleteNote: (id) => {
    const alvo = get().notes.find((n) => n.id === id);
    clearTimeout(espelhoTimers.get(id));
    espelhoTimers.delete(id);
    if (alvo) void apagarNotaMd(alvo);
    const notes = get().notes.filter((n) => n.id !== id);
    save(K_NOTES, notes);
    set({ notes });
  },
  addNoteAt: (idx, nota) => {
    const atuais = get().notes;
    const novoIdx = Math.min(idx, atuais.length);
    const notes = [...atuais.slice(0, novoIdx), nota, ...atuais.slice(novoIdx)];
    save(K_NOTES, notes);
    set({ notes });
    espelharMd(nota.id);
  },
  addNote: (title, content) => {
    const nota: Note = {
      id: uid(),
      title,
      content,
      subjects: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const notes = [...get().notes, nota];
    save(K_NOTES, notes);
    set({ notes });
    espelharMd(nota.id);
    return nota;
  },

  createTemplateDoc: (type, folderKind, folderKey, preset) => {
    const doc = newTemplateDoc(type, preset);
    const templates = [...get().templates, doc];
    save(K_TEMPLATES, templates);
    set({ templates, view: { tab: "templates", screen: "templateDoc", id: doc.id, folderKind, folderKey } });
  },
  updateTemplateDoc: (doc: AnyTemplateDoc) => {
    const docNovo = { ...doc, updatedAt: Date.now() };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
  },
  deleteTemplateDoc: (id) => {
    const templates = get().templates.filter((t) => t.id !== id);
    save(K_TEMPLATES, templates);
    set({ templates });
  },
  // Porta de wrapSwipeDelete + showUndoBanner do doc genérico (index.html:
  // 6639-6645) — mesma remoção, com "Desfazer" reinserindo no índice
  // original do array `templates` (não da lista filtrada da pasta).
  deleteTemplateDocWithUndo: (id) => {
    const antes = get().templates;
    const idx = antes.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const removido = antes[idx];
    const templates = antes.filter((t) => t.id !== id);
    save(K_TEMPLATES, templates);
    set({ templates });
    get().showUndoBanner("Documento excluído", () => {
      const atuais = get().templates;
      const novoIdx = Math.min(idx, atuais.length);
      const restaurados = [...atuais.slice(0, novoIdx), removido, ...atuais.slice(novoIdx)];
      save(K_TEMPLATES, restaurados);
      set({ templates: restaurados });
    });
  },
  addExpense: (fields) => {
    const now = Date.now();
    const doc = { id: uid(), type: "expense" as const, ...fields, createdAt: now, updatedAt: now };
    const templates = [...get().templates, doc];
    save(K_TEMPLATES, templates);
    set({ templates });
  },
  addExpenses: (lote) => {
    const now = Date.now();
    const docs = lote.map((fields) => ({ id: uid(), type: "expense" as const, ...fields, createdAt: now, updatedAt: now }));
    const templates = [...get().templates, ...docs];
    save(K_TEMPLATES, templates);
    set({ templates });
  },

  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  };
};
