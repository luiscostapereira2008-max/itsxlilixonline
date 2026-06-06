# ItsXliLix — Deploy guide

## Estrutura do repositório (criar no GitHub)

```
itsxlilix-shop/
├── index.html              ← landing page (raiz)
├── Income Onli.html        ← curso (acessível via /curso)
├── sucesso.html            ← página pós-pagamento
├── netlify.toml            ← config Netlify
├── package.json
└── netlify/
    └── functions/
        ├── create-checkout.js   ← (renomeia fn-create-checkout.js)
        └── stripe-webhook.js    ← (renomeia fn-stripe-webhook.js)
```

**Importante:** os ficheiros `fn-create-checkout.js` e `fn-stripe-webhook.js` que estão na pasta de outputs precisam de ser movidos para `netlify/functions/` no teu repo, e renomeados (tirar o `fn-` do prefixo).

## Passo 1 — Setup local

```bash
# instalar Netlify CLI
npm install -g netlify-cli

# clonar/criar repo
git init itsxlilix-shop
cd itsxlilix-shop
# colocar os ficheiros aqui

npm install
```

## Passo 2 — Stripe Connect Express

1. Login em [stripe.com](https://stripe.com), modo **test** primeiro
2. Settings → Connect → Enable (escolher Express)
3. No teu código vais criar a conta da Lilix:
   ```bash
   curl https://api.stripe.com/v1/accounts \
     -u sk_test_XXX: \
     -d type=express -d country=PT
   ```
   Devolve um `acct_xxx` — guarda
4. Onboarding link:
   ```bash
   curl https://api.stripe.com/v1/account_links \
     -u sk_test_XXX: \
     -d account=acct_xxx \
     -d "refresh_url=https://itsxlilix.com" \
     -d "return_url=https://itsxlilix.com" \
     -d type=account_onboarding
   ```
   Envia o link à Lilix → ela preenche dados dela
5. Quando ela aprovar, podes cobrar com split automático

## Passo 3 — Resend (email transacional)

1. Criar conta em [resend.com](https://resend.com) (free tier: 3000 emails/mês, suficiente)
2. Add domain → adiciona registos DNS no domínio (SPF + DKIM)
3. Copiar API key

## Passo 4 — Deploy no Netlify

```bash
# do diretório do repo
netlify init
# escolher "Create & configure a new site"
# linkar ao repo GitHub
```

Depois no dashboard Netlify, **Site Settings → Environment Variables**, adicionar:

| Variável | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_xxx` (depois de testar com sk_test_) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` (criar no passo 5) |
| `LILIX_STRIPE_ACCOUNT_ID` | `acct_xxx` da Lilix |
| `RESEND_API_KEY` | `re_xxx` |
| `ACCESS_SECRET` | gerar: `openssl rand -hex 32` |
| `DOMAIN` | `https://itsxlilix.com` |

## Passo 5 — Webhook do Stripe

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://itsxlilix.com/.netlify/functions/stripe-webhook`
3. Selecionar evento: `checkout.session.completed`
4. Copiar **Signing secret** (`whsec_xxx`) → adicionar ao Netlify como `STRIPE_WEBHOOK_SECRET`
5. Re-deploy

## Passo 6 — DNS

No Porkbun/Namecheap onde compraste o domínio:

| Tipo | Nome | Valor |
|---|---|---|
| A | @ | (IP do Netlify — ver dashboard) |
| CNAME | www | (subdomain.netlify.app) |
| TXT | @ | (SPF — Resend dá) |
| TXT | resend._domainkey | (DKIM — Resend dá) |

Depois ativar HTTPS no Netlify (automático com Let's Encrypt).

## Passo 7 — Testar

1. Em modo **test** do Stripe, comprar com cartão `4242 4242 4242 4242`, qualquer data futura, qualquer CVC
2. Verificar que:
   - Recebes email com link
   - Link contém `?e=teu@email.com&s=...`
   - Email aparece no topbar do curso
   - Padrão repetido aparece em screenshots (printscreen para confirmar)
3. Verificar Stripe Dashboard que €60 foi cobrado, €30 foi para Lilix
4. Quando tudo OK → switch para chaves `sk_live_xxx`

## Passo 8 — Watermark security (notas)

O watermark atual é **dissuasão social**, não bloqueio criptográfico. Quem souber programar consegue tirar — mas o objetivo é desencorajar partilha casual.

Camadas:
- **Pill no topbar** — sempre visível, captado em screenshots
- **Padrão de fundo SVG** — repetido em diagonal, ~4% opacidade, mas torna-se visível em printscreens
- **Versão print** (`@media print`) — opacidade do padrão sobe para 15% e a pill fica mais destacada
- **HMAC signature** no link — impede que alguém troque o email só editando a URL (a validação não está estritamente aplicada no front-end por simplicidade, mas o `s=` permite-te validar autenticidade quando precisares)

Para reforçar mais tarde podes:
- Validar signature via Netlify Function antes de servir o curso (mover curso para uma rota protegida)
- Gerar PDF dinâmico com email watermarked em cada página
- Adicionar canvas invisível com email codificado em pixels (steganography)

## Custos mensais previstos

| Serviço | Custo |
|---|---|
| Netlify | Grátis (até 100GB bandwidth) |
| Stripe | 1.4% + €0.25 por transação europeia |
| Resend | Grátis até 3.000 emails/mês |
| Domínio | ~€8/ano |
| **Total fixo** | ~€0 + ~€1 por venda |

Compara com Hotmart: ~10% + processamento. A €60, poupas ~€4.60 por venda. Em 100 vendas/mês = €460/mês.
