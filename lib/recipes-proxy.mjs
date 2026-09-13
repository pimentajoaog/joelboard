/** Recipe search proxy — Spoonacular → Foodashi → TheMealDB. Keys stay server-side. */
const FETCH_TIMEOUT_MS = 8000;
const SEARCH_LIMIT = 24;

const MEALDB_KEY_NAMES = ['THEMEALDB_KEY', 'THEMEALDB_API_KEY', 'VITE_THEMEALDB_KEY'];
const SPOON_KEY_NAMES = ['SPOONACULAR_KEY', 'SPOONACULAR_API_KEY', 'VITE_SPOONACULAR_KEY'];
const FOODASHI_KEY_NAMES = ['FOODASHI_KEY', 'FOODASHI_API_KEY', 'VITE_FOODASHI_KEY'];
const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/';
const SPOON_BASE = 'https://api.spoonacular.com';
const FOODASHI_BASE = 'https://api.foodashi.com';

function fetchWithTimeout(url, opts) {
  return fetch(url, Object.assign({}, opts || {}, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }));
}

function firstEnvKey(env, names) {
  for (var i = 0; i < names.length; i++) {
    var val = String((env && env[names[i]]) || '').trim();
    if (val) return { key: val, source: names[i] };
  }
  return { key: '', source: '' };
}

export function recipesApiKey(env) {
  var auth = firstEnvKey(env, MEALDB_KEY_NAMES);
  if (auth.key) return auth;
  return { key: '1', source: 'default' };
}

export function spoonacularApiKey(env) {
  return firstEnvKey(env, SPOON_KEY_NAMES);
}

export function foodashiApiKey(env) {
  return firstEnvKey(env, FOODASHI_KEY_NAMES);
}

export function recipesProviderChain(env) {
  var chain = [];
  if (spoonacularApiKey(env).key) chain.push('spoonacular');
  if (foodashiApiKey(env).key) chain.push('foodashi');
  chain.push('themealdb');
  return chain;
}

function parseJsonSafe(text) {
  try { return JSON.parse(text || '{}'); } catch (_) { return null; }
}

function upstreamError(message, status, detail) {
  var err = new Error(message || 'Upstream error');
  err.status = status || 502;
  err.detail = detail;
  err.quota = status === 402 || status === 429;
  return err;
}

async function readUpstream(res) {
  var text = await res.text();
  var data = parseJsonSafe(text);
  if (data == null) throw upstreamError('Bad upstream JSON', 502);
  if (!res.ok) {
    var msg = (data && (data.message || data.error)) || ('HTTP ' + res.status);
    throw upstreamError(String(msg), res.status, data);
  }
  return data;
}

function emptyMeal(source, sourceId) {
  return {
    source: source,
    sourceId: String(sourceId || ''),
    title: '',
    image: '',
    category: '',
    area: '',
    tags: '',
    youtube: '',
    ingredients: [],
    steps: []
  };
}

/* ---- TheMealDB ---- */
function mealIngredients(meal) {
  var out = [];
  for (var i = 1; i <= 20; i++) {
    var ing = String(meal['strIngredient' + i] || '').trim();
    var mea = String(meal['strMeasure' + i] || '').trim();
    if (!ing) continue;
    out.push({ text: ing, qty: mea, unit: '' });
  }
  return out;
}

function mealSteps(meal) {
  var raw = String(meal.strInstructions || '').trim();
  if (!raw) return [];
  return raw.split(/\r?\n+/).map(function (line) {
    return String(line || '').replace(/^\s*\d+[\).\-\:]]\s*/, '').trim();
  }).filter(Boolean).map(function (text) {
    return { text: text };
  });
}

function normalizeMealDb(meal) {
  if (!meal || !meal.idMeal) return null;
  return Object.assign(emptyMeal('themealdb', meal.idMeal), {
    title: String(meal.strMeal || '').trim(),
    image: String(meal.strMealThumb || '').trim(),
    category: String(meal.strCategory || '').trim(),
    area: String(meal.strArea || '').trim(),
    tags: String(meal.strTags || '').trim(),
    youtube: String(meal.strYoutube || '').trim(),
    ingredients: mealIngredients(meal),
    steps: mealSteps(meal)
  });
}

function normalizeMealDbSummary(meal) {
  if (!meal || !meal.idMeal) return null;
  return Object.assign(emptyMeal('themealdb', meal.idMeal), {
    title: String(meal.strMeal || '').trim(),
    image: String(meal.strMealThumb || '').trim()
  });
}

