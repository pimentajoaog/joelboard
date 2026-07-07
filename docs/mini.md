# Mini — extensões Chrome

Extensões leves da família Joelboard, distribuídas como zip pelo Hub (**Mini → Baixar**). Não estão na Chrome Web Store — instalação manual em modo desenvolvedor.

Arquivos gerados no build: `public/extensions/joelboard-replace.zip`, `joelboard-refresh.zip`.

---

## Instalar

1. Baixe o zip no Hub (card Replace ou Refresh).
2. Descompacte — pasta `replace` ou `refresh` com `manifest.json`.
3. Chrome → `chrome://extensions` → **Modo do desenvolvedor** ON.
4. **Carregar sem compactação** → selecione a pasta.
5. Fixe o ícone na barra.

Após **atualizar** a extensão (novo zip ou reload em `chrome://extensions`), **recarregue as abas abertas** — scripts antigos perdem o contexto da extensão.

---

## Replace — expansão de texto

Substitui **gatilhos** por templates em campos editáveis (input, textarea, contenteditable).

### Uso

1. Digite o gatilho (ex.: `/test`, `//oi`).
2. Pressione **Espaço**, **Tab** ou **Enter** (configurável no popup).
3. O gatilho expande — funciona **dentro de outro texto** (ex.: `test/test` reconhece `/test` no final).

### Variáveis

- `{{nome}}`, `{{empresa}}`, `{{date}}`, `{{time}}`, `{{clipboard}}` ou `%clip%` para colar.

### Import / export

- JSON ou CSV/TSV no popup.
- Planilha: colunas `Nome`, `Trigger`, `Text` (ou `Trigger`, `Text`).

### Permissões

Só roda em **sites permitidos** (padrão: Joelboard, Google Docs/Sheets, GitHub, …). Adicione domínios no Hub (**Mini → Sites permitidos**) ou no popup da extensão.

---

## Refresh — auto-reload da aba

Recarrega a aba atual em intervalo fixo.

### Uso

1. Abra a página desejada.
2. Popup da extensão → defina intervalo (mín. 3 s) → **Iniciar** (recarrega na hora).
3. Contador **↻** no canto da página enquanto ativo (some em aba inativa se “pausar inativo” estiver ON).

### Atalho

Padrão **Alt+Shift+R** — personalizável no popup (gravar novo atalho). Também disponível como comando Chrome.

### Comportamento

- Badge na extensão mostra tempo restante.
- Fechar a aba para o timer.
- Após reload/update da extensão, scripts antigos param silenciosamente (sem erro no console).

---

## Sites permitidos

Hub e extensões compartilham a lista via `chrome.storage` / mensagem `jb-mini-sites-set`. Domínios sem permissão não recebem content script até você adicionar e conceder acesso no Chrome.
