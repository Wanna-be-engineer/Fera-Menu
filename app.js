/* FERA CANTEEN — Static Menu (GitHub Pages friendly)
   Data source: ./menu.json (must be valid JSON array)
*/

const TAB_CONFIG = [
  { id: 'all', label: 'All', match: (g) => true },
  { id: 'bestsellers', label: 'Bestsellers', match: (g) => g.__isBestseller === true },
  { id: 'performance', label: 'Performance Bowls', match: (g) => ['FERA Performance Bowls'].includes(g.__rawCategory) },
  { id: 'wraps', label: 'Signature Wraps', match: (g) => ['FERA Signature Wraps', 'The Warm Pita Sandwiches'].includes(g.__rawCategory) },
  { id: 'breakfast', label: 'Breakfast Classics', match: (g) => ['Canteen Breakfast Classics', 'Overnight Oats', 'The Griddle: Pancakes & French Toast', 'Saviour Smoothie Bowl'].includes(g.__rawCategory) },
  { id: 'omelette', label: 'Omelette Craft', match: (g) => ['The Omelette Craft Collection'].includes(g.__rawCategory) },
  { id: 'lite', label: 'Lite Bowls & Salads', match: (g) => ['High Protein Lite Bowl', 'Wholesome Salad Bowls'].includes(g.__rawCategory) },
  { id: 'snacks', label: 'Healthy Snacks', match: (g) => ['Snack Smart', 'Level Up Boiled Eggs', 'The Clean Sweet Series'].includes(g.__rawCategory) },
  { id: 'bevs', label: 'Beverages', match: (g) => ['FERA Wholesome Shakes', "Fera's Lemonade Crafts", 'The Chilled Caffeine Collection', 'Signature Indian Infusion Waters'].includes(g.__rawCategory) },
];

const FILTERS = [
  { id: 'highProtein', label: 'High Protein', test: (g) => g.__tags.includes('HIGH PROTEIN') },
  { id: 'lowCal', label: 'Low Calorie', test: (g) => g.__tags.includes('LOW CAL') },
  { id: 'veg', label: 'Vegetarian', test: (g) => g.__tags.includes('VEGETARIAN') },
  { id: 'egg', label: 'Egg', test: (g) => g.__tags.includes('EGG') },
  { id: 'spicy', label: 'Spicy', test: (g) => g.__tags.includes('SPICY') },
];

const state = {
  activeTab: 'all',
  activeFilters: new Set(),
  groups: [],
};

const elTabs = document.getElementById('tabs');
const elFilters = document.getElementById('filters');
const elGrid = document.getElementById('grid');
const elEmpty = document.getElementById('empty');
const elSectionTitle = document.getElementById('sectionTitle');

function fmtINR(n){
  if (n == null || Number.isNaN(n)) return '₹—';
  const v = Math.round(Number(n));
  return '₹' + v.toString('en-IN');
}
function fmt1(n){
  if (n == null || Number.isNaN(n)) return '—';
  const v = Number(n);
  return (Math.round(v*10)/10).toFixed( v % 1 === 0 ? 0 : 1 );
}

function normStr(s){
  return (s ?? '').toString().trim();
}

function deriveTags({name, allergens, protein, kcal, description}){
  const tags = [];
  const a = (allergens || '').toLowerCase();
  const n = (name || '').toLowerCase();
  const d = (description || '').toLowerCase();

  // Diet type (heuristic using allergens first)
  const hasPoultry = a.includes('poultry') || n.includes('chicken') || n.includes('kheema');
  const hasEgg = a.includes('egg') || n.includes('egg ') || n.includes('omelette');

  if (!hasPoultry && !hasEgg) tags.push('VEGETARIAN');
  if (hasEgg && !hasPoultry) tags.push('EGG');
  if (hasPoultry) tags.push('NON-VEG');

  // Macro tags
  if (protein != null && protein >= 30) tags.push('HIGH PROTEIN');
  if (kcal != null && kcal <= 350) tags.push('LOW CAL');

  // Spicy heuristic
  const spicyWords = ['thecha','spicy','chilli','chili','mirchi','peri peri','masala'];
  if (spicyWords.some(w => n.includes(w) || d.includes(w))) tags.push('SPICY');

  // Deduplicate
  return Array.from(new Set(tags));
}

