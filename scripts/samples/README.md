# SerpApi Google Shopping — field mapping (Preços)

Spike file: `serpapi-google-shopping-rx-9070-xt.json` (query `RX 9070 XT`, `gl=br`, `hl=pt-br`).

| App field | SerpApi source |
|-----------|----------------|
| `loja` | `source` |
| `titulo` | `title` |
| `preco` | `installment.extracted_price × period` when present, else `extracted_price` |
| `precoTexto` | `price` |
| `precoAvista` | `extracted_price` when `price` mentions agora / PIX / à vista |
| `link` | `link` or fallback `product_link` (Google Shopping) |
| `extra.parcelas` | `installment.price` + period |
| `extra.moeda` | inferred from `price` (`R$` → BRL) |

Implemented in `lib/precos-serp.mjs` → `mapSerpOffer()` (used by `scripts/fetch-prices.mjs`).