async function fetchMealDb(key, path) {
  var res = await fetchWithTimeout(MEALDB_BASE + encodeURIComponent(key) + '/' + path, {
    headers: { Accept: 'application/json' }
  });
  var data = await readUpstream(res);
  return Array.isArray(data.meals) ? data.meals : [];
}

/* eggs → egg — TheMealDB indexa o singular na maioria dos casos. */
export function ingredientQueryVariants(q) {
  var raw = String(q || '').trim();
  if (!raw) return [];
  var out = [raw];
  var lower = raw.toLowerCase();
  var singular = '';
  if (/ies$/i.test(lower) && lower.length > 4) singular = lower.slice(0, -3) + 'y';
  else if (/ses$/i.test(lower) && lower.length > 4) singular = lower.slice(0, -2);
  else if (/s$/i.test(lower) && !/ss$/i.test(lower) && lower.length > 3) singular = lower.slice(0, -1);
  if (singular && singular !== lower) out.push(singular);
  return out;
}

function mergeUnique(list) {
  var seen = Object.create(null);
  var out = [];
  list.forEach(function (m) {
    if (!m || !m.sourceId) return;
    var k = m.source + ':' + m.sourceId;
    if (seen[k]) return;
    seen[k] = true;
    out.push(m);
  });
  return out.slice(0, SEARCH_LIMIT);
}

async function searchMealDb(env, q, by) {
  var auth = recipesApiKey(env);
  if (by === 'ingredient') {
    var variants = ingredientQueryVariants(q);
    var packs = await Promise.all(variants.map(function (v) {
      return fetchMealDb(auth.key, 'filter.php?i=' + encodeURIComponent(v));
    }));
    var filtered = [];
    packs.forEach(function (rows) { filtered = filtered.concat(rows || []); });
    return mergeUnique(filtered.map(normalizeMealDbSummary).filter(Boolean));
  }
  var named = await fetchMealDb(auth.key, 'search.php?s=' + encodeURIComponent(q));
  return mergeUnique(named.map(normalizeMealDb).filter(Boolean));
}

async function lookupMealDb(env, id) {
  var auth = recipesApiKey(env);
  var meals = await fetchMealDb(auth.key, 'lookup.php?i=' + encodeURIComponent(id));
  return meals[0] ? normalizeMealDb(meals[0]) : null;
}

/* ---- Spoonacular ---- */
function spoonIng(ing) {
  var qty = ing.amount != null && ing.amount !== '' ? String(ing.amount) : '';
  var unit = String(ing.unit || '').trim();
  var text = String(ing.name || ing.originalName || '').trim();
  if (!text && ing.original) text = String(ing.original).trim();
  return { text: text, qty: qty, unit: unit };
}

function spoonSteps(info) {
  var analyzed = info.analyzedInstructions || [];
  var out = [];
  analyzed.forEach(function (block) {
    (block.steps || []).forEach(function (st) {
      var text = String(st.step || '').trim();
      if (text) out.push({ text: text });
    });
  });
  if (out.length) return out;
  var raw = String(info.instructions || '').replace(/<[^>]+>/g, '\n').trim();
  if (!raw) return [];
  return raw.split(/\r?\n+/).map(function (line) {
    return String(line || '').replace(/^\s*\d+[\).\-\:]]\s*/, '').trim();
  }).filter(Boolean).map(function (text) {
    return { text: text };
  });
}

function normalizeSpoonSummary(row) {
  if (!row || row.id == null) return null;
  return Object.assign(emptyMeal('spoonacular', row.id), {
    title: String(row.title || '').trim(),
    image: String(row.image || '').trim(),
    category: Array.isArray(row.dishTypes) ? String(row.dishTypes[0] || '') : '',
    area: Array.isArray(row.cuisines) ? String(row.cuisines[0] || '') : ''
  });
}

function normalizeSpoonInfo(info) {
  if (!info || info.id == null) return null;
  return Object.assign(emptyMeal('spoonacular', info.id), {
    title: String(info.title || '').trim(),
    image: String(info.image || '').trim(),
    category: Array.isArray(info.dishTypes) ? String(info.dishTypes[0] || '') : '',
    area: Array.isArray(info.cuisines) ? String(info.cuisines[0] || '') : '',
    tags: Array.isArray(info.diets) ? info.diets.join(',') : '',
    ingredients: (info.extendedIngredients || []).map(spoonIng).filter(function (x) { return x.text; }),
    steps: spoonSteps(info)
  });
}

