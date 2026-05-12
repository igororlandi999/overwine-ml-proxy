// api/proxy.js — proxy CORS para api.mercadolibre.com
//
// Frontend chama:   https://overwine-ml-proxy.vercel.app/api/users/me
// Vercel rewrites:  /api/users/me  →  /api/proxy?path=/users/me
// Esta função pega path da query e repassa pro Mercado Livre.

const ML_BASE = "https://api.mercadolibre.com";

const ALLOWED_ORIGINS = [
  "https://igororlandi999.github.io",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5502",
  "http://127.0.0.1:5502",
];

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0]);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With");
  res.setHeader("Access-Control-Max-Age", "86400");
}

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Pega o path da query string (injetado pelo rewrite)
  // Ex: /api/users/me?foo=bar → path="/users/me" e queryRest="?foo=bar"
  let pathParam = req.query.path || "";
  if (Array.isArray(pathParam)) pathParam = pathParam.join("/");
  if (!pathParam.startsWith("/")) pathParam = "/" + pathParam;

  // Reconstrói query string sem o param "path"
  const url = new URL(req.url, "http://x");
  url.searchParams.delete("path");
  const queryStr = url.search; // já vem com "?" se houver

  if (!pathParam || pathParam === "/") {
    return res.status(400).json({
      proxy_error: true,
      message: "Path vazio. Use /api/<endpoint-do-ML>",
      received_url: req.url,
      received_query: req.query,
    });
  }

  const targetUrl = ML_BASE + pathParam + queryStr;

  const headers = {};
  if (req.headers["authorization"]) headers["Authorization"] = req.headers["authorization"];
  if (req.headers["content-type"])  headers["Content-Type"]  = req.headers["content-type"];

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await readRawBody(req);
  }

  try {
    const mlRes = await fetch(targetUrl, { method: req.method, headers, body });
    const text = await mlRes.text();
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
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end",  () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

module.exports.config = {
  api: { bodyParser: false },
};