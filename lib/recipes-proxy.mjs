/** Recipe search proxy — Spoonacular → TheMealDB. Keys stay server-side. */
const FETCH_TIMEOUT_MS = 8000;
const SEARCH_LIMIT = 24;

const MEALDB_KEY_NAMES = ['THEMEALDB_KEY', 'THEMEALDB_API_KEY', 'VITE_THEMEALDB_KEY'];
const SPOON_KEY_NAMES = ['SPOONACULAR_KEY', 'SPOONACULAR_API_KEY', 'VITE_SPOONACULAR_KEY'];
const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/';
const SPOON_BASE = 'https://api.spoonacular.com';

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

export function recipesProviderChain(env) {
  var chain = [];
  if (spoonacularApiKey(env).key) chain.push('spoonacular');
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

/* ---- cascade ---- */
var PROVIDERS = {
  spoonacular: { search: searchSpoonacular, lookup: lookupSpoonacular, label: 'Spoonacular' },
  themealdb: { search: searchMealDb, lookup: lookupMealDb, label: 'TheMealDB' }
};

function resolveSource(requested) {
  var s = String(requested || '').trim().toLowerCase();
  if (s === 'spoonacular' || s === 'spoon' || s === 'sp') return 'spoonacular';
  if (s === 'themealdb' || s === 'mealdb' || s === 'tm') return 'themealdb';
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
    var want = resolveSource(params.get('source'));
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
