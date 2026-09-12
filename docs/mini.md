# Mini — extensão Chrome

Uma extensão da família Joelboard com **Replace** e **Refresh**. Distribuída como zip pelo Hub (**Mini → Baixar**). Não está na Chrome Web Store — instalação manual em modo desenvolvedor.

Arquivo gerado no build: `public/extensions/joelboard-mini.zip` (pasta `mini` com o launcher).

Staff permanece extensão local separada (não entra no zip público).

---

## Instalar

1. Baixe `joelboard-mini.zip` no Hub.
2. Descompacte — pasta `mini` com `manifest.json`.
3. Chrome → `chrome://extensions` → **Modo do desenvolvedor** ON.
4. **Carregar sem compactação** → selecione a pasta `mini`.
5. Fixe o ícone na barra. O popup abre o seletor (Replace / Refresh).

Após **atualizar** a extensão (novo zip ou reload em `chrome://extensions`), **recarregue as abas abertas** — scripts antigos perdem o contexto da extensão.

Se você ainda tinha Replace/Refresh/Report separados, remova-os e instale só o Mini.

---

## Replace — expansão de texto

Substitui **gatilhos** por templates em campos editáveis (input, textarea, contenteditable).

### Uso

1. Digite o gatilho (ex.: `/test`, `//oi`).
2. Pressione **Espaço**, **Tab** ou **Enter** (configurável no popup) — ou ative **Expandir ao terminar de digitar o gatilho**.
3. O gatilho expande — funciona **dentro de outro texto**.

### Formatação no texto expandido

No editor de template (popup): `**negrito**`, `*itálico*`, `__sublinhado__`, `~~riscado~~`; linhas com `- ` viram lista.

### Variáveis

`{{nome}}`, `{{empresa}}`, `{{date}}`, `{{time}}`, `{{clipboard}}` ou `%clip%`.

### Sincronização na nuvem (Google Sheets)

Macros, variáveis e ajustes na planilha **Joelboard Mini** — popup Replace → Ajustes → Nuvem, ou Hub → **Sincronizar Replace agora**.

### Permissões

Só roda em **sites permitidos** (Hub Mini ou popup).

---

## Refresh — auto-reload da aba

1. Abra a página desejada.
2. Mini → Refresh → intervalo (mín. 3 s) → **Iniciar**.
3. Contador **↻** no canto enquanto ativo.

Atalho padrão **Alt+Shift+R** (personalizável no popup).

---

## Sites permitidos

Hub e extensão compartilham a lista via `chrome.storage` / mensagem `jb-mini-sites-set`. Com sync na nuvem, a aba `ReplaceSites` da planilha Joelboard Mini guarda os domínios entre dispositivos.
