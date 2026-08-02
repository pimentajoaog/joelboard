# Hub

Ponto de entrada do Joelboard — launcher dos apps, temas globais do Hub e painel de novidades.

## O que você encontra

- **Cards dos apps** — Finance, Fit, Study, Notas e Mini (extensões Chrome).
- **Novidades** — sidebar com as 5 últimas mudanças. Fallback no código; se `VITE_HUB_NEWS_SHEET_ID` estiver configurado, lê de uma planilha Google pública (aba `Novidades`: colunas App, Kind, Text).
- **Editar novidades (admin)** — com login `joaogabrielpabarbosa@gmail.com`, aparece ✏ no painel. Salva na planilha para todos. Na primeira vez cria a planilha; depois copie o ID para `VITE_HUB_NEWS_SHEET_ID` no Vercel.
- **Ajustes (⚙)** — tema do Hub, tutorial, login/sair, feedback.

## Login

Um login Google vale para todos os apps. Ao sair no Hub, a sessão é encerrada globalmente.

## Temas

O Hub tem skin própria (`jb_skin_hub` no navegador). Cada app salva tema e modo claro/escuro **separadamente** — mudar o tema no Hub não altera Fit ou Finance automaticamente.

## Feedback (owner)

Usuários com e-mail autorizado veem o tile **Feedback** — lista de bugs e ideias enviados pelos formulários in-app, com filtros por app e status.

## Mini

O card **Mini** abre o painel de extensões Chrome (Replace, Refresh), instruções de instalação e lista de sites permitidos. Ver [mini.md](mini.md).
