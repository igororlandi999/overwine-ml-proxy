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
// Adicione novas conforme criar ferramentas.
const ALLOWED_ORIGINS = [
  "https://igororlandi999.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5502",
  "http://127.0.0.1:5502",
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  // CORS headers em TODA resposta
  res.setHeader("Access-Control-Allow-Origin",  allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age",       "86400");
  res.setHeader("Vary",                         "Origin");

  // Preflight responde imediato
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Monta a URL alvo
  // req.url chega como "/api/users/me?foo=bar" — tiramos o /api inicial
  const pathAndQuery = req.url.replace(/^\/api/, "");
  const targetUrl = ML_BASE + pathAndQuery;

  // Repassa headers relevantes (Authorization e Content-Type)
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

    // Copia status e body da resposta do ML
    const text = await mlRes.text();
    res.status(mlRes.status);

    // Tenta encaminhar Content-Type do ML
    const ct = mlRes.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);

    return res.send(text);
  } catch (err) {
    return res.status(502).json({
      proxy_error: true,
      message: err.message,
      target: targetUrl,
    });
  }
}

// Lê o body cru da request (Vercel não parseia se não declarado)
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end",  () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Desliga o body parser automático da Vercel pra preservar o JSON cru
export const config = {
  api: {
    bodyParser: false,
  },
};