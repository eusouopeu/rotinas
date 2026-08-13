// Client OAuth "Desktop app" do Brita, cadastrado uma única vez no Google Cloud
// Console. O client_secret de um app instalado NÃO é tratado como segredo de
// verdade pelo próprio Google — não dá pra manter confidencial dentro de um
// binário distribuído, o mesmo raciocínio por trás de ferramentas como rclone
// ou gdrive embutirem a credencial no código aberto. Ver:
// https://developers.google.com/identity/protocols/oauth2/native-app
//
// Cada usuário ainda autoriza a PRÓPRIA conta do Google (escopo drive.file: o
// app só enxerga o que ele mesmo criar) — esta credencial só identifica o app
// "Brita" perante o Google, não dá acesso a dado nenhum sozinha. Enquanto a
// tela de consentimento OAuth do projeto ficar em modo "Testing" com só os
// e-mails de teste autorizados, ninguém fora dessa lista consegue completar o
// login mesmo tendo esta credencial em mãos.
"use strict";

module.exports = {
  CLIENT_ID: "383472864188-3vajbc6p95fm8pp1tn64jvdmroijsr3n.apps.googleusercontent.com",
  CLIENT_SECRET: "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"
};
