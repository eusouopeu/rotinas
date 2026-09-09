# Testes, commit, push e APK

Antes de implementar, escolha 2–3 testes essenciais para a mudança. Depois, rode testes da área; mudança no `index.html` exige `npm test`. Não leia dependências/artefatos para formular contexto. `npm test` inclui legado e React; use testes específicos como `test/editor.cjs`, `test/gamificacao.cjs`, sync e Vitest quando relevantes.

Para cada rodada que altere código do app (index.html, webapp/, android/, electron/): atualize a documentação que descreve a decisão, faça commit e push, e gere o APK atualizado — automático desde 09/09/2026, sem precisar de pedido explícito de entrega a cada vez. Incremente `versionCode` e `versionName` em `android/app/build.gradle`, atualize `BUILD_STAMP` em `index.html`, execute `npm run apk` e valide o APK com `aapt dump badging` (nome do pacote, versionCode/versionName batendo). Saída: `android/app/build/outputs/apk/debug/app-debug.apk` — envie esse arquivo ao Pedro ao final da rodada. Mudança exclusivamente documental não aciona isso.

JDK 21 e SDK Android são pré-requisitos. A keystore `android/brita.keystore` é gitignorada; mantenha cópia externa e não exponha senha/segredo. Sem assinatura estável, Android exigirá reinstalação. Informe de modo conciso arquivos, testes, commit/push e APK quando aplicável.