function pickDefaultVariant(variants){
  const regular = variants.find(v => (v.addOn1 || '').toLowerCase() === 'regular' && !v.addOn2);
  return regular || variants[0];
}

function groupRows(rows){
  // row shape from JSON file
  const byKey = new Map();
  for (const r of rows){
    const cat = normStr(r['Category']);
    const base = normStr(r['Base Item Name']);
    if (!cat || !base) continue;

    const key = cat + '||' + base;
    if (!byKey.has(key)){
      byKey.set(key, {
        __rawCategory: cat,
        name: base,
        description: normStr(r['Description']),
        allergens: normStr(r['Allergens']),
        variants: [],
      });
    }

    const g = byKey.get(key);
    // keep the longest description (in case duplicates)
    if ((normStr(r['Description']).length) > (g.description || '').length) g.description = normStr(r['Description']);

    g.variants.push({
      addOn1: normStr(r['Add on 1']),
      addOn2: normStr(r['Add on 2']) || null,
      price: r['Offline Price'],
      protein: r['Protein (g)'],
      carbs: r['Carbs (g)'],
      fat: r['Fat (g)'],
      kcal: r['kCal'],
    });
  }

  const groups = Array.from(byKey.values());

  // Compute derived fields (default macro line + tags)
  for (const g of groups){
    g.variants.sort((a,b)=> (a.price??0)-(b.price??0));
    g.default = pickDefaultVariant(g.variants);
    g.__tags = deriveTags({
      name: g.name,
      allergens: g.allergens,
      protein: g.default?.protein,
      kcal: g.default?.kcal,
      description: g.description,
    });
  }

  // Make a simple “Bestsellers” list (heuristic, since no sales data)
  // Criteria: high protein OR popular Indian keywords + reasonable kcal, then take top 12 by (protein desc, price asc)
  const candidates = groups
    .filter(g => (g.default?.kcal ?? 9999) <= 750)
    .map(g => ({
      g,
      score: (g.default?.protein ?? 0) * 2
        + (g.__tags.includes('SPICY') ? 4 : 0)
        + (/wrap|bowl|kheema|paneer|chicken|omelette/.test(g.name.toLowerCase()) ? 3 : 0)
        - ((g.default?.kcal ?? 0) / 250),
    }))
    .sort((a,b)=> b.score - a.score)
    .slice(0, 12)
    .map(x => x.g);

  const bestsellerKeys = new Set(candidates.map(g => g.__rawCategory + '||' + g.name));
  for (const g of groups){
    g.__isBestseller = bestsellerKeys.has(g.__rawCategory + '||' + g.name);
  }

  // Sort: category order by tab config, then name
  const catRank = new Map();
  // build rank based on first tab that matches category
  for (let i=0;i<TAB_CONFIG.length;i++){
    catRank.set(TAB_CONFIG[i].id, i);
  }
  groups.sort((a,b)=>{
    // Within a given tab filter, we sort by name; global sort by category label
    return (a.__rawCategory.localeCompare(b.__rawCategory)) || (a.name.localeCompare(b.name));
  });

  return groups;
}

function renderTabs(){
  elTabs.innerHTML = '';
  for (const t of TAB_CONFIG){
    const btn = document.createElement('button');
    btn.className = 'chip' + (state.activeTab === t.id ? ' chip--active' : '');
    btn.textContent = t.label;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      state.activeTab = t.id;
      renderTabs();
      render();
    });
    elTabs.appendChild(btn);
  }
}

function renderFilters(){
  elFilters.innerHTML = '';
  for (const f of FILTERS){
    const btn = document.createElement('button');
    const active = state.activeFilters.has(f.id);
    btn.className = 'chip' + (active ? ' chip--active' : '');
    btn.textContent = f.label;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (state.activeFilters.has(f.id)) state.activeFilters.delete(f.id);
      else state.activeFilters.add(f.id);
      renderFilters();
      render();
    });
    elFilters.appendChild(btn);
  }
}

