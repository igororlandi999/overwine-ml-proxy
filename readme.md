# Overwine ML Proxy

Proxy CORS para a API do Mercado Livre.

## Estrutura

```
overwine-ml-proxy/
├── api/
│   └── proxy.js       ← função serverless
├── package.json
├── vercel.json        ← rewrites /api/* → /api/proxy?path=*
└── README.md
```

## Como funciona

```
Frontend → https://overwine-ml-proxy.vercel.app/api/users/me?foo=bar
              │
              │  rewrite (vercel.json)
              ▼
Vercel → /api/proxy?path=/users/me&foo=bar
              │
              │  proxy.js extrai path da query, monta URL
              ▼
ML API → https://api.mercadolibre.com/users/me?foo=bar
```

## Deploy

1. Cria repo no GitHub (público) chamado `overwine-ml-proxy`
2. Push esses arquivos
3. Em vercel.com/new → Import Project → escolhe o repo
4. Framework Preset: **Other**
5. Deploy

## Teste pós-deploy

```bash
curl https://overwine-ml-proxy.vercel.app/api/sites/MLB
```

Deve voltar `{"id":"MLB","name":"Brasil",...}`.

## Origens autorizadas

Em `api/proxy.js`, array `ALLOWED_ORIGINS`. Editar e dar push pra redeploy.