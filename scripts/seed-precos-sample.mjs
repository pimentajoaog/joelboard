/* One-off sample generator for Phase 1 Preços demo data. */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const id = 'rx-9070-xt';
const dir = join(root, 'public/data/precos', id);
mkdirSync(dir, { recursive: true });

function ym(d) { return d.toISOString().slice(0, 7); }
function dayStr(d) { return d.toISOString().slice(0, 10); }

const start = new Date('2026-08-10T12:00:00');
const end = new Date('2026-10-08T12:00:00');
const byMonth = {};

for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
  const d = new Date(t);
  const key = dayStr(d);
  const m = ym(d);
  if (!byMonth[m]) byMonth[m] = {};
  const wave = Math.sin(t / 864000000) * 200;
  const base = 4799 + wave + (d.getDay() === 0 ? -80 : 0);
  const offers = [
    { loja: 'Kabum', titulo: 'Placa de Vídeo AMD Radeon RX 9070 XT 16GB', preco: Math.round(base), precoTexto: 'R$ ' + Math.round(base).toLocaleString('pt-BR') + ',90', precoAvista: Math.round(base * 0.92), link: 'https://www.kabum.com.br/produto/' + key, extra: { parcelas: '10x' } },
    { loja: 'Terabyte', titulo: 'RX 9070 XT 16GB GDDR6', preco: Math.round(base + 120), precoTexto: 'R$ ' + Math.round(base + 120).toLocaleString('pt-BR') + ',00', link: 'https://www.terabyteshop.com.br/produto/' + key }
  ];
  if (d.getDate() === 15) {
    offers.push({ loja: 'Notebooks & Cia', titulo: 'Notebook Gamer RX 9070 XT', preco: 8999, precoTexto: 'R$ 8.999,00', link: 'https://example.com/laptop' });
  }
  if (d.getDate() === 20) {
    offers.push({ loja: 'Best Buy', titulo: 'RX 9070 XT', preco: 499, precoTexto: 'US$ 499.00', link: 'https://www.bestbuy.com/site/gpu' });
  }
  if (d.getDate() === 22) {
    offers.push({ loja: 'Importados', titulo: 'RX 9070 XT importada', preco: 420, precoTexto: '$420 USD', link: 'https://import.example/gpu' });
  }
  if (d.getDate() === 25) {
    offers.push({ loja: 'Outlet GPU', titulo: 'AMD RX 9070 16GB (sem XT)', preco: 3999, precoTexto: 'R$ 3.999,00', link: 'https://outlet.example/9070' });
  }
  byMonth[m][key] = offers;
}

Object.keys(byMonth).forEach(function (m) {
  writeFileSync(join(dir, m + '.json'), JSON.stringify(byMonth[m], null, 2) + '\n', 'utf8');
});

writeFileSync(join(root, 'public/data/precos-watch.json'), JSON.stringify([{ id: id, termo: 'RX 9070 XT' }], null, 2) + '\n', 'utf8');
console.log('seed-precos-sample: wrote', dir);
