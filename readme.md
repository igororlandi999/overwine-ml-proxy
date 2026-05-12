# Overwine ML Proxy

Proxy CORS para a API do Mercado Livre. Existe porque o ML não responde a preflights CORS de origens externas, então o navegador bloqueia chamadas com `Authorization` direto.

## Como funciona

```
Frontend (igororlandi999.github.io)
        │
        │  GET https://overwine-ml-proxy.vercel.app/api/users/me
        │  Header: Authorization: Bearer <token>
        ▼
Proxy (Vercel)
        │
        │  GET https://api.mercadolibre.com/users/me
        │  Header: Authorization: Bearer <token>  ← repassado
        ▼
API ML  →  responde JSON
        │
        ▼
Proxy adiciona CORS headers e devolve pro frontend
```

O proxy é **stateless** — não guarda token, não tem banco, não tem sessão. Apenas adiciona headers CORS e repassa o que o frontend mandou.

## Estrutura

```
overwine-ml-proxy/
├── api/
│   └── [...path].js     ← catch-all que repassa tudo
├── package.json
├── vercel.json
└── README.md
```

## Deploy

### Pré-requisitos

- Conta no Vercel (gratuita): https://vercel.com/signup (pode logar com GitHub)
- Git instalado

### Passos

**1. Criar repo no GitHub**

```bash
cd overwine-ml-proxy
git init
git add .
git commit -m "init proxy"
gh repo create overwine-ml-proxy --public --source=. --push
```

Sem `gh` CLI? Cria o repo manualmente em github.com/new e:

```bash
git remote add origin https://github.com/igororlandi999/overwine-ml-proxy.git
git branch -M main
git push -u origin main
```

**2. Conectar no Vercel**

1. Acessa https://vercel.com/new
2. Clica em "Import Project" → escolhe o repo `overwine-ml-proxy`
3. Framework Preset: **Other**
4. Build Command: deixa vazio
5. Output Directory: deixa vazio
6. Clica "Deploy"

Em ~30s vai estar no ar em algo como `overwine-ml-proxy.vercel.app`.

**3. Testar**

No terminal, depois do deploy:

```bash
curl https://overwine-ml-proxy.vercel.app/api/sites/MLB
```

Esperado: JSON do Mercado Livre Brasil (`{"id":"MLB","name":"Brasil",...}`).

Se isso funcionou, o proxy está OK. Endpoints com auth precisam do token:

```bash
curl https://overwine-ml-proxy.vercel.app/api/users/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## Origens autorizadas

Lista em `api/[...path].js`:

- `https://igororlandi999.github.io` (GitHub Pages)
- `http://localhost:5500` e `5502` (Live Server)
- `http://127.0.0.1:5500` e `5502`

Pra adicionar nova origem, edita o array `ALLOWED_ORIGINS` e dá push. Deploy automático em ~20s.

## Atualização do frontend

No `relampago/js/api/ml-client.js`, troca:

```js
const ML_BASE = "https://api.mercadolibre.com";
```

por:

```js
const ML_BASE = "https://overwine-ml-proxy.vercel.app/api";
```

Mais nada muda. Todos os endpoints continuam iguais (`/users/me`, `/seller-promotions/...`, etc).

## Custos

Plano hobby da Vercel: **gratuito**, suporta 100k invocações/mês e cold start de ~1s. Pro uso da mesa de promoções (umas dezenas de calls por sessão), sobra rede.

## Segurança

- Não há secrets no código. Token vem do frontend.
- Exposição do token é igual ao que já existe no localStorage do dashboard atual.
- Lista de origens autorizadas previne uso por terceiros.
- Mantém em mente: quem acessar seu navegador continua tendo acesso ao token, igual hoje.