async function spoonFetch(key, path) {
  var sep = path.indexOf('?') >= 0 ? '&' : '?';
  var res = await fetchWithTimeout(SPOON_BASE + path + sep + 'apiKey=' + encodeURIComponent(key), {
    headers: { Accept: 'application/json' }
  });
  return readUpstream(res);
}

async function searchSpoonacular(env, q, by) {
  var auth = spoonacularApiKey(env);
  if (!auth.key) throw upstreamError('Spoonacular key missing', 503);
  if (by === 'ingredient') {
    var data = await spoonFetch(auth.key,
      '/recipes/findByIngredients?ingredients=' + encodeURIComponent(q)
      + '&number=' + SEARCH_LIMIT + '&ranking=1&ignorePantry=true');
    var rows = Array.isArray(data) ? data : [];
    return mergeUnique(rows.map(normalizeSpoonSummary).filter(Boolean));
  }
  var pack = await spoonFetch(auth.key,
    '/recipes/complexSearch?query=' + encodeURIComponent(q)
    + '&number=' + SEARCH_LIMIT + '&addRecipeInformation=false');
  var results = Array.isArray(pack.results) ? pack.results : [];
  return mergeUnique(results.map(normalizeSpoonSummary).filter(Boolean));
}

async function lookupSpoonacular(env, id) {
  var auth = spoonacularApiKey(env);
  if (!auth.key) throw upstreamError('Spoonacular key missing', 503);
  var info = await spoonFetch(auth.key,
    '/recipes/' + encodeURIComponent(id) + '/information?includeNutrition=false');
  return normalizeSpoonInfo(info);
}

/* ---- Foodashi ---- */
function splitAmount(raw) {
  var s = String(raw || '').trim();
  if (!s) return { qty: '', unit: '' };
  var m = s.match(/^([\d./¼½¾⅓⅔⅛⅜⅝⅞]+(?:\s*-\s*[\d./]+)?)\s*(.*)$/u);
  if (!m) return { qty: s, unit: '' };
  return { qty: m[1].trim(), unit: String(m[2] || '').trim() };
}

function normalizeFoodashiSummary(row) {
  if (!row || !row.id) return null;
  return Object.assign(emptyMeal('foodashi', row.id), {
    title: String(row.title || '').trim(),
    image: String(row.image_url || row.image || '').trim(),
    category: Array.isArray(row.dish_types) ? String(row.dish_types[0] || '') : String(row.dish_type || ''),
    area: String(row.cuisine || '').trim()
  });
}

function normalizeFoodashiDetail(row) {
  if (!row || !row.id) return null;
  var ings = (row.ingredients || []).map(function (ing) {
    if (typeof ing === 'string') return { text: ing.trim(), qty: '', unit: '' };
    var name = String(ing.name || ing.text || '').trim();
    var split = splitAmount(ing.amount || ing.qty || '');
    return { text: name, qty: split.qty, unit: split.unit || String(ing.unit || '').trim() };
  }).filter(function (x) { return x.text; });
  var steps = (row.instructions || row.steps || []).map(function (st) {
    if (typeof st === 'string') return { text: st.trim() };
    return { text: String(st.text || st.step || '').trim() };
  }).filter(function (x) { return x.text; });
  return Object.assign(emptyMeal('foodashi', row.id), {
    title: String(row.title || '').trim(),
    image: String(row.image_url || row.image || '').trim(),
    category: Array.isArray(row.dish_types) ? String(row.dish_types[0] || '') : '',
    area: String(row.cuisine || '').trim(),
    tags: Array.isArray(row.dietary_tags) ? row.dietary_tags.join(',') : '',
    ingredients: ings,
    steps: steps
  });
}

async function foodashiFetch(key, path) {
  var res = await fetchWithTimeout(FOODASHI_BASE + path, {
    headers: { Accept: 'application/json', 'X-Api-Key': key }
  });
  return readUpstream(res);
}

function foodashiList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.recipes)) return data.recipes;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

async function searchFoodashi(env, q, by) {
  var auth = foodashiApiKey(env);
  if (!auth.key) throw upstreamError('Foodashi key missing', 503);
  var path = by === 'ingredient'
    ? '/api/recipes/by-ingredients?include=' + encodeURIComponent(q) + '&limit=' + SEARCH_LIMIT
    : '/api/recipes?search=' + encodeURIComponent(q) + '&limit=' + SEARCH_LIMIT;
  var data = await foodashiFetch(auth.key, path);
  return mergeUnique(foodashiList(data).map(normalizeFoodashiSummary).filter(Boolean));
}

