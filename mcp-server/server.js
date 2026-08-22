// Servidor MCP embutido: transporte Streamable HTTP em 127.0.0.1, protegido por token.
// As tools não reimplementam a lógica de negócio — cada uma delega para o bridge
// registrado no renderer (window.__britaMCP em index.html), via callRenderer (IPC).
"use strict";

const http = require("http");
const crypto = require("crypto");
const { z } = require("zod");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");

const TAG_VALOR = z.enum(["nenhum", "baixo", "medio", "alto"]);
const ESCOPO = z.enum(["dia", "semana", "mes", "ano"]);

function buildServer({ getConfig, callRenderer, logCall }) {
  const server = new McpServer({ name: "brita", version: "1.0.0" });

  function toResult(value) {
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
  }
  function errorResult(msg) {
    return { isError: true, content: [{ type: "text", text: msg }] };
  }

  function registerRead(name, description, inputSchema) {
    server.registerTool(name, { description, inputSchema }, async (args) => {
      logCall({ tool: name, args, mode: getConfig().mode, kind: "read" });
      try {
        return toResult(await callRenderer(name, args));
      } catch (e) {
        return errorResult(String((e && e.message) || e));
      }
    });
  }
  function registerWrite(name, description, inputSchema) {
    server.registerTool(name, { description, inputSchema }, async (args) => {
      const mode = getConfig().mode;
      logCall({ tool: name, args, mode, kind: "write" });
      if (mode !== "write") {
        return errorResult("Escrita desabilitada — ative \"leitura e escrita\" em Configurações → Integrações.");
      }
      try {
        return toResult(await callRenderer(name, args));
      } catch (e) {
        return errorResult(String((e && e.message) || e));
      }
    });
  }

  /* ---------------- Leitura ---------------- */
  registerRead("list_routines", "Lista as rotinas cadastradas (nome, horário agendado, dias da semana).", {
    apenas_hoje: z.boolean().optional().describe("se true, só rotinas agendadas para hoje")
  });
  registerRead("get_today_agenda", "Agenda de hoje: rotinas agendadas, blocos de horário do diário e kanban do dia.", {});
  registerRead("list_metas", "Lista as metas (contagens regressivas) com prazo e progresso.", {});
  registerRead("read_note", "Lê uma nota pelo id.", { id: z.string() });
  registerRead("search_notes", "Busca notas por título ou conteúdo.", { query: z.string() });
  registerRead("read_diario", "Lê o texto do diário de um período (dia/semana/mês/ano).", {
    escopo: ESCOPO.default("dia"),
    iso: z.string().optional().describe("data ISO AAAA-MM-DD dentro do período; padrão hoje")
  });
  registerRead("get_gamificacao_status", "Boletim da semana atual: nota, ritmo e pontos por área.", {});

  /* ---------------- Escrita (exige modo \"leitura e escrita\") ---------------- */
  registerWrite("append_diario", "Acrescenta um texto ao fim da nota do diário de um período.", {
    escopo: ESCOPO.default("dia"),
    iso: z.string().optional(),
    texto: z.string()
  });
  registerWrite("add_kanban_card", "Cria um cartão em \"A fazer\" no kanban do diário de hoje.", {
    texto: z.string(),
    tag_valor: TAG_VALOR.optional().describe("padrão baixo"),
    eixo: z.string().optional().describe("área da roda da vida, se ativa")
  });
  registerWrite("create_note", "Cria uma nova nota.", {
    title: z.string(),
    content: z.string().optional()
  });
  registerWrite("append_note", "Acrescenta texto ao fim de uma nota existente.", {
    id: z.string(),
    texto: z.string()
  });

  return server;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 5_000_000) { req.destroy(); reject(new Error("corpo muito grande")); }
    });
    req.on("end", () => {
      if (!data) return resolve(undefined);
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

async function startMcpServer({ getConfig, callRenderer, logCall }) {
  const cfg = getConfig();
  const mcpServer = buildServer({ getConfig, callRenderer, logCall });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  await mcpServer.connect(transport);

  const httpServer = http.createServer(async (req, res) => {
    if (!req.url || !req.url.startsWith("/mcp")) { res.writeHead(404).end(); return; }
    const token = getConfig().token;
    const authHeader = req.headers["authorization"] || "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.headers["x-brita-token"];
    if (!provided || provided !== token) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "token ausente ou inválido" }));
      return;
    }
    try {
      const body = req.method === "POST" ? await readJsonBody(req) : undefined;
      await transport.handleRequest(req, res, body);
    } catch (e) {
      if (!res.headersSent) res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String((e && e.message) || e) }));
    }
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(cfg.port, "127.0.0.1", resolve);
  });

  return {
    port: cfg.port,
    async stop() {
      await new Promise((resolve) => httpServer.close(() => resolve()));
      await transport.close();
    }
  };
}

module.exports = { startMcpServer };