function passTab(g){
  const t = TAB_CONFIG.find(x => x.id === state.activeTab) || TAB_CONFIG[0];
  return t.match(g);
}

function passFilters(g){
  for (const id of state.activeFilters){
    const f = FILTERS.find(x => x.id === id);
    if (f && !f.test(g)) return false;
  }
  return true;
}

function macroLine(v){
  return `P—${fmt1(v.protein)}g | C—${fmt1(v.carbs)}g | F—${fmt1(v.fat)}g | ${Math.round(v.kcal ?? 0)} Kcal`;
}

function badgeHTML(tags){
  // Prefer showing the most useful tags first
  const order = ['HIGH PROTEIN','LOW CAL','VEGETARIAN','EGG','NON-VEG','SPICY'];
  const sorted = [...tags].sort((a,b)=> order.indexOf(a)-order.indexOf(b));
  return sorted.map(t => `<span class="badge">${t}</span>`).join('');
}

function renderCard(g){
  const v = g.default;
  const price = fmtINR(v?.price);
  const macros = v ? macroLine(v) : '';

  const variantsRows = g.variants.map(vr => {
    const label = vr.addOn2 ? `${vr.addOn1} + ${vr.addOn2}` : vr.addOn1;
    return `
      <tr>
        <td>${escapeHtml(label || 'Variant')}</td>
        <td class="num">${fmt1(vr.protein)}</td>
        <td class="num">${fmt1(vr.carbs)}</td>
        <td class="num">${fmt1(vr.fat)}</td>
        <td class="num">${Math.round(vr.kcal ?? 0)}</td>
        <td class="num">${fmtINR(vr.price)}</td>
      </tr>
    `;
  }).join('');

  return `
    <article class="card">
      <div class="card__top">
        <h3 class="card__name">${escapeHtml(g.name)}</h3>
        <div class="card__price">${price}</div>
      </div>

      <div class="card__desc">${escapeHtml(g.description || '')}</div>

      ${v ? `<div class="macroline" aria-label="Macros">${escapeHtml(macros)}</div>` : ''}

      <div class="badges">${badgeHTML(g.__tags)}</div>

      <details class="details">
        <summary>
          <span>Customize &amp; Macros</span>
          <span class="details__hint">Tap to expand</span>
        </summary>
        <table class="table" role="table" aria-label="Variants and macros">
          <thead>
            <tr>
              <th>Variant</th>
              <th class="num">Protein</th>
              <th class="num">Carbs</th>
              <th class="num">Fat</th>
              <th class="num">Kcal</th>
              <th class="num">Price</th>
            </tr>
          </thead>
          <tbody>
            ${variantsRows}
          </tbody>
        </table>
      </details>
    </article>
  `;
}

function escapeHtml(s){
  return (s ?? '').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function render(){
  const shown = state.groups.filter(g => passTab(g) && passFilters(g));

  // Heading
  const tab = TAB_CONFIG.find(t => t.id === state.activeTab) || TAB_CONFIG[0];
  elSectionTitle.textContent = tab.label;

  // Cards
  elGrid.innerHTML = shown.map(renderCard).join('');
  elEmpty.hidden = shown.length > 0;
}

async function init(){
  document.getElementById('year').textContent = new Date().getFullYear();

  const res = await fetch('./menu.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load menu.json');
  const rows = await res.json();

  state.groups = groupRows(rows);

  renderTabs();
  renderFilters();
  render();
}

init().catch(err => {
  console.error(err);
  elGrid.innerHTML = '';
  elEmpty.hidden = false;
  elEmpty.querySelector('.empty__title').textContent = 'Menu failed to load.';
  elEmpty.querySelector('.empty__sub').textContent = 'Check that menu.json is valid JSON and is in the same folder as index.html.';
});
