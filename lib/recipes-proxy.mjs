/** TheMealDB proxy — key stays server-side when set; defaults to free test key "1". */
const FETCH_TIMEOUT_MS = 8000;
const KEY_NAMES = ['THEMEALDB_KEY', 'THEMEALDB_API_KEY', 'VITE_THEMEALDB_KEY'];
const BASE = 'https://www.themealdb.com/api/json/v1/';

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
  var path = '';
  if (id) path = 'lookup.php?i=' + encodeURIComponent(id);
  else if (q) path = 'search.php?s=' + encodeURIComponent(q);
  else {
    return { status: 400, body: JSON.stringify({ error: 'Missing q or id' }) };
  }
  var upstream = BASE + encodeURIComponent(auth.key) + '/' + path;
  var res = await fetchWithTimeout(upstream, { headers: { Accept: 'application/json' } });
  var text = await res.text();
  var data;
  try { data = JSON.parse(text || '{}'); } catch (_) {
    return { status: 502, body: JSON.stringify({ error: 'Bad upstream JSON' }) };
  }
  if (!res.ok) {
    return { status: res.status, body: JSON.stringify({ error: 'TheMealDB error', detail: data }) };
  }
  var meals = data.meals || [];
  if (id) {
    var one = meals[0] ? normalizeMeal(meals[0]) : null;
    return { status: 200, body: JSON.stringify({ meal: one }) };
  }
  var results = meals.slice(0, 24).map(normalizeMeal).filter(Boolean);
  return { status: 200, body: JSON.stringify({ results: results }) };
}
