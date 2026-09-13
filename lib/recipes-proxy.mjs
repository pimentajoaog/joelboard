/** TheMealDB proxy — key stays server-side when set; defaults to free test key "1". */
const FETCH_TIMEOUT_MS = 8000;
const KEY_NAMES = ['THEMEALDB_KEY', 'THEMEALDB_API_KEY', 'VITE_THEMEALDB_KEY'];
const BASE = 'https://www.themealdb.com/api/json/v1/';
const SEARCH_LIMIT = 40;

function fetchWithTimeout(url, opts) {
  return fetch(url, Object.assign({}, opts || {}, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }));
}

export function recipesApiKey(env) {
  for (var i = 0; i < KEY_NAMES.length; i++) {
    var val = String((env && env[KEY_NAMES[i]]) || '').trim();
    if (val) return { key: val, source: KEY_NAMES[i] };
  }
  return { key: '1', source: 'default' };
}

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

function normalizeMeal(meal) {
  if (!meal || !meal.idMeal) return null;
  return {
    source: 'themealdb',
    sourceId: String(meal.idMeal),
    title: String(meal.strMeal || '').trim(),
    image: String(meal.strMealThumb || '').trim(),
    category: String(meal.strCategory || '').trim(),
    area: String(meal.strArea || '').trim(),
    tags: String(meal.strTags || '').trim(),
    youtube: String(meal.strYoutube || '').trim(),
    ingredients: mealIngredients(meal),
    steps: mealSteps(meal)
  };
}

/* filter.php só devolve id/nome/thumb — suficiente pra listagem; o import faz lookup. */
function normalizeSummary(meal) {
  if (!meal || !meal.idMeal) return null;
  return {
    source: 'themealdb',
    sourceId: String(meal.idMeal),
    title: String(meal.strMeal || '').trim(),
    image: String(meal.strMealThumb || '').trim(),
    category: '',
    area: '',
    tags: '',
    youtube: '',
    ingredients: [],
    steps: []
  };
}

async function fetchMeals(key, path) {
  var upstream = BASE + encodeURIComponent(key) + '/' + path;
  var res = await fetchWithTimeout(upstream, { headers: { Accept: 'application/json' } });
  var text = await res.text();
  var data;
  try { data = JSON.parse(text || '{}'); } catch (_) {
    var err = new Error('Bad upstream JSON');
    err.status = 502;
    throw err;
  }
  if (!res.ok) {
    var fail = new Error('TheMealDB error');
    fail.status = res.status;
    fail.detail = data;
    throw fail;
  }
  return Array.isArray(data.meals) ? data.meals : [];
}

/* eggs → egg, berries → berry — TheMealDB indexa o singular na maioria dos casos. */
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

function mergeSearchResults(named, filtered) {
  var seen = Object.create(null);
  var out = [];
  function push(meal, full) {
    if (!meal || !meal.idMeal) return;
    var id = String(meal.idMeal);
    if (seen[id]) return;
    seen[id] = true;
    out.push(full ? normalizeMeal(meal) : normalizeSummary(meal));
  }
  named.forEach(function (m) { push(m, true); });
  filtered.forEach(function (m) { push(m, false); });
  return out.filter(Boolean).slice(0, SEARCH_LIMIT);
}

export async function proxyRecipesRequest(url, env) {
  var auth = recipesApiKey(env);
  var params = new URL(url, 'http://localhost').searchParams;
  if (params.get('ping') === '1') {
    return {
      status: 200,
      body: JSON.stringify({ ok: true, source: auth.source })
    };
  }
  var q = String(params.get('q') || params.get('search') || '').trim();
  var id = String(params.get('id') || '').trim();
  if (id) {
    try {
      var meals = await fetchMeals(auth.key, 'lookup.php?i=' + encodeURIComponent(id));
      var one = meals[0] ? normalizeMeal(meals[0]) : null;
      return { status: 200, body: JSON.stringify({ meal: one }) };
    } catch (e) {
      return {
        status: e.status || 502,
        body: JSON.stringify({ error: e.message || 'TheMealDB error', detail: e.detail })
      };
    }
  }
  if (!q) {
    return { status: 400, body: JSON.stringify({ error: 'Missing q or id' }) };
  }

  /* Nome (search.php) + ingrediente (filter.php): "eggs" só acha 2 títulos,
     mas ~100 receitas usam ovo como ingrediente. */
  var variants = ingredientQueryVariants(q);
  try {
    var jobs = [fetchMeals(auth.key, 'search.php?s=' + encodeURIComponent(q))];
    variants.forEach(function (v) {
      jobs.push(fetchMeals(auth.key, 'filter.php?i=' + encodeURIComponent(v)));
    });
    var packs = await Promise.all(jobs);
    var named = packs[0] || [];
    var filtered = [];
    for (var i = 1; i < packs.length; i++) filtered = filtered.concat(packs[i] || []);
    var results = mergeSearchResults(named, filtered);
    return { status: 200, body: JSON.stringify({ results: results }) };
  } catch (e) {
    return {
      status: e.status || 502,
      body: JSON.stringify({ error: e.message || 'TheMealDB error', detail: e.detail })
    };
  }
}
