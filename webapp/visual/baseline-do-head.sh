#!/usr/bin/env bash
# Grava a referência visual a partir do ÚLTIMO COMMIT (HEAD), usando os roteiros
# e os dados de teste ATUAIS (webapp/visual/*.mjs). É o passo certo antes de
# migrar uma tela: a referência é o app como estava, mesmo com o trabalho da
# migração já começado na sua pasta (que não é tocada).
#   npm run visual:baseline-head                  # tudo
#   npm run visual:baseline-head -- ajustes.spec.mjs   # só um roteiro
set -euo pipefail
RAIZ=$(git rev-parse --show-toplevel)
WT="$(mktemp -d)/brita-head"
git -C "$RAIZ" worktree add --detach "$WT" HEAD -q
trap 'git -C "$RAIZ" worktree remove --force "$WT"' EXIT
ln -s "$RAIZ/node_modules" "$WT/node_modules"
[ -d "$RAIZ/webapp/node_modules" ] && ln -s "$RAIZ/webapp/node_modules" "$WT/webapp/node_modules"
cp "$RAIZ"/webapp/visual/*.mjs "$WT/webapp/visual/"
status=0
(cd "$WT" && npx playwright test -c webapp/visual/playwright.config.mjs --update-snapshots=all "$@") || status=$?
# copia mesmo com teste falhando: os que passaram já têm imagem
mkdir -p "$RAIZ/webapp/visual/referencia"
cp -R "$WT/webapp/visual/referencia/." "$RAIZ/webapp/visual/referencia/"
echo "referência atualizada a partir de $(git -C "$RAIZ" rev-parse --short HEAD) (status dos testes: $status)"
exit $status