async function lookupFoodashi(env, id) {
  var auth = foodashiApiKey(env);
  if (!auth.key) throw upstreamError('Foodashi key missing', 503);
  var data = await foodashiFetch(auth.key, '/api/recipes/details?id=' + encodeURIComponent(id));
  var row = data && data.id ? data : (data && data.data) || data;
  return normalizeFoodashiDetail(row);
}

/* ---- cascade ---- */
var PROVIDERS = {
  spoonacular: { search: searchSpoonacular, lookup: lookupSpoonacular, label: 'Spoonacular' },
  foodashi: { search: searchFoodashi, lookup: lookupFoodashi, label: 'Foodashi' },
  themealdb: { search: searchMealDb, lookup: lookupMealDb, label: 'TheMealDB' }
};

function resolveSource(requested, id) {
  var s = String(requested || '').trim().toLowerCase();
  if (s === 'spoonacular' || s === 'spoon' || s === 'sp') return 'spoonacular';
  if (s === 'foodashi' || s === 'fd') return 'foodashi';
  if (s === 'themealdb' || s === 'mealdb' || s === 'tm') return 'themealdb';
  /* ids antigos / numéricos do MealDB sem source explícito */
  if (/^\d+$/.test(String(id || '')) && String(id).length <= 6) return 'themealdb';
  if (/^[0-9a-f-]{36}$/i.test(String(id || ''))) return 'foodashi';
  return '';
}

async function runCascade(env, runner) {
  var chain = recipesProviderChain(env);
  var lastErr = null;
  for (var i = 0; i < chain.length; i++) {
    var name = chain[i];
    try {
      var result = await runner(name);
      return { provider: name, result: result };
    } catch (e) {
      lastErr = e;
      /* quota/rate-limit: tenta o próximo; outros erros também caem (chave inválida etc.)
         só se ainda houver fallback — senão devolve o erro. */
      if (i < chain.length - 1) continue;
      throw e;
    }
  }
  throw lastErr || upstreamError('No recipe provider available', 503);
}

export async function proxyRecipesRequest(url, env) {
  var params = new URL(url, 'http://localhost').searchParams;
  var chain = recipesProviderChain(env);
  if (params.get('ping') === '1') {
    return {
      status: 200,
      body: JSON.stringify({
        ok: true,
        chain: chain,
        primary: chain[0],
        spoonacular: !!spoonacularApiKey(env).key,
        foodashi: !!foodashiApiKey(env).key,
        themealdb: recipesApiKey(env).source
      })
    };
  }

  var q = String(params.get('q') || params.get('search') || '').trim();
  var id = String(params.get('id') || '').trim();
  var by = String(params.get('by') || params.get('mode') || 'name').trim().toLowerCase();
  if (by === 'ing' || by === 'ingredient' || by === 'i') by = 'ingredient';
  else by = 'name';

  if (id) {
    var want = resolveSource(params.get('source'), id);
    try {
      if (want && PROVIDERS[want]) {
        var one = await PROVIDERS[want].lookup(env, id);
        return { status: 200, body: JSON.stringify({ meal: one, provider: want }) };
      }
      var looked = await runCascade(env, function (name) {
        return PROVIDERS[name].lookup(env, id);
      });
      return {
        status: 200,
        body: JSON.stringify({ meal: looked.result, provider: looked.provider })
      };
    } catch (e) {
      return {
        status: e.status || 502,
        body: JSON.stringify({ error: e.message || 'Lookup failed', detail: e.detail, quota: !!e.quota })
      };
    }
  }

  if (!q) {
    return { status: 400, body: JSON.stringify({ error: 'Missing q or id' }) };
  }

  try {
    var searched = await runCascade(env, function (name) {
      return PROVIDERS[name].search(env, q, by);
    });
    return {
      status: 200,
      body: JSON.stringify({
        results: searched.result,
        by: by,
        provider: searched.provider,
        chain: chain
      })
    };
  } catch (e) {
    return {
      status: e.status || 502,
      body: JSON.stringify({
        error: e.message || 'Search failed',
        detail: e.detail,
        quota: !!e.quota,
        chain: chain
      })
    };
  }
}
