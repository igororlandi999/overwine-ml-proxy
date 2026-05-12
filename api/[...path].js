// /api/[...path].js — catch-all que repassa pra api.mercadolibre.com
//
// Como funciona:
//   Frontend chama:   https://overwine-ml-proxy.vercel.app/api/users/me
//   Proxy repassa pra: https://api.mercadolibre.com/users/me
//
// O Authorization vem do header da request (frontend manda o Bearer token).
// O proxy só adiciona os headers CORS na resposta pra o navegador aceitar.

const ML_BASE = "https://api.mercadolibre.com";

// Origens autorizadas a chamar este proxy.
const ALLOWED_ORIGINS = [
  "https://igororlandi999.github.io",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5502",
  "http://127.0.0.1:5502",
];

// Aplica CORS headers — SEMPRE chamado, em todo retorno.
function applyCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // Origem desconhecida: ainda devolve um Allow-Origin (a primeira) só pra
    // o browser não dar erro inteligível. Idealmente bloquearíamos, mas como
    // este proxy é de uso restrito, só log e segue.
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0]);
  }
  res.setHeader("Vary",                         "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With");
  res.setHeader("Access-Control-Max-Age",       "86400");
}

export default async function handler(req, res) {
  // CORS sai em TODA resposta, mesmo as de erro.
  applyCors(req, res);

  // Preflight responde imediato, sem chamar o ML.
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Monta a URL alvo
  // req.url chega como "/api/users/me?foo=bar" — tiramos o /api inicial.
  const pathAndQuery = req.url.replace(/^\/api/, "");
  if (!pathAndQuery || pathAndQuery === "/") {
    return res.status(400).json({
      proxy_error: true,
      message: "Path vazio. Use /api/<endpoint-do-ML>",
    });
  }
  const targetUrl = ML_BASE + pathAndQuery;

  // Repassa headers relevantes
  const headers = {};
  if (req.headers["authorization"]) headers["Authorization"] = req.headers["authorization"];
  if (req.headers["content-type"])  headers["Content-Type"]  = req.headers["content-type"];

  // Body só se houver
  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await readRawBody(req);
  }

  try {
    const mlRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const text = await mlRes.text();
    // Reaplica CORS (paranoia — alguns runtimes resetam ao mudar status)
    applyCors(req, res);
    res.status(mlRes.status);

    const ct = mlRes.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);

    return res.send(text);
  } catch (err) {
    applyCors(req, res);
    return res.status(502).json({
      proxy_error: true,
      message: err.message,
      target: targetUrl,
    });
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data",  chunk => chunks.push(chunk));
    req.on("end",   () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};