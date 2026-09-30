/* BuildRate TN — mobile SPA (vanilla JS, no frameworks) */
(function () {
  'use strict';

  /* Surface script errors visibly instead of a frozen screen */
  window.addEventListener('error', function (e) {
    var el = document.getElementById('fatalErr');
    if (el) { el.hidden = false; el.textContent = '⚠ Script error: ' + (e.message || 'unknown'); }
  });

  /* ---------------- safe persistence (works even in sandboxed previews) ---------------- */
  var mem = {};
  function persistGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return key in mem ? mem[key] : fallback; }
  }
  function persistSet(key, val) {
    mem[key] = val;
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }

  var state = {
    lang: persistGet('br_lang', 'en'),
    favs: persistGet('br_favs', []),          // [{type:'material'|'store', slug}]
    matFilter: { q: '', cat: 'all' },
    storeFilter: { q: '', city: 'all' },
    focusSearch: false,
    route: { view: 'home', param: null },
    builderFilter: { q: '', city: 'all', type: 'all' },
    calcMode: ['materials', 'loan', 'builderrate'].indexOf(persistGet('br_cmode', 'materials')) >= 0 ? persistGet('br_cmode', 'materials') : 'materials',
    calc: null,
    loan: null,
    quote: null
  };
  (function initLoan() {
    var l = persistGet('br_loan', null);
    if (!l || typeof l !== 'object') l = {};
    state.loan = {
      lakh: isFinite(+l.lakh) && +l.lakh >= 3 ? +l.lakh : 30,
      dp: isFinite(+l.dp) && +l.dp >= 1 && +l.dp <= 90 ? +l.dp : 20,
      rate: isFinite(+l.rate) && +l.rate > 1 && +l.rate < 30 ? +l.rate : 8.5,
      years: isFinite(+l.years) && +l.years >= 1 && +l.years <= 40 ? +l.years : 20,
      years: isFinite(+l.years) && +l.years >= 1 && +l.years <= 40 ? +l.years : 20
    };
    state.loan.prepays = Array.isArray(l.prepays) && l.prepays.length
      ? l.prepays.filter(function (p) { return p && isFinite(+p.m) && isFinite(+p.amt); })
          .map(function (p) { return { m: Math.max(1, Math.round(+p.m)), amt: Math.max(0, Math.round(+p.amt)) }; })
      : (isFinite(+l.lumpAmt) && +l.lumpAmt > 0
          ? [{ m: Math.max(0, Math.round(+l.lumpYear || 0)) * 12 + 1, amt: Math.round(+l.lumpAmt) }]
          : [{ m: 13, amt: 100000 }]);
  })();
  (function initQuote() {
    var q = persistGet('br_quote', null);
    if (!q || typeof q !== 'object') q = {};
    state.quote = {
      rate: isFinite(+q.rate) && +q.rate >= 500 && +q.rate <= 6000 ? +q.rate : 2000,
      floors: [1, 2, 3, 4].indexOf(+q.floors) >= 0 ? +q.floors : 2,
      area: isFinite(+q.area) && +q.area >= 300 && +q.area <= 10000 ? Math.round(+q.area) : 1000
    };
  })();
  state.chat = { msgs: [] };
  (function initChat() {
    var h = persistGet('br_chat', null);
    if (Array.isArray(h)) state.chat.msgs = h.slice(-40);
  })();
  state.llm = { p: 'free', key: '', model: '', url: '' };
  (function initLlm() {
    var l = persistGet('br_llm', null);
    if (l && typeof l === 'object') {
      state.llm.p = ['free', 'gemini', 'openrouter', 'groq', 'custom'].indexOf(l.p) >= 0 ? l.p : 'free';
      state.llm.key = typeof l.key === 'string' ? l.key : '';
      state.llm.model = typeof l.model === 'string' ? l.model : '';
      state.llm.url = typeof l.url === 'string' ? l.url : '';
    }
    if (!state.llm.key && state.llm.p !== 'free' && state.llm.p !== 'custom') state.llm.p = 'free';
  })();
  (function initCalc() {
    var c = persistGet('br_calc', null);
    if (!c || typeof c !== 'object') c = {};
    state.calc = {
      area: isFinite(+c.area) && +c.area >= 100 ? Math.round(+c.area) : 1000,
      tier: ['e', 's', 'p'].indexOf(c.tier) >= 0 ? c.tier : 's',
      floors: ['g', 'g1', 'g2'].indexOf(c.floors) >= 0 ? c.floors : 'g',
      wall: ['red', 'aac', 'solid'].indexOf(c.wall) >= 0 ? c.wall : 'red'
    };
  })();
  var cache = {};

  /* ---------------- i18n ---------------- */
  var I18N = {
    en: {
      tagline: 'Material prices & stores · Tamil Nadu',
      nav_home: 'Home', nav_materials: 'Materials', nav_stores: 'Stores', nav_saved: 'Saved',
      search_materials: 'Search cement, steel, sand…',
      search_stores: 'Search stores by name or city…',
      greeting: 'Vanakkam!',
      browse: 'Browse by category',
      key_rates: "Today's key rates",
      stores_strip: 'Stores across TN',
      see_all: 'See all',
      all: 'All',
      materials_count: '{n} materials · showing {m}',
      stores_count: '{n} stores · showing {m}',
      range: 'Range',
      trend8: '8-week trend',
      brands: 'Brand rates',
      about_material: 'About this material',
      available_at: 'Available at stores',
      updated: 'Updated',
      call: 'Call',
      directions: 'Directions',
      hours: 'Working hours',
      address: 'Address',
      established: 'Established',
      delivery_yes: 'Delivery available',
      stock: 'Materials stocked',
      reviews: 'reviews',
      no_results: 'No results found',
      no_results_hint: 'Try a different search or filter.',
      saved_empty_title: 'Nothing saved yet',
      saved_empty_hint: 'Tap the ♥ on any material or store to keep it here.',
      saved_materials: 'Saved materials',
      saved_stores: 'Saved stores',
      saved_builders: 'Saved builders',
      browse_materials: 'Browse materials',
      browse_stores: 'Browse stores',
      back: 'Back',
      saved_toast: 'Saved to favourites',
      unsaved_toast: 'Removed from favourites',
      disclaimer: 'Indicative rates — verify with your dealer.',
      about: 'About',
      about_title: 'About this app',
      about_p1: 'BuildRate TN shows indicative market prices of construction materials and sample store listings across Tamil Nadu.',
      about_p2: 'Rates are compiled from public market references (Sep 2026) and change daily by city, brand, grade and load size. Always confirm today\u2019s rate with your dealer before ordering.',
      about_p3: 'Store listings shown are sample data for demonstration.',
      close: 'Close',
      vs_avg: 'vs state avg',
      at_avg: 'at state avg',
      low: 'Low', high: 'High',
      error: 'Something went wrong',
      retry: 'Try again',
      not_found: 'Not found',
      nav_calc: 'Calculator',
      calc_title: 'Construction Cost Calculator',
      builtup: 'Built-up area',
      sqft_unit: 'sq.ft',
      quality: 'Quality of construction',
      economy: 'Economy',
      standard: 'Standard',
      premium: 'Premium',
      floors: 'Number of floors',
      ground: 'Ground',
      g1: 'G+1',
      g2: 'G+2',
      wallmat: 'Wall material',
      red_bricks: 'Red bricks',
      aac_blocks: 'AAC blocks',
      solid_blocks: 'Solid blocks',
      est_cost: 'Estimated material cost',
      materials_only: 'Materials only',
      breakdown: 'Material breakdown',
      per_sqft_rate: 'per sq.ft',
      calc_note1: 'Thumb-rule estimate for a standard RCC home. Excludes labour, plumbing, electricals, doors, windows and approvals.',
      calc_note2: 'For reference: typical all-in cost in Chennai (materials + labour + finishing) is ₹1,700–2,400 per sq.ft (2026 market references).',
      rates_from: 'Rates auto-filled from this app\u2019s material prices',
      home_cta: 'Estimate your build cost',
      home_cta_sub: 'Cement, steel, sand & more — instant calculator',
      u_bags: 'bags',
      u_kg: 'kg',
      u_units: 'units (100 cft)',
      u_tonnes: 'tonnes',
      u_nos: 'nos',
      u_litres: 'litres',
      u_sqft: 'sq.ft',
      u_bag: 'bag',
      u_unit: 'unit',
      u_t: 't',
      u_l: 'L',
      nav_builders: 'Builders',
      builders_title: 'Builders & Package Rates',
      search_builders: 'Search builders by name or city…',
      builders_count: '{n} builders · {m} shown',
      per_sqft_short: '/sq.ft',
      min_area: 'Min area',
      areas_served: 'Areas served',
      inclusions: "What's included",
      yrs_short: 'yrs',
      projects_short: 'projects',
      turnkey: 'Turnkey',
      type_contractor: 'Civil contractor',
      on_enquiry: 'On enquiry',
      website_btn: 'Website',
      verified_listing: 'Chennai listings compiled from public sources & company websites (Sep 2026) — verify current rates before signing',
      semi: 'Semi-turnkey',
      labour: 'Labour only',
      all_types: 'All types',
      sample_listing: 'Sample listing — verify actual rates with the builder',
      mode_materials: 'Material Estimate',
      mode_loan: 'Home Loan EMI',
      property_cost: 'Total house cost',
      in_lakhs: '₹ lakh',
      down_payment: 'Down payment',
      interest_rate: 'Interest rate (p.a.)',
      loan_tenure: 'Loan tenure',
      monthly_emi: 'Monthly EMI',
      loan_amount: 'Loan amount',
      total_interest: 'Total interest',
      total_repay: 'Total repayment',
      per_month: '/month',
      yrs: 'yrs',
      principal: 'Principal',
      interest: 'Interest',
      loan_note: 'Estimate only — actual EMI depends on your bank, CIBIL score, processing fee and eligibility. Home loan rates in India currently hover around 8.3–9.5% p.a.',
      yr: 'yr',
      mo_short: 'mo',
      orig_short: 'orig',
      prepay_title: 'Prepayment calculator',
      prepay_savings: 'Prepayment savings',
      month_no: 'Month #',
      amount_lbl: 'Amount',
      add_prepay: 'Add prepayment',
      col_prepaid: 'Prepaid',
      prepay_hint: 'Month counts from the first EMI — 13 = after 1 year, 25 = after 2 years.',
      interest_saved: 'Interest saved',
      tenure_cut: 'Tenure cut by',
      loan_closes: 'Loan closes in',
      new_total_interest: 'New total interest',
      emi_if_tenure_kept: 'EMI if tenure kept',
      yr_schedule: 'Year-wise payment schedule (with prepayment)',
      col_year: 'Year',
      col_balance: 'Balance',
      prepay_note: 'Most banks charge no prepayment fee on floating-rate home loans; fixed-rate loans may charge 2–4%. The prepayment is assumed to go fully towards principal.',
      mode_builderrate: 'Builder rate',
      quote_rate: 'Builder rate',
      quote_floors: 'Floors',
      floor_g: 'Ground',
      quote_area: 'Built-up area per floor',
      quote_totalarea: 'Total built-up area',
      quote_totalcost: 'Construction cost',
      quote_extras_title: 'Extra costs to keep aside (usually NOT in the package)',
      q_compound: 'Compound wall + gate',
      q_compound_n: '₹280–₹400 per running ft, incl. pillars & gate',
      q_eb: 'EB connection & wiring',
      q_eb_n: 'TNEB new service connection, meter, DB panel',
      q_borewell: 'Borewell + pump',
      q_borewell_n: '₹800–₹1,000 per ft in Chennai belt + ~₹25k pump',
      q_sump: 'Water sump',
      q_sump_n: '5,000–10,000 litre RCC sump',
      q_septic: 'Septic tank',
      q_septic_n: 'Septic tank + soak pit',
      q_approval: 'Plan approval & permits',
      q_approval_n: 'CMDA/DTCP approval, licensed engineer, documentation',
      q_siteworks: 'Driveway & site works',
      q_siteworks_n: 'Paving, levelling, basic landscaping',
      q_contingency: 'Contingency buffer',
      q_contingency_n: '5% of construction cost — price changes & surprises',
      quote_extras_subtotal: 'Extras subtotal',
      of_construction: 'of construction cost',
      quote_total_project: 'Total project cost',
      quote_note: 'Indicative Tamil Nadu ranges (Sep 2026). Interiors/woodwork, land cost & registration are NOT included. Some builders include sump, septic or compound wall — check exactly what your package covers.',
      ai_title: 'Ask BuildRate AI',
      ai_sub: 'Online AI · TN construction help',
      ai_placeholder: 'Ask about construction…',
      ai_cleared: 'Chat cleared — fresh start! 🗑️',
      ai_img_cap: 'AI-generated image',
      ai_img_working: '🎨 Generating your image… (takes 5–30s)',
      ai_img_busy: '⏳ Free image service is busy — retrying automatically…',
      ai_img_fail: '⚠️ Image failed — tap Retry below',
      ai_img_regen: 'Retry / new image',
      ai_img_what: "Sure, I can generate images! 🎨 Describe what you want — e.g. 'generate an image of a modern 3BHK house elevation, evening light' or '2bhk kitchen interior image'.",
      ai_greeting: "Vanakkam! 👋 I'm BuildRate AI — now ONLINE, so ask me anything like ChatGPT 🤖 For construction questions I use this app's live price data. I also generate 🖼️ images — try 'generate an image of a modern 3BHK house'. (Free online mode can be slow at busy times — add your own free Gemini key via ⚙ for faster replies.)",
      ai_fallback: "I don't know that one offline. I can help with material prices, Chennai builders, EMI & prepayment, cost estimates (try \"3BHK G+1 cost breakdown\"), thumb rules, approvals, vastu… — or tap ⚙ and add a free API key to enable Full AI, which answers anything.",
      ai_open_materials: 'Open Materials',
      ai_open_builders: 'Open Builders',
      ai_open_stores: 'Open Stores',
      ai_open_calc: 'Open Calculator',
      ai_mode_online: 'Online AI',
      ai_mode_full: 'Full AI',
      ai_mode_off: 'Offline',
      ai_llm_keytip: '(add your own free key in ⚙ for unlimited replies)',
      ai_cfg_title: 'Full AI mode (optional)',
      ai_cfg_desc: 'Default: free online AI (no key needed) — answers anything, but may be slow or rate-limited at busy times. For fast, unlimited replies paste your own free Google Gemini key (aistudio.google.com/apikey — Google account needed). Your key stays only on this device and is sent only to the provider you choose.',
      ai_cfg_key: 'API key',
      ai_cfg_model: 'Model (optional)',
      ai_cfg_url: 'API base URL',
      ai_llm_save: 'Save',
      ai_llm_clear: 'Remove key',
      ai_llm_err: 'Online AI unavailable (busy / no internet) — offline answer:'
    },
    ta: {
      tagline: 'பொருள் விலைகள் & கடைகள் · தமிழ்நாடு',
      nav_home: 'முகப்பு', nav_materials: 'பொருட்கள்', nav_stores: 'கடைகள்', nav_saved: 'சேமிப்பு',
      search_materials: 'சிமெண்ட், இரும்பு, மணல் தேடுங்கள்…',
      search_stores: 'கடை பெயர் அல்லது நகரம் தேடுங்கள்…',
      greeting: 'வணக்கம்!',
      browse: 'வகைப்படி பார்க்கவும்',
      key_rates: 'இன்றைய முக்கிய விகிதங்கள்',
      stores_strip: 'தமிழ்நாட்டு கடைகள்',
      see_all: 'அனைத்தையும் காட்டு',
      all: 'அனைத்தும்',
      materials_count: '{n} பொருட்கள் · {m} காட்டப்படுகிறது',
      stores_count: '{n} கடைகள் · {m} காட்டப்படுகிறது',
      range: 'வரம்பு',
      trend8: '8 வார போக்கு',
      brands: 'பிராண்டு விகிதங்கள்',
      about_material: 'இந்தப் பொருள் பற்றி',
      available_at: 'கடைகளில் கிடைக்கிறது',
      updated: 'புதுப்பிப்பு',
      call: 'அழைக்க',
      directions: 'வழிகாட்டி',
      hours: 'பணி நேரம்',
      address: 'முகவரி',
      established: 'நிறுவப்பட்டது',
      delivery_yes: 'டெலிவரி வசதி',
      stock: 'கிடைக்கும் பொருட்கள்',
      reviews: 'மதிப்புரைகள்',
      no_results: 'முடிவுகள் இல்லை',
      no_results_hint: 'வேறு தேடலை முயற்சிக்கவும்.',
      saved_empty_title: 'இன்னும் எதுவும் சேமிக்கப்படவில்லை',
      saved_empty_hint: 'ஏதேனும் பொருள் அல்லது கடையில் ♥ ஐ அழுத்தி இங்கே சேமிக்கவும்.',
      saved_materials: 'சேமித்த பொருட்கள்',
      saved_stores: 'சேமித்த கடைகள்',
      saved_builders: 'சேமித்த நிறுவனங்கள்',
      browse_materials: 'பொருட்களைப் பார்க்க',
      browse_stores: 'கடைகளைப் பார்க்க',
      back: 'பின்',
      saved_toast: 'பிடித்தவையில் சேமிக்கப்பட்டது',
      unsaved_toast: 'பிடித்தவையிலிருந்து நீக்கப்பட்டது',
      disclaimer: 'தோராயமான விகிதங்கள் — வியாபாரியிடம் உறுதிப்படுத்தவும்.',
      about: 'பற்றி',
      about_title: 'இந்தச் செயலி பற்றி',
      about_p1: 'BuildRate TN — தமிழ்நாட்டில் கட்டுமானப் பொருட்களின் சந்தை விலைகள் மற்றும் கடை விவரங்கள்.',
      about_p2: 'விகிதங்கள் பொதுச் சந்தை தகவல்களின் அடிப்படையில் (செப். 2026). நகரம், பிராண்டு, தரம், அளவு — இவற்றால் தினசரி மாறும். ஆர்டர் செய்வதற்கு முன் உங்கள் வியாபாரியிடம் உறுதிப்படுத்தவும்.',
      about_p3: 'காட்டப்படும் கடை விவரங்கள் மாதிரி தரவுகள் (demo).',
      close: 'மூடு',
      vs_avg: 'மாநில சராசரியுடன்',
      at_avg: 'சராசரி விலை',
      low: 'குறைந்த', high: 'அதிக',
      error: 'ஏதோ தவறு நடந்தது',
      retry: 'மீண்டும் முயற்சிக்க',
      not_found: 'கிடைக்கவில்லை',
      nav_calc: 'கணக்கீடு',
      calc_title: 'கட்டுமான செலவு கணக்கீடு',
      builtup: 'கட்டப்பட வேண்டிய பரப்பளவு',
      sqft_unit: 'சதுர அடி',
      quality: 'கட்டுமான தரம்',
      economy: 'சாதாரணம்',
      standard: 'நிலையான',
      premium: 'உயர்தரம்',
      floors: 'மாடிகளின் எண்ணிக்கை',
      ground: 'தரை தளம்',
      g1: 'G+1',
      g2: 'G+2',
      wallmat: 'சுவர் பொருள்',
      red_bricks: 'செங்கற்கள்',
      aac_blocks: 'AAC பிளாக்',
      solid_blocks: 'சிமெண்ட் பிளாக்',
      est_cost: 'மதிப்பிடப்பட்ட பொருள் செலவு',
      materials_only: 'பொருட்கள் மட்டும்',
      breakdown: 'பொருள் விவரம்',
      per_sqft_rate: 'ஒரு சதுர அடிக்கு',
      calc_note1: 'வித்திருத்த முறை (thumb-rule) அடிப்படையிலான மதிப்பீடு — நிலையான RCC வீட்டுக்கு. தொழிலாளர், குடிநீர், மின்சாரம், கதவுகள், அனுமதி கட்டணங்கள் சேர்க்கப்படவில்லை.',
      calc_note2: 'குறிப்பு: சென்னையில் மொத்த கட்டுமான செலவு (பொருள் + தொழிலாளர் + முடித்தல்) சுமார் ₹1,700–2,400 / சதுர அடி (2026 சந்தை தகவல்).',
      rates_from: 'விகிதங்கள் இந்த செயலியின் பொருள் விலைகளிலிருந்து தானாக எடுக்கப்படுகின்றன',
      home_cta: 'உங்கள் வீட்டு செலவை கணக்கிடுங்கள்',
      home_cta_sub: 'சிமெண்ட், இரும்பு, மணல் மற்றும் பல — உடனடி கணக்கீடு',
      u_bags: 'மூட்டைகள்',
      u_kg: 'கிலோ',
      u_units: 'யூனிட் (100 கன அடி)',
      u_tonnes: 'டன்',
      u_nos: 'எண்',
      u_litres: 'லிட்டர்',
      u_sqft: 'சதுர அடி',
      u_bag: 'மூட்டை',
      u_unit: 'யூனிட்',
      u_t: 'டன்',
      u_l: 'லி',
      nav_builders: 'பில்டர்கள்',
      builders_title: 'கட்டுமான நிறுவனங்கள் & விகிதங்கள்',
      search_builders: 'நிறுவனம் அல்லது நகரம் தேடுங்கள்…',
      builders_count: '{n} நிறுவனங்கள் · {m} காட்டப்படுகிறது',
      per_sqft_short: '/ச.அடி',
      min_area: 'குறைந்தபட்ச பரப்பளவு',
      areas_served: 'சேவை பகுதிகள்',
      inclusions: 'சேர்க்கப்படும் வேலைகள்',
      yrs_short: 'ஆண்டு',
      projects_short: 'திட்டங்கள்',
      turnkey: 'முழு பேக்கேஜ்',
      type_contractor: 'சிவில் ஒப்பந்ததாரர்',
      on_enquiry: 'விசாரணைக்கு',
      website_btn: 'இணையதளம்',
      verified_listing: 'சென்னை பட்டியல்கள் பொது மூலங்கள் & நிறுவன இணையதளங்களிலிருந்து (செப். 2026) — ஒப்பந்தத்திற்கு முன் உறுதிப்படுத்தவும்',
      semi: 'அரை பேக்கேஜ்',
      labour: 'வேலை மட்டும்',
      all_types: 'அனைத்து வகை',
      sample_listing: 'மாதிரி தகவல் — உண்மை விகிதத்தை நிறுவனத்திடம் உறுதிப்படுத்தவும்',
      mode_materials: 'பொருள் மதிப்பீடு',
      mode_loan: 'வீட்டுக் கடா EMI',
      property_cost: 'வீட்டின் மொத்த செலவு',
      in_lakhs: '₹ லட்சம்',
      down_payment: 'முன்பணம்',
      interest_rate: 'வட்டி விகிதம் (ஆண்டுக்கு)',
      loan_tenure: 'கடா காலம்',
      monthly_emi: 'மாதாந்திர EMI',
      loan_amount: 'கடா தொகை',
      total_interest: 'மொத்த வட்டி',
      total_repay: 'மொத்த திருப்புத் தொகை',
      per_month: '/மாதம்',
      yrs: 'ஆண்டு',
      principal: 'அசல்',
      interest: 'வட்டி',
      loan_note: 'மதிப்பீடு மட்டும் — உண்மை EMI வங்கி, CIBIL மதிப்பெண், செயலாக்க கட்டணம் பொறுத்தது. இந்தியாவில் வீட்டுக் கடா வட்டி தற்போது சுமார் 8.3–9.5% ஆண்டுக்கு.',
      yr: 'ஆண்டு',
      mo_short: 'மாத',
      orig_short: 'முதலில்',
      prepay_title: 'முன்செலுத்தல் கணக்கீடு',
      prepay_savings: 'முன்செலுத்தல் சேமிப்பு',
      month_no: 'மாத எண்',
      amount_lbl: 'தொகை',
      add_prepay: 'முன்செலுத்தல் சேர்',
      col_prepaid: 'முன்செலுத்தல்',
      prepay_hint: 'மாத எண் முதல் EMI-இலிருந்து எண்ணப்படும் — 13 = 1 ஆண்டுக்குப் பிறகு, 25 = 2 ஆண்டுகளுக்குப் பிறகு.',
      interest_saved: 'வட்டி சேமிப்பு',
      tenure_cut: 'காலம் குறையும் அளவு',
      loan_closes: 'கடா முடிவடையும் காலம்',
      new_total_interest: 'புதிய மொத்த வட்டி',
      emi_if_tenure_kept: 'காலம் மாறாமல் இருந்தால் EMI',
      yr_schedule: 'ஆண்டுவாரி பணமுடக்க அட்டவணை (முன்செலுத்தலுடன்)',
      col_year: 'ஆண்டு',
      col_balance: 'மீதத் தொகை',
      prepay_note: 'மித வட்டி (floating) வீட்டுக் கடாக்களில் பெரும்பாலான வங்கிகள் முன்செலுத்தல் கட்டணம் வசூலிப்பதில்லை; நிலை வட்டி (fixed) கடாக்களில் 2–4% வரை இருக்கலாம். முன்செலுத்தப்படும் தொகை முழுவதும் அசலில் சேர்க்கப்படும் என்று கருதப்படுகிறது.',
      mode_builderrate: 'பில்டர் ரேட்',
      quote_rate: 'பில்டர் விகிதம்',
      quote_floors: 'தளங்கள்',
      floor_g: 'தரை தளம்',
      quote_area: 'ஒரு தளத்தின் கட்டும் பரப்பு',
      quote_totalarea: 'மொத்த கட்டும் பரப்பு',
      quote_totalcost: 'கட்டுமான செலவு',
      quote_extras_title: 'தனியாக வைத்திருக்க வேண்டிய கூடுதல் செலவுகள் (பேக்கேஜில் வராதவை)',
      q_compound: 'சுற்றுசுவர் + வாசல் கதவு',
      q_compound_n: 'ஒரு அடிக்கு ₹280–₹400, தூண்கள் & கதவு உட்பட',
      q_eb: 'மின் இணைப்பு & கம்பியிடுதல்',
      q_eb_n: 'TNEB புதிய இணைப்பு, மீட்டர், DB பேனல்',
      q_borewell: 'கிணறு + மோட்டார்',
      q_borewell_n: 'சென்னையில் ஒரு அடிக்கு ₹800–₹1,000 + மோட்டார் ~₹25k',
      q_sump: 'தண்ணீர் சம்ப்',
      q_sump_n: '5,000–10,000 லிட்டர் RCC சம்ப்',
      q_septic: 'செப்டிக் டேங்க்',
      q_septic_n: 'செப்டிக் டேங்க் + சோக் பிட்',
      q_approval: 'வரைபட ஒப்புதல் & அனுமதிகள்',
      q_approval_n: 'CMDA/DTCP ஒப்புதல், உரிமம் பெற்ற பொறியாளர், ஆவணங்கள்',
      q_siteworks: 'வாகன பாதை & தள வேலைகள்',
      q_siteworks_n: 'ஓடு போடுதல், சமப்படுத்துதல், எளிய தோட்ட வேலை',
      q_contingency: 'கூடுதல் பாதுகாப்பு தொகை',
      q_contingency_n: 'கட்டுமான செலவில் 5% — விலை ஏற்ற இறக்கம் & எதிர்பாராதவை',
      quote_extras_subtotal: 'கூடுதல் செலவு மொத்தம்',
      of_construction: 'கட்டுமான செலவில்',
      quote_total_project: 'மொத்த திட்டச் செலவு',
      quote_note: 'தமிழ்நாட்டு சராசரி வகைப்பாடுகள் (செப். 2026). இன்டீரியர்/மர வேலை, நில விலை & பதிவுக் கட்டணம் சேர்க்கப்படவில்லை. சில பில்டர்கள் சம்ப், செப்டிக், சுற்றுசுவரையும் பேக்கேஜில் சேர்ப்பார்கள் — உங்கள் ஒப்பந்தத்தில் சரிபார்க்கவும்.',
      ai_title: 'BuildRate AI',
      ai_sub: 'ஆன்லைன் AI · கட்டுமான உதவி',
      ai_placeholder: 'கட்டுமானம் பற்றி கேளுங்கள்…',
      ai_cleared: 'அரட்டை அழிக்கப்பட்டது — புதிதாக தொடங்கலாம்! 🗑️',
      ai_img_cap: 'AI உருவாக்கிய படம்',
      ai_img_working: '🎨 படம் உருவாக்கப்படுகிறது… (5–30 விநாடி)',
      ai_img_busy: '⏳ இலவச படம் சேவை நெருக்கடியில் — தானாக மீண்டும் முயற்சிக்கிறது…',
      ai_img_fail: '⚠️ படம் தோல்வி — கீழே Retry அழுத்தவும்',
      ai_img_regen: 'மீண்டும் முயற்சி / புது படம்',
      ai_img_what: 'நான் படங்கள் உருவாக்க முடியும்! 🎨 என்ன வேண்டும் என விவரிக்கவும் — உதா: "அழகிய 3BHK வீட்டின் படம் உருவாக்கு", "2bhk சமையலறை இன்டீரியர் படம்".',
      ai_greeting: 'வணக்கம்! 👋 நான் BuildRate AI — இப்போது ஆன்லைன்! ChatGPT மாதிரி எதையும் கேளுங்கள் 🤖 கட்டுமான கேள்விகளுக்கு ஆப்பின் நேரடி விலை தரவை பயன்படுத்துவேன். 🖼️ படங்களும் உருவாக்குவேன் — "அழகிய 3BHK வீட்டின் படம் உருவாக்கு" எனக் கேளுங்கள். (இலவச ஆன்லைன் முறை சில நேரம் மெதுவாக இருக்கலாம் — ⚙-இல் இலவச Gemini கீ சேர்த்தால் வேகமாக இருக்கும்.)',
      ai_fallback: 'இதற்கு ஆஃப்லைனில் எனக்குத் தெரியாது. பொருள் விலைகள், சென்னை பில்டர்கள், EMI & முன்செலுத்தல், செலவு மதிப்பீடு ("3BHK G+1 செலவு"), தம்புல் ரூல், ஒப்புதல், வாஸ்து பற்றி கேளுங்கள் — அல்லது ⚙ அழுத்தி இலவச API கீ சேர்த்து முழு AI முறையை இயக்குங்கள் (எதற்கும் பதில் தரும்).',
      ai_open_materials: 'பொருட்களைத் திற',
      ai_open_builders: 'பில்டர்களைத் திற',
      ai_open_stores: 'கடைகளைத் திற',
      ai_open_calc: 'கால்குலேட்டரைத் திற',
      ai_mode_online: 'ஆன்லைன் AI',
      ai_mode_full: 'முழு AI',
      ai_mode_off: 'ஆஃப்லைன்',
      ai_llm_keytip: '(வேகமான பதிலுக்கு ⚙-இல் இலவச கீ சேர்க்கலாம்)',
      ai_cfg_title: 'முழு AI முறை (விருப்பம்)',
      ai_cfg_desc: 'இலவச API கீவை ஒட்டினால் எந்தக் கேள்விக்கும் பதில் தர முடியும் — கட்டுமானம் மட்டும் அல்ல. Google Gemini கீ இலவசம் (aistudio.google.com/apikey, Google கணக்கு தேவை). உங்கள் கீ இந்த சாதனத்தில் மட்டுமே சேமிக்கப்படும்.',
      ai_cfg_key: 'API கீ',
      ai_cfg_model: 'மாடல் (விருப்பம்)',
      ai_cfg_url: 'API அடிப்படை URL',
      ai_llm_save: 'சேமி',
      ai_llm_clear: 'கீவை நீக்கு',
      ai_llm_err: 'ஆன்லைன் AI கிடைக்கவில்லை (நெருக்கடி / இணையம் இல்லை) — ஆஃப்லைன் பதில்:'
    }
  };
  function t(key, n, m) {
    var s = (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
    if (typeof n === 'number') s = s.replace('{n}', n).replace('{m}', m);
    return s;
  }

  /* ---------------- icons ---------------- */
  function ico(inner, vb) {
    return '<svg viewBox="' + (vb || '0 0 24 24') + '" aria-hidden="true">' + inner + '</svg>';
  }
  var ICONS = {
    cement: ico('<path d="M6.5 8.5h11L16.3 20H7.7L6.5 8.5z"/><path d="M9 8.5c0-2 1-4 3-4s3 2 3 4"/>'),
    steel: ico('<path d="M7 19V5"/><path d="M12 19V5"/><path d="M17 19V5"/>'),
    sand: ico('<path d="M2.5 18.5c3.5-6.5 6.5-9.5 9.5-9.5s6 3 9.5 9.5"/><path d="M2.5 18.5h19"/>'),
    aggregates: ico('<circle cx="8.5" cy="15" r="3.5"/><circle cx="15.8" cy="9.5" r="2.7"/><circle cx="16.8" cy="16.5" r="2.2"/>'),
    'bricks-blocks': ico('<rect x="3.5" y="5" width="7.7" height="4.2"/><rect x="12.8" y="5" width="7.7" height="4.2"/><rect x="8.2" y="10.9" width="7.7" height="4.2"/><rect x="3.5" y="16.8" width="7.7" height="4.2"/><rect x="12.8" y="16.8" width="7.7" height="4.2"/>'),
    tiles: ico('<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>'),
    paint: ico('<path d="M5.5 8.5h13L17 19.5H7L5.5 8.5z"/><path d="M12 3.5v2"/><path d="M9 12.5c0 1.5 1.5 2 1.5 3.5"/>'),
    plumbing: ico('<path d="M13 2.5 6.5 13H11l-1 8.5L17.5 10H13l1-7.5z"/>'),
    search: ico('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
    star: ico('<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5z"/>'),
    heart: ico('<path d="M12 20s-7-4.5-9-8.5C1.5 8.5 3.5 5 7 5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.5 0 5.5 3.5 4 6.5-2 4-9 8.5-9 8.5z"/>'),
    phone: ico('<path d="M5 4h4l1.5 4.5L8 10.5c1 2.5 3 4.5 5.5 5.5l2-2.5L20 15v4c0 .5-.5 1-1 1C10.5 19.5 4.5 13.5 4 5c0-.5.5-1 1-1z"/>'),
    pin: ico('<path d="M12 21s-6.5-5.5-6.5-11a6.5 6.5 0 0 1 13 0c0 5.5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    clock: ico('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>'),
    truck: ico('<path d="M2.5 6.5h11V16h-11z"/><path d="M13.5 10h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>'),
    back: ico('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
    info: ico('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 7.7v.5"/>'),
    store: ico('<path d="M4 7 3 11v9h5v-6h8v6h5v-9l-1-4H4z"/><path d="M4 7h16"/><path d="M9 11h6"/>'),
    box: ico('<path d="M21 8 12 3 3 8l9 5 9-5v8l-9 5-9-5V8"/>'),
    chart: ico('<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 14 4-4 3 3 5-6"/>'),
    ruppee: ico('<path d="M7 4h10"/><path d="M7 8.5h10"/><path d="M7 4c6 0 7 4.5 0 4.5 6 0 8 4.5-1 4.5l6 6.5"/>'),
    calc: ico('<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 7.5h6"/><path d="M9 12h.1M12 12h.1M15 12h.1M9 15h.1M12 15h.1M15 15h.1"/><path d="M9 18h6"/>')
  };

  /* ---------------- helpers ---------------- */
  var main = document.getElementById('view');
  var updaters = {};  // per-view list refreshers (keep search input focus intact)
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) {
    var frac = (n % 1 !== 0) ? 1 : 0;
    return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: frac }).format(n);
  }
  function fmtRange(lo, hi) { return fmt(lo) + '–' + fmt(hi); }
  function badge(pct, cls) {
    var c = 'badge ' + (cls || '');
    if (pct > 0) return '<span class="' + c + ' up">▲ ' + pct.toFixed(1) + '%</span>';
    if (pct < 0) return '<span class="' + c + ' down">▼ ' + Math.abs(pct).toFixed(1) + '%</span>';
    return '<span class="' + c + ' flat">— 0%</span>';
  }
  function deltaBadge(pct) {
    if (pct > 0) return '<span class="badge up">+' + pct.toFixed(1) + '%</span>';
    if (pct < 0) return '<span class="badge down">' + pct.toFixed(1) + '%</span>';
    return '<span class="badge flat">' + esc(t('at_avg')) + '</span>';
  }
  function catIcon(id) { return ICONS[id] || ICONS.box; }
  function catLabel(id, meta) {
    var cs = (meta && meta.categories) || [];
    for (var i = 0; i < cs.length; i++) if (cs[i].id === id) return cs[i];
    return { name: id, name_ta: id };
  }
  function localDate() {
    try {
      return new Date().toLocaleDateString(state.lang === 'ta' ? 'ta-IN' : 'en-IN',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return new Date().toDateString(); }
  }
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.hidden = true; }, 1600);
  }

  /* ---------------- api ---------------- */
  function api(path) {
    var base = path.split('?')[0];
    // Standalone (offline) mode: data embedded in the page itself
    if (window.BR_DATA && window.BR_DATA[base]) {
      return Promise.resolve(window.BR_DATA[base]);
    }
    if (cache[path]) return cache[path];
    cache[path] = fetch(path).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function (e) {
      delete cache[path];
      throw e;
    });
    return cache[path];
  }

  /* ---------------- favourites ---------------- */
  function isFav(type, slug) {
    return state.favs.some(function (f) { return f.type === type && f.slug === slug; });
  }
  function toggleFav(type, slug) {
    var i = state.favs.findIndex(function (f) { return f.type === type && f.slug === slug; });
    if (i >= 0) { state.favs.splice(i, 1); toast(t('unsaved_toast')); }
    else { state.favs.push({ type: type, slug: slug }); toast(t('saved_toast')); }
    persistSet('br_favs', state.favs);
  }

  /* ---------------- BuildRate AI (offline assistant) ---------------- */
  var AI_KB = [
    { k: ['which cement', 'best cement', 'cement type', 'cement difference', 'opc', 'ppc', 'சிறந்த சிமெண்ட்', 'சிமெண்ட் வகை', 'எந்த சிமெண்ட்'],
      en: "**OPC 53** sets faster — ideal for RCC (footings, columns, beams, slabs). **PPC** (fly-ash) gives better long-term durability, less heat — good for plastering & masonry. Either is fine for a home; use one brand throughout and buy fresh stock (made within 2–3 months).",
      ta: "**OPC 53** விரைவாக பிடிக்கும் — அடித்தளம், தூண், விளிம்பு, சில்லு RCC வேலைகளுக்கு சிறந்தது. **PPC** (ப்ளை-ஆஷ்) நீடித்த தன்மை கொண்டது — பூச்சு & செங்கல் வேலைக்கு ஏற்றது. ஒரே பிராண்டை முழு வேலைக்கும் பயன்படுத்துங்கள்; 2–3 மாதத்திற்குள் தயாரிக்கப்பட்ட புதிய சிமெண்டை வாங்குங்கள்." },
    { k: ['cement bags', 'how many bags', 'bags per', 'எத்தனை மூட்டை', 'மூட்டை சிமெண்ட்', 'சிமெண்ட் அளவு'],
      en: "Thumb rule: a standard RCC home needs about **0.4 cement bags per sq.ft** of built-up area — a 1,000 sq.ft house ≈ **400 bags** (structure + plaster + flooring). For item-wise quantities open **Calc → Material Estimate**.",
      ta: "தம்புல் ரூல்: சாதாரண RCC வீட்டுக்கு **ஒரு சதுர அடிக்கு ~0.4 மூட்டை** சிமெண்ட் — 1,000 சதுர அடி வீட்டுக்கு ~**400 மூட்டை**. பொருள் வாரியான துல்லிய கணக்குக்கு **Calculator → Material Estimate** பாருங்கள்." },
    { k: ['steel per', 'kg per sqft', 'how much steel', 'steel quantity', 'இரும்பு அளவு', 'எவ்வளவு இரும்பு', 'சதுர அடிக்கு இரும்பு'],
      en: "Thumb rule for residential RCC (up to G+2): **3.5–4 kg steel per sq.ft** of built-up area. A 1,000 sq.ft house ≈ **3.5–4 tonnes** of TMT. High-rise or heavy designs need more.",
      ta: "வீட்டு RCC கட்டுமானத்திற்கு (G+2 வரை): **ஒரு சதுர அடிக்கு 3.5–4 கிலோ** TMT இரும்பு. 1,000 சதுர அடி வீட்டுக்கு ~**3.5–4 டன்**. பெரிய கட்டிடங்களுக்கு இன்னும் தேவை." },
    { k: ['fe500', 'fe550', 'steel grade', 'tmt grade', 'இரும்பு கிரேடு', 'tmt வகை'],
      en: "**Fe500D** is the sweet spot for homes — 'D' = higher ductility (bends without cracking), important for earthquake safety. Fe550 is stronger but less ductile; use only if your engineer specifies it.",
      ta: "வீடுகளுக்கு **Fe500D** சிறந்த தேர்வு — 'D' என்பது நன்றாக வளையக்கூடிய தன்மை (நிலநடுக்க பாதுகாப்புக்கு முக்கியம்). Fe550 வலிமை அதிகம் ஆனால் வளையும் தன்மை குறைவு." },
    { k: ['m-sand', 'msand', 'p-sand', 'river sand', 'which sand', 'எந்த மணல்', 'மணல் வித்தியாசம்', 'மணல் வகை'],
      en: "**M-sand** is for concrete (RCC, blocks). **P-sand** is finer — for plastering. River sand is scarce & costlier in TN; M-sand is today's standard. Check silt content (<5%) before accepting a load.",
      ta: "**M-மணல்** கான்கிரீட் வேலைக்கு (RCC, பிளாக்). **P-மணல்** நுணுக்கமானது — பூச்சு வேலைக்கு. ஆற்று மணல் TN-ல் அரிது & விலை அதிகம்; இன்று M-மணலே நிலையான தேர்வு. ஏற்றும்போது சில்ட் அளவு (<5%) சரிபார்க்கவும்." },
    { k: ['20mm', '12mm', 'jelly size', 'aggregate size', 'blue metal', 'ஜெல்லி அளவு', 'கூழாங்கல் அளவு'],
      en: "**20mm jelly** for slabs, columns & mass concrete. **12mm** where reinforcement is tight (thin beams). Wash off dust/mud before use — dirty aggregate weakens concrete.",
      ta: "சில்லு, தூண், பெரிய கான்கிரீட்டுக்கு **20mm ஜெல்லி**. இரும்பு இறுக்கமான இடங்களில் **12mm**. பயன்படுத்தும் முன் கழுவுங்கள் — அசுத்த ஜெல்லி கான்கிரீட்டை பலவீனப்படுத்தும்." },
    { k: ['m20', 'm25', 'concrete grade', 'mix ratio', 'proportion', 'கான்கிரீட் கிரேடு', 'மிக்ஸ் ரேஷியோ'],
      en: "**M20** (≈1:1.5:3 cement:sand:jelly) is the common minimum for house RCC. **M25** for heavier loads. For slabs prefer design-mix (RMC) over hand-mixed nominal ratios — consistency matters more than grade.",
      ta: "வீட்டு RCC-க்கு **M20** (≈1:1.5:3) வழக்கமான குறைந்தபட்ச கிரேடு. அதிக சுமைக்கு **M25**. சில்லுக்கு கை மிக்ஸை விட RMC (design-mix) நல்லது — சீரான தரமே முக்கியம்." },
    { k: ['curing', 'cure', 'how long', 'நீர் ஊற்ற', 'க்யூரிங்', 'எத்தனை நாள் தண்ணீர்'],
      en: "Cure concrete **minimum 7 days (14 better)** — keep the surface wet, starting within 8–12 hrs of casting. Plaster needs ~7 days. In hot weather cure morning + evening; skipping curing is the #1 cause of cracks.",
      ta: "கான்கிரீட்டுக்கு **குறைந்தது 7 நாட்கள் (14 சிறந்தது)** தண்ணீர் ஊற்றவும் — வார்த்த 8–12 மணி நேரத்தில் தொடங்கவும். பூச்சுக்கு ~7 நாட்கள். வெயிலில் காலை+மாலை ஊற்றுங்கள் — சரியாக ஊற்றாததே விரிசலின் முக்கிய காரணம்." },
    { k: ['aac', 'red brick', 'solid block', 'which brick', 'brick vs', 'செங்கல்', 'ஆக் பிளாக்', 'பிளாக் சுவர்', 'எந்த செங்கல்'],
      en: "**Red brick**: traditional, strong, heavier structure. **AAC block**: light — faster masonry, less structural load, better heat/sound insulation, but costs more & needs skilled finishing. **Solid concrete block**: strong middle option for load-bearing walls.",
      ta: "**செங்கல்**: பாரம்பரியம், வலிமையானது, கட்டமைப்பு கனம். **AAC பிளாக்**: இலகுரகம் — வேகமான கட்டுமானம், குறைந்த சுமை, வெப்பம்/ஒலி கட்டுப்பாடு; விலை கூடுதல். **சாலிட் பிளாக்**: சுமை தாங்கும் சுவருக்கு நல்ல இடைப்பட்ட தேர்வு." },
    { k: ['foundation', 'footing', 'pile', 'soil test', 'அடித்தளம்', 'மண் பரிசோதனை', 'பைலிங்'],
      en: "For G+2 on normal soil, **isolated/spread footings** are standard. Loose sand, clay or high water table → **pile foundation** (costlier). Get a **soil test first (₹5k–15k)** — it decides the foundation type and can save lakhs.",
      ta: "சாதாரண மண்ணில் G+2 வீடுகளுக்கு **தனித்தனி அடித்தளம் (isolated footing)** வழக்கம். நெகிழ் மண் / அதிக நீர்மட்டம் → **பைல் அடித்தளம்** (செலவு அதிகம்). முதலில் **மண் பரிசோதனை (₹5–15 ஆயிரம்)** செய்யுங்கள் — அடித்தள வகையை அது தீர்மானிக்கும்." },
    { k: ['stages', 'steps to build', 'construction process', 'order of construction', 'கட்டும் வரிசை', 'கட்டுமான படிகள்', 'எப்படி கட்டுவது'],
      en: "Typical order: **1** soil test & plan approval → **2** excavation & anti-termite → **3** footings, columns to plinth → **4** backfill & plinth beam → **5** columns & roof slab → **6** brickwork → **7** electrical/plumbing conduiting → **8** plaster → **9** waterproofing, flooring, tiles → **10** paint, fittings, handover.",
      ta: "வழக்கமான வரிசை: **1** மண் பரிசோதனை & ஒப்புதல் → **2** அகழ்வு & கரையான் மருந்து → **3** அடித்தளம், தூண் → **4** மண் நிரப்பு & plinth beam → **5** தூண் & சில்லு → **6** செங்கல் வேலை → **7** மின்/குழாய் → **8** பூச்சு → **9** நீர்ப்புகாப்பு, தரை, ஓடு → **10** பெயிண்ட், ஒப்படைப்பு." },
    { k: ['cmda', 'dtcp', 'approval', 'permit', 'ஒப்புதல்', 'அனுமதி', 'பட்டா'],
      en: "You need **CMDA** (Chennai metro) or **DTCP** (rest of TN) plan approval BEFORE construction: licensed engineer drawings + patta & parent documents → apply → fees → permit. Budget **₹80k–1.5L** incl. professional fees. Unapproved buildings risk fines, demolition & loan refusal.",
      ta: "கட்டுமானத்திற்கு முன் **CMDA** (சென்னை) அல்லது **DTCP** (மற்ற TN பகுதிகள்) ஒப்புதல் கட்டாயம்: உரிமம் பெற்ற பொறியாளர் வரைபடம் + பட்டா & ஆவணங்கள் → விண்ணப்பம் → கட்டணம் → அனுமதி. **₹80 ஆயிரம்–1.5 லட்சம்** ஒதுக்குங்கள். ஒப்புதல் இல்லை என்றால் அபராதம்/இடிப்பு அபாயம் + கடா மறுப்பு." },
    { k: ['fsi', 'far', 'plot coverage', 'setback', 'எஃப்எஸ்ஐ', 'செட்பேக்', 'இட விட்டு'],
      en: "**FSI** = allowed built-up ÷ plot area. Typical TN residential: **1.5–2** (varies by road width & zone). 2,400 sq.ft plot × 1.5 → 3,600 sq.ft built-up allowed. Setbacks (open space on all sides) are mandatory and not counted in FSI.",
      ta: "**FSI** = அனுமதிக்கப்படும் கட்டும் பரப்பு ÷ மனை பரப்பு. TN வீடுகளுக்கு **1.5–2** (சாலை அகலம் & மண்டலம் பொறுத்து மாறும்). 2,400 சதுர அடி மனை × 1.5 = 3,600 சதுர அடி. சுற்றிலும் விட வேண்டிய இடைவெளி (setback) கட்டாயம் — அது FSI-ல் சேராது." },
    { k: ['vastu', 'vasthu', 'வாஸ்து'],
      en: "Popular vastu points: entrance East/North, kitchen South-East, master bedroom South-West, pooja North-East; avoid toilets in North-East. It's belief-based — most builders offer vastu-compliant plans. Structural safety, light & ventilation matter more.",
      ta: "பிரபல வாஸ்து குறிப்புகள்: வாசல் கிழக்கு/வடக்கு, சமையலறை தென்கிழக்கு, முதன்மை படுக்கையறை தென்மேற்கு, பூஜை வடகிழக்கு; குளியலறை வடகிழக்கு தவிர்க்கவும். நம்பிக்கை சார்ந்தது — கட்டமைப்பு பாதுகாப்பும் காற்று/வெளிச்சமும் முக்கியம்." },
    { k: ['sump', 'septic', 'சம்ப்', 'செப்டிக்', 'தண்ணீர் டேங்க்'],
      en: "**Water sump**: 5,000–10,000 L suits a family. **Septic tank**: ~2–3 m³ for 4–6 people + soak pit; keep away from borewell/sump & accessible for cleaning. Budget ₹50–80k (sump) and ₹40–70k (septic).",
      ta: "**தண்ணீர் சம்ப்**: குடும்பத்திற்கு 5,000–10,000 லிட்டர். **செப்டிக் டேங்க்**: 4–6 பேருக்கு ~2–3 m³ + சோக் பிட்; கிணறு/சம்ப்பிலிருந்து தூரம், சுத்தம் செய்ய வசதி. சம்ப் ₹50–80 ஆயிரம், செப்டிக் ₹40–70 ஆயிரம்." },
    { k: ['borewell', 'bore well', 'கிணறு', 'போர்வெல்', 'நிலத்தடி நீர்'],
      en: "Chennai belt: expect **300–800 ft** depth (deeper towards OMR side). Cost **₹800–1,000/ft** + submersible pump ~₹25k. Drill near/after monsoon for a true yield reading; test water quality before designing plumbing.",
      ta: "சென்னை பகுதியில் **300–800 அடி** ஆழம் எதிர்பார்க்கலாம் (OMR பக்கம் அதிகம்). **அடிக்கு ₹800–1,000** + மோட்டார் ~₹25 ஆயிரம். மழைக்காலம் நெருங்கும்போது அடித்தால் உண்மையான நீர் அளவு தெரியும்; தண்ணீர் தரத்தை பரிசோதிக்கவும்." },
    { k: ['monsoon', 'rain', 'rainy', 'மழைக்கால', 'மழையில்'],
      en: "Monsoon construction: keep cement on a raised dry platform, cover fresh concrete from rain for the first 12–24 hrs, never cast slabs in heavy rain, dewater foundation pits, cover unfinished brick tops.",
      ta: "மழைக்கால கட்டுமானம்: சிமெண்டை உயர்த்தப்பட்ட உலர் மேடையில் வைக்கவும், புதிய கான்கிரீட்டை முதல் 12–24 மணி நேரம் மூடவும், பெருமழையில் சில்லு வார்க்க வேண்டாம், அடித்தள குழியில் தண்ணீரை வெளியேற்றவும்." },
    { k: ['tile', 'vitrified', 'ceramic', 'ஓடு', 'ஃப்ளோரிங்', 'டைல்'],
      en: "**Vitrified** — strong, low porosity: living & bedrooms (600×600 / 800×800). **Ceramic** — cheaper: bathrooms/kitchens. Always **anti-skid** for bathrooms & balconies. Buy 5–10% extra for cuts; check all boxes are the same lot/shade.",
      ta: "**விட்ரிஃபைட்** — வலிமையானது: வரவறை/படுக்கையறை (600×600, 800×800). **சிராமிக்** — மலிவானது: குளியலறை/சமையலறை. குளியலறை/பால்கனிக்கு **ஆன்டி-ஸ்கிட்** கட்டாயம். 5–10% கூடுதல் வாங்கவும்; ஒரே லொட்/ஷேடு என சரிபார்க்கவும்." },
    { k: ['paint', 'emulsion', 'primer', 'பெயிண்ட்', 'வர்ணம்', 'வீடு பெயிண்ட்'],
      en: "Standard flow: putty (level) → **primer** → 2 coats **emulsion**. 1 litre covers ~110–130 sq.ft per coat. **Enamel** for wood & metal. Washable premium emulsions survive Chennai humidity better.",
      ta: "வழக்கமான வரிசை: புட்டி → **ப்ரைமர்** → 2 கோட் **எமல்ஷன்**. ஒரு லிட்டர் ஒரு கோட்டுக்கு ~110–130 சதுர அடி. மரம் & இரும்புக்கு **எனாமல்**. வாஷபிள் எமல்ஷன் ஈரப்பதத்தை தாங்கும்." },
    { k: ['waterproof', 'leak', 'terrace', 'நீர்ப்புகா', 'கசிவு', 'மேல்மாட'],
      en: "Terrace: brick-bat coba or acrylic/polyurethane coating over a proper slope (1:100) — before monsoon. Bathrooms: polymer waterproofing below tiles. Budget **₹60–120/sq.ft**. Always do the ponding test on a new terrace.",
      ta: "மேல்மாடம்: சரிவுடன் (1:100) brick-bat coba அல்லது அக்ரிலிக்/பாலியுரிதீன் — மழைக்கு முன். குளியலறை: ஓடுக்கு கீழே பாலிமர் நீர்ப்புகாப்பு. **₹60–120/சதுர அடி**. புதிய மேல்மாடத்தில் நீர் நிரப்பி சோதனை கட்டாயம்." },
    { k: ['termite', 'white ant', 'கரையான்', 'எறும்பு'],
      en: "Do **anti-termite soil treatment** at foundation & plinth stage (chlorpyrifos-based) — ~₹5k–10k for a house. Repeat if mud tubes appear on walls. Treat wooden frames before fixing.",
      ta: "அடித்தள & plinth நிலையில் **கரையான் மருந்து** (குளோர்பைரிஃபாஸ்) — ~₹5–10 ஆயிரம். சுவரில் சேற்று குழாய் தென்பட்டால் மீண்டும் செய்யவும். மர ஜன்னல்/கதவை பொருத்தும் முன் மருந்து தடவவும்." },
    { k: ['rmc', 'ready mix', 'ready-mix', 'site mix', 'ரெடி மிக்ஸ்'],
      en: "**RMC** gives consistent designed concrete — best for slabs; needs road access for the pump (~₹5–8k extra). Site mix is cheaper & fine for footings/plinth if batching is disciplined — measure, don't eyeball.",
      ta: "**RMC** சீரான தரமான கான்கிரீட் — சில்லுக்கு சிறந்தது; பம்புக்கு வாகன வசதி வேண்டும் (~₹5–8 ஆயிரம் கூடுதல்). அளவு துல்லியமாக இருந்தால் அடித்தளத்திற்கு சைட் மிக்ஸ் போதும்." },
    { k: ['turnkey', 'labour contract', 'labour only', 'package type', 'ஒப்பந்த வகை', 'லேபர்', 'துர்ன்கீ'],
      en: "**Turnkey** — builder handles materials + labour: Chennai **₹1,550–2,500/sq.ft**. **Labour-only** — you buy materials, pay **₹350–450/sq.ft** for labour: cheaper but needs your time & knowledge. The Builders tab lists 32 real Chennai firms with rates.",
      ta: "**துர்ன்கீ** — பில்டர் பொருள் + வேலையாட்கள்: சென்னையில் **₹1,550–2,500/சதுர அடி**. **லேபர் மட்டும்** — பொருட்கள் நீங்கள், வேலைக்கு **₹350–450/சதுர அடி**: செலவு குறைவு ஆனால் உங்கள் நேரம் தேவை. Builders தாவலில் 32 உண்மையான சென்னை நிறுவனங்கள்." },
    { k: ['verify builder', 'choose builder', 'check builder', 'builder fraud', 'trust builder', 'பில்டர் தேர்வு', 'நம்பக', 'பில்டர் ஏமாற்ற'],
      en: "Checklist: visit 2–3 completed projects & talk to owners; written agreement with material specs & stage payments; advance <10%; retention 5–10% till handover; never pay cash without receipt; search the builder's name + 'review' online.",
      ta: "சரிபார்ப்பு: 2–3 முடிந்த திட்டங்களுக்கு சென்று உரிமையாளர்களிடம் பேசுங்கள்; பொருள் விவரம் + நிலைவாரி பணம் உள்ள எழுத்துப்படி; முன்பணம் <10%; ஒப்படைப்பு வரை 5–10% நிறுத்தி வைக்கவும்; ரசீது இல்லாமல் பணம் கொடுக்க வேண்டாம்." }
  ];

  var AI_CATS = [
    { words: ['cement', 'சிமெண்ட'], cat: 'cement' },
    { words: ['steel', 'iron', 'tmt', 'sari', 'இரும்பு', 'ஸ்டீல்'], cat: 'steel' },
    { words: ['sand', 'மணல்'], cat: 'sand' },
    { words: ['jelly', 'aggregate', 'gravel', 'ஜெல்லி', 'கூழாங்கல்'], cat: 'aggregates' },
    { words: ['brick', 'block', 'aac', 'செங்கல்', 'பிளாக்'], cat: 'bricks-blocks' },
    { words: ['tile', 'டைல்', 'ஓடு'], cat: 'tiles' },
    { words: ['paint', 'பெயிண்ட்', 'வர்ணம்'], cat: 'paint' },
    { words: ['plumb', 'pipe', 'குழாய்'], cat: 'plumbing' }
  ];
  var AI_PRICE_WORDS = ['price', 'rate', 'cost', 'how much', 'today', 'current', 'விலை', 'எவ்வளவு', 'இன்று'];

  function aiAnswer(qRaw, mats, builders, stores) {
    var q = ' ' + qRaw.toLowerCase().replace(/[.,?!;:'"()\[\]]/g, ' ').replace(/\s+/g, ' ') + ' ';
    var lang = /[\u0B80-\u0BFF]/.test(qRaw) ? 'ta' : state.lang;
    var L = function (en, ta) { return lang === 'ta' ? ta : en; };
    var has = function (arr) { for (var i = 0; i < arr.length; i++) if (q.indexOf(arr[i]) >= 0) return true; return false; };
    var wc = q.trim() ? q.trim().split(' ').length : 0;

    // greeting
    if (['hi ', 'hello', 'hey ', 'hai ', 'vanakkam', 'வணக்கம்', 'good morning', 'good evening'].some(function (w) { return q.indexOf(w) === 1; })) {
      return { text: L('Vanakkam! 👋 Ask me anything about construction — prices, builders, EMI, thumb rules, approvals, vastu…', 'வணக்கம்! 👋 கட்டுமானம் பற்றி எதையும் கேளுங்கள் — விலைகள், பில்டர்கள், EMI, தம்புல் ரூல், ஒப்புதல், வாஸ்து…') };
    }

    // material price lookup
    var catHit = null;
    AI_CATS.forEach(function (c) { if (!catHit && has(c.words)) catHit = c; });
    if (catHit && (has(AI_PRICE_WORDS) || wc <= 3)) {
      var list = (mats || []).filter(function (m) { return m.category === catHit.cat; });
      if (list.length) {
        var lines = list.slice(0, 4).map(function (m) {
          var nm = lang === 'ta' ? m.name_ta : m.name;
          var arrow = m.change_pct > 0 ? '▲' : (m.change_pct < 0 ? '▼' : '—');
          return '**' + nm + '** — ' + fmt(m.price_avg) + ' / ' + (lang === 'ta' ? m.unit_ta : m.unit) +
            '  (' + fmt(m.price_low) + '–' + fmt(m.price_high) + ', ' + arrow + Math.abs(m.change_pct) + '%)';
        }).join('\n');
        var tip = catHit.cat === 'cement' ? '\n\n' + L('Thumb rule: ~0.4 bags per sq.ft for a standard RCC home.', 'தம்புல் ரூல்: ஒரு சதுர அடிக்கு ~0.4 மூட்டை.')
          : catHit.cat === 'steel' ? '\n\n' + L('Thumb rule: 3.5–4 kg per sq.ft of built-up area.', 'தம்புல் ரூல்: ஒரு சதுர அடிக்கு 3.5–4 கிலோ.')
          : '';
        return {
          text: L('Current average rates (Sep 2026 update):\n', 'தற்போதைய சராசரி விலைகள் (செப். 2026):\n') + lines + tip + '\n\n' + L('Verify with your dealer before ordering.', 'ஆர்டர் செய்யும் முன் டீலரிடம் உறுதிப்படுத்தவும்.'),
          acts: [{ label: t('ai_open_materials'), hash: '#/materials' }]
        };
      }
    }

    // builders
    if (has(['builder', 'contractor', 'construction company', 'construction firm', 'பில்டர்', 'ஒப்பந்ததாரர்'])) {
      var pool = (builders || []).filter(function (b) { return b.city === 'Chennai' && !b.sample; });
      var withRate = pool.filter(function (b) { return b.rate; });
      var cheap = has(['cheap', 'cheapest', 'low', 'மலிவு', 'மலிவான', 'குறைந்த விலை']);
      var best = has(['best', 'top', 'good', 'சிறந்த', 'நல்ல']);
      var sorted = cheap ? withRate.slice().sort(function (a, b) { return a.rate - b.rate; })
        : best ? pool.slice().sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); })
        : withRate.slice().sort(function (a, b) { return a.rate - b.rate; });
      if (sorted.length) {
        var bl = sorted.slice(0, 3).map(function (b) {
          return '**' + b.name + '** — ' + (best && b.rating ? '★' + b.rating + (b.projects != null ? ' · ' + b.projects + ' projects' : '') : '₹' + qfmt(b.rate, 0) + '/sq.ft');
        }).join('\n');
        return {
          text: L('32 real Chennai-area builders are in the app (compiled from company websites & directories, Sep 2026).\n', 'ஆப்பில் 32 உண்மையான சென்னை பில்டர்கள் உள்ளனர் (நிறுவன தளங்கள் & டைரக்டரிகளிலிருந்து, செப். 2026).\n') +
            (cheap || !best ? L('Lowest published rates:\n', 'குறைந்த விலையில் வெளியிடப்பட்டவை:\n') : L('Top rated:\n', 'சிறந்த மதிப்பீடு:\n')) + bl +
            '\n\n' + L('Tap below for phones, websites & inclusions.', 'போன், இணையதளம் & விவரங்களுக்கு கீழே அழுத்துங்கள்.'),
          acts: [{ label: t('ai_open_builders'), hash: '#/builders' }]
        };
      }
    }

    // stores
    if (has(['store', 'shop', 'dealer', 'where to buy', 'கடை', 'எங்கே வாங்க'])) {
      var cities = [];
      (stores || []).forEach(function (s) { if (cities.indexOf(s.city) < 0) cities.push(s.city); });
      return {
        text: L('The app lists ' + (stores || []).length + ' building-material stores across ' + cities.length + ' TN cities: ' + cities.join(', ') + '. Open the Stores tab to browse by city.', 'ஆப்பில் ' + cities.length + ' நகரங்களில் ' + (stores || []).length + ' கட்டுமான பொருள் கடைகள் உள்ளன: ' + cities.join(', ') + '. நகரவாரியாக பார்க்க Stores தாவலை திறக்கவும்.'),
        acts: [{ label: t('ai_open_stores'), hash: '#/stores' }]
      };
    }

    // EMI
    if (has(['emi', 'loan', 'home loan', 'கடா', 'தவணை'])) {
      var lm = qRaw.match(/(\d+(?:\.\d+)?)\s*(?:l\b|lakhs?|லட்சம்|லட்ச)/i);
      if (lm) {
        var costL = +lm[1], costV = costL * 100000;
        var dpp = state.loan.dp || 20, rte = state.loan.rate || 8.5, yrs = state.loan.years || 20;
        var loanV = costV * (1 - dpp / 100), rr = rte / 1200, nn = yrs * 12, ff = Math.pow(1 + rr, nn);
        var emiV = loanV * rr * ff / (ff - 1);
        return {
          text: L('For a ₹' + costL + 'L home at ' + dpp + '% down, ' + rte + '% p.a., ' + yrs + '-yr tenure:\n**Loan:** ' + fmt(Math.round(loanV)) + '\n**EMI:** ' + fmt(Math.round(emiV)) + '/month\n**Total interest:** ' + fmt(Math.round(emiV * nn - loanV)) + '\n\nPrepay even ₹1L early and you save ~₹3.6L interest — the Loan calculator shows full prepayment math.',
            '₹' + costL + 'L வீட்டிற்கு ' + dpp + '% முன்பணம், ' + rte + '% வட்டி, ' + yrs + ' ஆண்டு காலம்:\n**கடா:** ' + fmt(Math.round(loanV)) + '\n**EMI:** ' + fmt(Math.round(emiV)) + '/மாதம்\n**மொத்த வட்டி:** ' + fmt(Math.round(emiV * nn - loanV)) + '\n\nசீக்கிரம் ₹1L முன்செலுத்தினால் ~₹3.6L வட்டி சேமிப்பு — முழு விவரம் Loan கால்குலேட்டரில்.'),
          acts: [{ label: t('ai_open_calc'), hash: '#/calc' }]
        };
      }
      return {
        text: L('EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1), where r = rate/1200 and n = months. Example: ₹24L loan @ 8.5% for 20 yrs → **₹20,828/month**. Tell me "EMI for 40 lakhs" for a quick number, or open the Loan calculator for full prepayment analysis.', 'EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1), r = வட்டி/1200, n = மாதங்கள். உதா: ₹24L கடா @ 8.5%, 20 ஆண்டு → **₹20,828/மாதம்**. "40 லட்சத்திற்கு EMI" என கேளுங்கள், அல்லது முழு முன்செலுத்தல் கணக்குக்கு Loan கால்குலேட்டரைத் திறங்கள்.'),
        acts: [{ label: t('ai_open_calc'), hash: '#/calc' }]
      };
    }

    // BHK / duplex home cost with breakdown
    var bhkM = qRaw.match(/([1-5])\s*-?\s*bhk/i);
    var dplx = /duplex|டூப்ளக்ஸ்|டூப்ளெக்ஸ்/.test(qRaw.toLowerCase());
    if ((bhkM || dplx) && !has(['vastu', 'vasthu', 'வாஸ்து', 'floor plan', 'plan only'])) {
      var bhk = bhkM ? +bhkM[1] : 3;
      var BHK_AREA = { 1: [450, 650], 2: [750, 1100], 3: [1150, 1600], 4: [1600, 2200], 5: [2000, 2600] };
      var flm2 = qRaw.match(/g\s*\+\s*(\d)/i);
      var floors2 = flm2 ? +flm2[1] + 1 : (dplx ? 2 : 1);
      var sqm2 = qRaw.match(/(\d{3,5})\s*(?:sq|square|சதுர)/i);
      var lo2, hi2;
      if (sqm2) { lo2 = hi2 = Math.min(+sqm2[1], 100000); }
      else { var rng2 = BHK_AREA[bhk] || BHK_AREA[3]; lo2 = rng2[0]; hi2 = rng2[1]; }
      var mid2 = Math.round((lo2 + hi2) / 2);
      var flLbl = floors2 === 1 ? L('ground-only', 'தரை தளம் மட்டும்') : (flm2 ? flm2[0].toUpperCase() : 'G+1') + ' ' + L('duplex', 'டூப்ளக்ஸ்');
      var head;
      if (sqm2) head = L('For a ' + bhk + 'BHK ' + flLbl + ' of ' + lo2.toLocaleString('en-IN') + ' sq.ft', bhk + 'BHK ' + flLbl + ' — ' + lo2.toLocaleString('en-IN') + ' சதுர அடி');
      else head = L('A ' + bhk + 'BHK ' + flLbl + ' is typically ' + lo2.toLocaleString('en-IN') + '–' + hi2.toLocaleString('en-IN') + ' sq.ft total built-up', bhk + 'BHK ' + flLbl + ' வீடு பொதுவாக ' + lo2.toLocaleString('en-IN') + '–' + hi2.toLocaleString('en-IN') + ' சதுர அடி மொத்த பரப்பளவு');
      var matRows = '';
      var matTot = 0;
      try {
        var est2 = calcEstimate(mats, { area: mid2, tier: 's', floors: floors2 > 1 ? 'g1' : 'g', wall: 'red' });
        matTot = est2.total;
        matRows = est2.rows.slice(0, 5).map(function (r) {
          return '• ' + (lang === 'ta' ? r.m.name_ta : r.m.name) + ' — ' + r.qtyLabel + ' ≈ ' + fmt(Math.round(r.cost));
        }).join('\n');
      } catch (e) { matTot = mid2 * 800; matRows = ''; }
      var labour = Math.round(mid2 * 450);
      var turnMid = 2000 * mid2;
      var rest = Math.max(0, turnMid - matTot - labour);
      return {
        text: head + '. ' + L('At Chennai turnkey rates ₹1,800–2,500/sq.ft (Sep 2026):', 'சென்னை துர்ன்கீ விகிதம் ₹1,800–2,500/சதுர அடி (செப். 2026):') + '\n' +
          '**' + L('Total', 'மொத்தம்') + ': ' + fmt(1800 * lo2) + ' – ' + fmt(2500 * hi2) + '**  (≈' + fmt(turnMid) + ' ' + L('at ₹2,000/sq.ft mid', 'சராசரி ₹2,000/சதுர அடியில்') + ')\n\n' +
          L('Where the money goes (≈' + mid2.toLocaleString('en-IN') + ' sq.ft, standard quality):', 'பணம் எங்கே செல்கிறது (≈' + mid2.toLocaleString('en-IN') + ' சதுர அடி, சாதாரண தரம்):') + '\n' +
          (matRows ? L('**Materials ≈ ' + fmt(Math.round(matTot)) + '**\n' + matRows + '\n', '**பொருட்கள் ≈ ' + fmt(Math.round(matTot)) + '**\n' + matRows + '\n') : '') +
          '**' + L('Labour ≈ ' + fmt(labour), 'வேலையாட்கள் ≈ ' + fmt(labour)) + '** (' + L('₹450/sq.ft', '₹450/சதுர அடி') + ')\n' +
          '**' + L('Finishes, supervision & margin ≈ ' + fmt(rest), 'முடித்தல் வேலை, மேற்பார்வை & லாபம் ≈ ' + fmt(rest)) + '**\n\n' +
          L('Plus keep-aside extras (usually outside the package): compound wall ₹1.2–2.2L, EB ₹40–80k, borewell ₹1–1.8L, water sump ₹50–80k, septic ₹40–70k, approvals ₹80k–1.5L + 5% contingency.', 'மேலும் தனியாக வைக்க வேண்டியவை (பேக்கேஜில் வராதவை): சுற்றுசுவர் ₹1.2–2.2L, EB ₹40–80 ஆயிரம், கிணறு ₹1–1.8L, சம்ப் ₹50–80 ஆயிரம், செப்டிக் ₹40–70 ஆயிரம், ஒப்புதல் ₹80 ஆயிரம்–1.5L + 5% காப்புத்தொகை.') + '\n' +
          L('Full budget with your exact rate: Calc → Builder rate.', 'உங்கள் விகிதத்துடன் முழு பட்ஜெட்: Calculator → Builder rate.'),
        acts: [{ label: t('ai_open_calc'), hash: '#/calc' }, { label: t('ai_open_builders'), hash: '#/builders' }]
      };
    }

    // build cost estimate
    if (has(['sqft', 'sq ft', 'sq. ft', 'square feet', 'square foot', 'சதுர அடி']) &&
        !catHit && has(['build', 'house', 'home', 'construct', 'cost', 'price', 'estimate', 'கட்ட', 'வீடு', 'செலவு', 'விலை', 'எவ்வளவு'])) {
      var anm = qRaw.match(/(\d{3,5})/);
      if (anm && !has(['bag', 'bags', 'kg', 'மூட்டை', 'கிலோ'])) {
        var area = Math.min(+anm[1], 100000);
        var flm = qRaw.match(/g\s*\+\s*(\d)/i);
        var floors = flm ? +flm[1] + 1 : 1;
        var totA = area * floors;
        var rtm = qRaw.match(/(?:@|rate\s*|₹\s*)(1[5-9]\d{2}|2[0-5]\d{2})/i);
        if (rtm) {
          var c = +rtm[1] * totA;
          return { text: L('At ₹' + rtm[1] + '/sq.ft, a ' + totA.toLocaleString('en-IN') + ' sq.ft (' + (flm ? flm[0].toUpperCase() : 'Ground') + ') home costs **' + fmt(c) + '** — plus ~15–25% site extras (compound wall, EB, borewell, sump, septic, approvals). The Builder-rate mode gives the full budget.', '₹' + rtm[1] + '/சதுர அடியில், ' + totA.toLocaleString('en-IN') + ' சதுர அடி வீட்டுக்கு **' + fmt(c) + '** — மேலும் ~15–25% தள செலவுகள் (சுற்றுசுவர், EB, கிணறு, சம்ப், செப்டிக், ஒப்புதல்). முழு பட்ஜெட் Builder-rate முறையில்.'), acts: [{ label: t('ai_open_calc'), hash: '#/calc' }] };
        }
        return {
          text: L('Chennai turnkey rates run **₹1,800–2,500/sq.ft**, so a ' + totA.toLocaleString('en-IN') + ' sq.ft ' + (flm ? flm[0].toUpperCase() : 'ground-only') + ' home costs roughly **' + fmt(1800 * totA) + ' – ' + fmt(2500 * totA) + '**.\n\nAdd ~15–25% for site extras (compound wall, EB, borewell, sump, septic, approvals). Use the Builder-rate mode with your exact quote for the full budget.',
            'சென்னை துர்ன்கீ விகிதம் **₹1,800–2,500/சதுர அடி** — ' + totA.toLocaleString('en-IN') + ' சதுர அடி வீட்டுக்கு தோராயமாக **' + fmt(1800 * totA) + ' – ' + fmt(2500 * totA) + '**.\n\nதள செலவுகளுக்கு ~15–25% கூடுதல். உங்கள் சரியான விகிதத்துடன் Builder-rate முறையை பயன்படுத்துங்கள்.'),
          acts: [{ label: t('ai_open_calc'), hash: '#/calc' }]
        };
      }
    }

    // knowledge base
    var bestKb = null, bestScore = 0;
    AI_KB.forEach(function (e) {
      var s = 0;
      e.k.forEach(function (w) { if (q.indexOf(w) >= 0) s += w.length > 6 ? 2 : 1; });
      if (s > bestScore) { bestScore = s; bestKb = e; }
    });
    if (bestKb) return { text: L(bestKb.en, bestKb.ta) };

    return { text: t('ai_fallback'), acts: [
      { label: t('ai_open_materials'), hash: '#/materials' },
      { label: t('ai_open_builders'), hash: '#/builders' },
      { label: t('ai_open_calc'), hash: '#/calc' }
    ] };
  }

  /* ---- Full AI mode (cloud LLM, user-provided key) ---- */
  var LLM_PRESETS = {
    free: { url: 'https://text.pollinations.ai/openai', model: 'openai' },
    gemini: { url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash' },
    openrouter: { url: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    groq: { url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' }
  };

  function llmAvailable() {
    return state.llm.p === 'free' || !!(state.llm && state.llm.key);
  }

  function llmSystem(mats, builders) {
    var matLines = (mats || []).slice(0, 31).map(function (m) {
      return '- ' + m.name + ': ₹' + m.price_avg + '/' + m.unit + ' (range ₹' + m.price_low + '-' + m.price_high + ', ' + (m.change_pct >= 0 ? '+' : '') + m.change_pct + '% this week)';
    }).join('\n');
    var b = (builders || []).filter(function (x) { return x.city === 'Chennai' && !x.sample && x.rate; });
    var cheap = b.slice().sort(function (a, c) { return a.rate - c.rate; }).slice(0, 4)
      .map(function (x) { return x.name + ' ₹' + x.rate + '/sq.ft'; }).join(', ');
    return 'You are BuildRate AI, a friendly expert construction & home-building assistant inside the BuildRate TN app (Tamil Nadu, India). Today is Sep 2026.\n' +
      'Rules: Answer in the same language the user writes (English or Tamil — mirror their mix). Use ₹ with Indian comma grouping (₹27,50,000 or 27.5 lakh). Be practical and specific to Tamil Nadu. When estimating costs, state assumptions (area, rate/sq.ft) and give ranges. Structure longer answers with short headers or bullets. You may answer any topic, but construction/home context is your specialty.\n\n' +
      'App data snapshot (indicative, Sep 2026):\n' +
      '- Chennai turnkey builders: ₹1,550-2,500/sq.ft. Lowest published: ' + (cheap || 'GPM ₹1,550') + '. Premium: Urban Space ₹2,499, buildAhome ₹2,299, Brick&Bolt ₹2,150.\n' +
      '- Zone rates/sq.ft: central Chennai 2,600-3,200; south Chennai 2,300-2,700; OMR/ECR 2,400-2,900; peripheral DTCP (Guduvanchery/Sriperumbudur/Avadi/Chengalpattu) 1,900-2,300. Labour-only contracts: ₹350-450/sq.ft.\n' +
      '- Material prices (Tamil Nadu averages):\n' + (matLines || '- cement ₹420/50kg bag, TMT steel ~₹75/kg, M-sand ~₹1,350/unit') + '\n' +
      '- Thumb rules: cement ~0.4 bags/sq.ft; steel 3.5-4 kg/sq.ft; 1,000 sq.ft house ≈ 400 cement bags, 3.5-4 T steel.\n' +
      '- Site extras usually OUTSIDE builder packages: compound wall ₹1.2-2.2L, EB connection ₹40-80k, borewell ₹1-1.8L, water sump ₹50-80k, septic ₹40-70k, CMDA/DTCP approvals ₹80k-1.5L; keep 5% contingency.\n' +
      '- Home loans ~8.3-9.5% p.a. now; EMI example: ₹24L @8.5%, 20yrs → ₹20,828/month.\n' +
      'The app contains: Materials price tracker, Stores, Builders directory (32 real Chennai firms with phones/websites), Calculator (material estimate, builder-rate budget with extras, loan EMI + prepayment schedule). Never invent phone numbers or builder names — refer users to the Builders tab for contacts.';
  }

  function llmChat(q, mats, builders) {
    var cfg = state.llm;
    var preset = LLM_PRESETS[cfg.p] || LLM_PRESETS.free;
    var model = (cfg.model || preset.model).trim();
    var base = (cfg.p === 'custom' && cfg.url ? cfg.url : preset.url).replace(/\/+$/, '');
    var sys = llmSystem(mats, builders);
    var hist = state.chat.msgs.filter(function (m) { return m.t && m.r; }).slice(-9, -1).map(function (m) {
      return { r: m.r, t: m.t };
    });
    if (cfg.p === 'gemini') {
      var contents = hist.concat([{ r: 'u', t: q }]).map(function (m) {
        return { role: m.r === 'u' ? 'user' : 'model', parts: [{ text: m.t }] };
      });
      return fetch(base + '/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(cfg.key.trim()), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: contents, generationConfig: { temperature: 0.4, maxOutputTokens: 1400 } })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j.error) throw new Error(j.error.message || 'API error');
        var txt = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts
          ? j.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('') : '';
        if (!txt) throw new Error('empty response');
        return txt;
      });
    }
    // OpenAI-compatible (free online / OpenRouter / Groq / custom)
    var msgs = [{ role: 'system', content: sys }]
      .concat(hist.map(function (m) { return { role: m.r === 'u' ? 'user' : 'assistant', content: m.t }; }))
      .concat([{ role: 'user', content: q }]);
    var endpoint = cfg.p === 'free' ? preset.url : base + '/chat/completions';
    var headers = { 'Content-Type': 'application/json' };
    if (cfg.p !== 'free') headers['Authorization'] = 'Bearer ' + cfg.key.trim();
    var body = JSON.stringify({ model: model, temperature: 0.4, max_tokens: 1400, messages: msgs });
    function attempt(n) {
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, cfg.p === 'free' ? 45000 : 40000) : null;
      return fetch(endpoint, {
        method: 'POST', headers: headers, signal: ctrl ? ctrl.signal : undefined, body: body
      }).then(function (r) {
        if (cfg.p === 'free' && (r.status === 402 || r.status === 429 || r.status >= 500) && n < 2) {
          // free tier is momentarily busy — wait and retry once
          return new Promise(function (res) { setTimeout(res, 7000); }).then(function () {
            if (timer) clearTimeout(timer);
            return attempt(n + 1);
          });
        }
        return r.json();
      }).then(function (j) {
        if (timer) clearTimeout(timer);
        if (j.error) throw new Error(j.error.message || 'API error');
        var txt = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (!txt) throw new Error('empty response');
        return txt;
      }).catch(function (e) {
        if (timer) clearTimeout(timer);
        throw e;
      });
    }
    return attempt(1);
  }

  function aiStatusRender() {
    var el = document.getElementById('aiStatus');
    if (!el) return;
    var on = llmAvailable();
    el.className = 'aiStatus' + (on ? ' on' : '');
    el.textContent = '● ' + (on ? (state.llm.p === 'free' ? t('ai_mode_online') : t('ai_mode_full')) : t('ai_mode_off'));
  }

  function aiCfgRender() {
    var panel = document.getElementById('aiCfg');
    if (!panel) return;
    var provs = [['free', 'Online (free, no key)'], ['gemini', 'Google Gemini'], ['openrouter', 'OpenRouter'], ['groq', 'Groq'], ['custom', 'Custom (OpenAI-compatible)']];
    var preset = LLM_PRESETS[state.llm.p] || LLM_PRESETS.free;
    panel.innerHTML =
      '<div class="aiCfgCard">' +
      '<h3>⚙️ ' + esc(t('ai_cfg_title')) + '</h3>' +
      '<p class="aiCfgDesc">' + esc(t('ai_cfg_desc')) + '</p>' +
      '<label class="plabel">' + esc(t('ai_cfg_key')) + '</label>' +
      '<input id="llmKey" class="aiCfgInput" type="password" autocomplete="off" placeholder="AIza… / sk-or-… / gsk_…" value="' + esc(state.llm.key) + '">' +
      '<label class="plabel" style="margin-top:10px">' + esc('Provider') + '</label>' +
      '<div class="chiprow">' + provs.map(function (p) {
        return '<button class="chip' + (state.llm.p === p[0] ? ' active' : '') + '" data-action="llm-prov" data-val="' + p[0] + '">' + esc(p[1]) + '</button>';
      }).join('') + '</div>' +
      '<label class="plabel" style="margin-top:10px">' + esc(t('ai_cfg_model')) + '</label>' +
      '<input id="llmModel" class="aiCfgInput" type="text" placeholder="' + esc(preset.model) + '" value="' + esc(state.llm.model) + '">' +
      (state.llm.p === 'custom'
        ? '<label class="plabel" style="margin-top:10px">' + esc(t('ai_cfg_url')) + '</label>' +
          '<input id="llmUrl" class="aiCfgInput" type="text" placeholder="https://…/v1" value="' + esc(state.llm.url) + '">'
        : '<p class="aiCfgUrl">' + esc(preset.url) + '</p>') +
      '<div class="aiCfgBtns">' +
      '<button class="btn primary" data-action="llm-save">' + esc(t('ai_llm_save')) + '</button>' +
      (state.llm.key ? '<button class="btn dark" data-action="llm-clear">' + esc(t('ai_llm_clear')) + '</button>' : '') +
      '<button class="btn dark" data-action="chat-cfg">' + esc(t('close')) + '</button></div>' +
      '<p class="aiCfgHint">🔗 aistudio.google.com/apikey — free Gemini key</p>' +
      '</div>';
  }

  function chatFmt(s) {
    var e = esc(s);
    e = e.replace(/^#{1,4}\s*(.+)$/gm, '<b>$1</b>');
    e = e.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    e = e.replace(/^\s*[-*]\s+/gm, '• ');
    e = e.replace(/\n/g, '<br>');
    return e;
  }

  // image load handlers (inline attributes need globals) — auto-retry beats the free tier's ~1/min window
  window.brImgOk = function (el) {
    var w = el.parentNode;
    w.classList.add('ok'); w.classList.remove('bad');
    el.dataset.tries = '0';
  };
  window.brImgErr = function (el) {
    var n = +(el.dataset.tries || 0);
    if (n >= 4) { el.parentNode.classList.add('bad'); return; }
    el.dataset.tries = String(n + 1);
    var w = el.parentNode;
    w.classList.remove('bad');
    var cap = w.querySelector('.imgLoad');
    if (cap && window.brImgBusyTxt) cap.textContent = window.brImgBusyTxt;
    setTimeout(function () {
      el.src = el.src.split('&_r=')[0] + '&_r=' + Date.now();
    }, [15000, 30000, 45000, 60000][n]);
  };

  function chatRender() {
    var body = document.getElementById('chatBody');
    if (!body) return;
    window.brImgBusyTxt = t('ai_img_busy');
    body.innerHTML = state.chat.msgs.map(function (m) {
      var imgHtml = m.img ? '<div class="imgWrap"><img class="msgImg" src="' + esc(m.img) + '" alt="' + esc(m.imgq || 'AI image') + '"' +
        ' onload="brImgOk(this)" onerror="brImgErr(this)">' +
        '<div class="imgLoad">' + esc(t('ai_img_working')) + '</div>' +
        '<div class="imgErr">' + esc(t('ai_img_fail')) + '</div></div>' +
        '<button class="chip imgRegen" data-action="img-regen" data-iid="' + esc(m.iid || '') + '">🔄 ' + esc(t('ai_img_regen')) + '</button>' : '';
      return '<div class="msg ' + (m.r === 'u' ? 'msgU' : 'msgA') + '"><div class="bubble">' + m.h + imgHtml + '</div>' +
        (m.a && m.a.length ? '<div class="msgActs">' + m.a.map(function (x) {
          return '<button class="chip" data-action="chat-act" data-hash="' + esc(x.hash) + '">' + esc(x.label) + '</button>';
        }).join('') + '</div>' : '') + '</div>';
    }).join('');
    body.scrollTop = body.scrollHeight;
  }

  function chatSuggRender() {
    var el = document.getElementById('chatSugg');
    if (!el) return;
    var ta = state.lang === 'ta';
    var sugg = ta
      ? [['இன்றைய சிமெண்ட் விலை', 'சிமெண்ட் விலை என்ன'], ['மலிவான சென்னை பில்டர்கள்', 'சென்னையில் மலிவான பில்டர்கள்'], ['சதுர அடிக்கு இரும்பு விலை', 'சதுர அடிக்கு இரும்பு விலை'], ['30 லட்சம் கடா EMI', '30 லட்சம் கடா EMI'], ['🖼️ 2BHK வீட்டு படம்', 'அழகிய 2bhk வீட்டின் படம் உருவாக்கு']]
      : [['Cement price today', 'cement price today'], ['Cheapest Chennai builders', 'cheapest builders in chennai'], ['How much steel per sqft', 'how much steel per sqft'], ['EMI for 30 lakhs', 'emi for 30 lakhs'], ['🖼️ 2BHK house image', 'generate an image of a modern 2BHK house elevation']];
    el.innerHTML = sugg.map(function (s) {
      return '<button class="chip" data-action="chat-sugg" data-q="' + esc(s[1]) + '">' + esc(s[0]) + '</button>';
    }).join('');
  }

  // ---------- AI image generation (free, no key) ----------
  function imgUrl(p, seed) {
    return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(p) +
      '?width=768&height=576&nologo=true&model=flux&seed=' + seed;
  }

  function imgDetect(q) {
    var hit = /\b(image|images|picture|pictures|photo|photos|pic|pics|sketch|drawing|draw)\b/i.test(q) ||
      /(படம்|படங்கள்|புகைப்படம்|புகைப்படங்கள்|வரைவு|வரையுங்கள்|வரைத்து)/.test(q);
    if (!hit) return null;
    var p = q
      .replace(/\b(please|kindly|can you|could you|for me)\b/gi, ' ')
      .replace(/\b(generate|create|make|draw|show|give|send|design)\s+(me\s+)?(an?\s+)?(image|picture|photo|pic|sketch|drawing)s?\s*(of|for|showing|:)?\s*/gi, ' ')
      .replace(/\b(image|picture|photo|pic|sketch|drawing)s?\s+(of|for)\b/gi, ' ')
      .replace(/\b(image|picture|photo|pic|sketch|drawing)s?\b/gi, ' ')
      .replace(/\bdraw\b/gi, ' ')
      .replace(/(படம்|படங்கள்|புகைப்படம்|புகைப்படங்கள்|வரைவு|வரைபடம்|வரையுங்கள்|வரைத்து)/g, ' ')
      .replace(/(காட்டுங்கள்|காட்டு|தாருங்கள்|வேண்டும்|உருவாக்குங்கள்|உருவாக்கு|செய்து\s*தாருங்கள்|எனக்கு|ஒரு|தயவுசெய்து)/g, ' ')
      .replace(/\s+/g, ' ').trim();
    return { prompt: p, raw: q };
  }

  function chatImage(req) {
    function push(prompt, seed) {
      state.chat.msgs.pop();
      state.chat.msgs.push({
        r: 'a',
        h: chatFmt('🎨 ' + t('ai_img_cap') + '\n\n**' + prompt + '**'),
        t: '🎨 ' + t('ai_img_cap') + ': ' + prompt,
        img: imgUrl(prompt, seed), imgq: prompt,
        iid: 'iw' + Date.now() + Math.floor(Math.random() * 999)
      });
      persistSet('br_chat', state.chat.msgs);
      chatRender();
    }
    if (!req.prompt) {
      state.chat.msgs.pop();
      var w = t('ai_img_what');
      state.chat.msgs.push({ r: 'a', h: chatFmt(w), t: w });
      persistSet('br_chat', state.chat.msgs);
      chatRender();
      return;
    }
    var seed = Math.floor(Math.random() * 1e6);
    if (/[\u0B80-\u0BFF]/.test(req.prompt)) {
      // Tamil prompt: ask the free text AI to turn it into an English image prompt
      fetch('https://text.pollinations.ai/openai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai', temperature: 0.2, max_tokens: 120,
          messages: [
            { role: 'system', content: 'Convert the user text into a short English image-generation prompt (often a house/building/construction context in Tamil Nadu). Reply with ONLY the prompt itself, no quotes.' },
            { role: 'user', content: req.prompt }
          ]
        })
      }).then(function (r) { return r.json(); }).then(function (j) {
        var p = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        p = p && p.trim() ? p.trim().replace(/^["']+|["']+$/g, '') : '';
        push(p || req.prompt, seed);
      }).catch(function () { push(req.prompt, seed); });
    } else {
      push(req.prompt, seed);
    }
  }

  function chatSend(qRaw) {
    var q = (qRaw || '').trim();
    if (!q) return;
    state.chat.msgs.push({ r: 'u', h: chatFmt(q), t: q });
    if (state.chat.msgs.length > 40) state.chat.msgs.splice(0, state.chat.msgs.length - 40);
    persistSet('br_chat', state.chat.msgs);
    document.getElementById('chatSugg').style.display = 'none';
    chatRender();
    state.chat.msgs.push({ r: 'a', h: '<span class="dots"><i></i><i></i><i></i></span>' });
    chatRender();
    var imgReq = imgDetect(q);
    if (imgReq) { chatImage(imgReq); return; }
    Promise.all([api('/api/materials'), api('/api/builders'), api('/api/stores')]).then(function (res) {
      var mats = (res[0] && res[0].materials) || [];
      var builders = (res[1] && res[1].builders) || [];
      var stores = (res[2] && res[2].stores) || [];
      function offline() {
        try { return aiAnswer(q, mats, builders, stores); }
        catch (e) { return { text: t('ai_fallback') }; }
      }
      function finish(ans, isLlm) {
        state.chat.msgs.pop();
        state.chat.msgs.push({ r: 'a', h: chatFmt(ans.text), t: ans.text, a: ans.acts || null });
        persistSet('br_chat', state.chat.msgs);
        chatRender();
      }
      if (llmAvailable()) {
        llmChat(q, mats, builders).then(function (txt) {
          finish({ text: txt });
        }).catch(function () {
          var a = offline();
          finish({ text: '⚠️ ' + t('ai_llm_err') + (state.llm.p === 'free' ? ' ' + t('ai_llm_keytip') : '') + '\n\n' + a.text, acts: a.acts });
        });
      } else {
        finish(offline());
      }
    }).catch(function () {
      state.chat.msgs.pop();
      state.chat.msgs.push({ r: 'a', h: chatFmt(t('ai_fallback')), t: t('ai_fallback') });
      chatRender();
    });
  }

  function chatOpen() {
    document.getElementById('chatOverlay').hidden = false;
    document.getElementById('fabBtn').hidden = true;
    document.getElementById('aiCfg').hidden = true;
    aiStatusRender();
    if (!state.chat.msgs.length) {
      state.chat.msgs.push({ r: 'a', h: chatFmt(t('ai_greeting')) });
      persistSet('br_chat', state.chat.msgs);
    }
    document.getElementById('chatSugg').style.display = '';
    chatSuggRender();
    chatRender();
  }

  function chatClose() {
    document.getElementById('chatOverlay').hidden = true;
    document.getElementById('fabBtn').hidden = false;
  }

  document.getElementById('chatForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = document.getElementById('chatInput');
    chatSend(inp.value);
    inp.value = '';
  });

  /* ---------------- routing ---------------- */
  function parseHash() {
    var h = (location.hash || '#/home').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    if (!parts.length) return { view: 'home', param: null };
    if (parts[0] === 'material' && parts[1]) return { view: 'material', param: decodeURIComponent(parts[1]) };
    if (parts[0] === 'store' && parts[1]) return { view: 'store', param: decodeURIComponent(parts[1]) };
    if (parts[0] === 'builder' && parts[1]) return { view: 'builder', param: decodeURIComponent(parts[1]) };
    if (['home', 'materials', 'stores', 'builders', 'calc', 'saved'].indexOf(parts[0]) >= 0) return { view: parts[0], param: null };
    return { view: 'home', param: null };
  }
  var lastSetHash = null;
  var pendingRoute = null;
  function go(route) {
    var target = '#/' + route.replace(/^#\/?/, '');
    pendingRoute = parseRouteFromStr(target);
    /* Sync the URL for deep-linking, but NEVER depend on it: sandboxed
       previews and some in-app browsers block hash changes silently.
       Rendering happens directly, so taps always work. */
    try {
      if (target !== location.hash) { lastSetHash = target; location.hash = target; }
    } catch (e) { /* sandboxed — ignore */ }
    render();
  }
  function parseRouteFromStr(r) {
    var s = r.replace(/^#\/?/, '');
    if (s.indexOf('material/') === 0) return { view: 'material', param: s.slice(9) };
    if (s.indexOf('store/') === 0) return { view: 'store', param: s.slice(6) };
    if (s.indexOf('builder/') === 0) return { view: 'builder', param: s.slice(8) };
    return { view: s || 'home', param: null };
  }

  var TAB_FOR = { home: 'home', materials: 'materials', material: 'materials', stores: 'stores', store: 'stores', builders: 'builders', builder: 'builders', calc: 'calc', saved: 'saved' };
  function setActiveTab(view) {
    var tab = TAB_FOR[view] || 'home';
    document.querySelectorAll('.navitem').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
  }

  /* ---------------- views ---------------- */
  function viewHome() {
    main.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    return Promise.all([api('/api/meta'), api('/api/materials'), api('/api/stores')]).then(function (res) {
      var meta = res[0], mats = res[1].materials, stores = res[2].stores;
      var keySlugs = ['cement-ppc', 'cement-opc-53', 'tmt-steel-fe500d', 'm-sand', 'p-sand', 'blue-metal-20mm', 'red-bricks', 'aac-blocks'];
      var key = keySlugs.map(function (s) {
        return mats.find(function (m) { return m.slug === s; });
      }).filter(Boolean);

      var cats = meta.categories.map(function (c) {
        return '<button class="cat" data-action="cat-open" data-cat="' + c.id + '">' +
          '<span class="catico">' + catIcon(c.id) + '</span>' +
          '<span>' + esc(state.lang === 'ta' ? c.name_ta : c.name) + '</span></button>';
      }).join('');

      var keyRows = key.map(function (m) {
        return '<button class="matrow" data-action="open-material" data-slug="' + m.slug + '">' +
          '<span class="matico">' + catIcon(m.category) + '</span>' +
          '<span class="matmid"><span class="matname">' + esc(m.name) + '</span>' +
          '<span class="matta">' + esc(m.name_ta) + '</span>' +
          '<span class="matmeta">' + esc(state.lang === 'ta' ? m.unit_ta : m.unit) + '</span></span>' +
          '<span class="matright"><span class="matprice">' + fmt(m.price_avg) + '</span>' +
          badge(m.change_pct) + '</span></button>';
      }).join('');

      var strip = stores.slice(0, 8).map(function (s) {
        return '<button class="hcard" data-action="open-store" data-slug="' + s.slug + '">' +
          '<div class="storename">' + esc(s.name) + '</div>' +
          '<div class="rating">' + ICONS.star + ' ' + s.rating.toFixed(1) + '</div>' +
          '<p class="storeloc">' + esc(s.area) + ', ' + esc(s.city) + '</p>' +
          '<div class="hc-foot">' + (s.delivery ? '<span class="tag delivery">' + esc(t('delivery_yes')) + '</span>' : '') +
          '<span class="tag">' + s.stock_count + ' ' + esc(state.lang === 'ta' ? 'பொருட்கள்' : 'items') + '</span></div></button>';
      }).join('');

      main.innerHTML =
        '<div class="greeting"><h2>' + esc(t('greeting')) + ' 🙏</h2><p>' + esc(localDate()) + '</p></div>' +
        '<div class="searchbar" data-action="nav" data-route="#/materials" data-focus="1" role="button" tabindex="0">' + ICONS.search +
        '<input readonly placeholder="' + esc(t('search_materials')) + '" aria-label="search"></div>' +
        '<button class="ctacard" data-action="nav" data-route="#/calc">' +
        '<span class="cta-ico">' + ICONS.calc + '</span>' +
        '<span class="cta-txt"><b>' + esc(t('home_cta')) + '</b><span>' + esc(t('home_cta_sub')) + '</span></span>' +
        '<span class="cta-arrow">→</span></button>' +
        '<div class="section"><div class="section-head"><h2>' + esc(t('browse')) + '</h2></div><div class="catgrid">' + cats + '</div></div>' +
        '<div class="section"><div class="section-head"><h2>' + esc(t('key_rates')) + '</h2>' +
        '<button class="see-all" data-action="nav" data-route="#/materials">' + esc(t('see_all')) + ' →</button></div>' + keyRows + '</div>' +
        '<div class="section"><div class="section-head"><h2>' + esc(t('stores_strip')) + '</h2>' +
        '<button class="see-all" data-action="nav" data-route="#/stores">' + esc(t('see_all')) + ' →</button></div>' +
        '<div class="hstrip">' + strip + '</div></div>' +
        '<p class="footnote">' + esc(t('disclaimer')) + ' <button data-action="about">' + esc(t('about')) + '</button></p>';
    });
  }

  function matCard(m) {
    return '<button class="matrow" data-action="open-material" data-slug="' + m.slug + '">' +
      '<span class="matico">' + catIcon(m.category) + '</span>' +
      '<span class="matmid"><span class="matname">' + esc(m.name) + '</span>' +
      '<span class="matta">' + esc(m.name_ta) + '</span>' +
      '<span class="matmeta">' + esc(state.lang === 'ta' ? m.unit_ta : m.unit) + ' · ' + fmtRange(m.price_low, m.price_high) + '</span></span>' +
      '<span class="matright"><span class="matprice">' + fmt(m.price_avg) + '</span>' +
      badge(m.change_pct) + '</span></button>';
  }

  function viewMaterials() {
    main.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    return Promise.all([api('/api/meta'), api('/api/materials')]).then(function (res) {
      var meta = res[0], all = res[1].materials;
      var f = state.matFilter;
      var chips = '<button class="chip' + (f.cat === 'all' ? ' active' : '') + '" data-action="matcat" data-cat="all">' + esc(t('all')) + '</button>' +
        meta.categories.map(function (c) {
          return '<button class="chip' + (f.cat === c.id ? ' active' : '') + '" data-action="matcat" data-cat="' + c.id + '">' +
            catIcon(c.id) + esc(state.lang === 'ta' ? c.name_ta : c.name) + '</button>';
        }).join('');

      main.innerHTML =
        '<div class="searchbar">' + ICONS.search + '<input id="matSearch" placeholder="' + esc(t('search_materials')) + '" value="' + esc(f.q) + '" autocomplete="off"></div>' +
        '<div class="chiprow" id="matChips">' + chips + '</div>' +
        '<p class="countline" id="matCount"></p>' +
        '<div id="matList"></div>' +
        '<p class="footnote">' + esc(t('disclaimer')) + '</p>';

      function update() {
        var q = f.q.trim().toLowerCase();
        var list = all.filter(function (m) {
          if (f.cat !== 'all' && m.category !== f.cat) return false;
          if (!q) return true;
          return (m.name + ' ' + m.name_ta + ' ' + m.category).toLowerCase().indexOf(q) >= 0;
        });
        document.getElementById('matCount').textContent = t('materials_count', all.length, list.length).replace('{n}', all.length).replace('{m}', list.length);
        document.getElementById('matList').innerHTML = list.length
          ? list.map(matCard).join('')
          : '<div class="empty"><div class="e-ico">🔍</div><h3>' + esc(t('no_results')) + '</h3><p>' + esc(t('no_results_hint')) + '</p></div>';
      }
      update();
      updaters.mat = update;
      if (state.focusSearch) {
        var inp = document.getElementById('matSearch');
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
        state.focusSearch = false;
      }
    });
  }

  function bigSpark(vals) {
    var w = 320, h = 96, p = 8;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var rng = (max - min) || 1;
    var pts = vals.map(function (v, i) {
      return [p + i * (w - 2 * p) / (vals.length - 1), h - p - ((v - min) / rng) * (h - 2 * p)];
    });
    var line = pts.map(function (pt) { return pt[0].toFixed(1) + ',' + pt[1].toFixed(1); }).join(' ');
    var area = p + ',' + (h - p) + ' ' + line + ' ' + (w - p) + ',' + (h - p);
    var up = vals[vals.length - 1] >= vals[0];
    var col = up ? '#dc2626' : '#16a34a';
    var last = pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;display:block">' +
      '<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + col + '" stop-opacity=".2"/>' +
      '<stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<polygon points="' + area + '" fill="url(#sg)"/>' +
      '<polyline points="' + line + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4" fill="' + col + '"/></svg>';
  }

  function viewMaterial(slug) {
    main.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    return Promise.all([api('/api/materials/' + encodeURIComponent(slug)), api('/api/meta')]).then(function (res) {
      var m = res[0], meta = res[1];
      if (!m || m.error) throw new Error('not found');
      var cat = catLabel(m.category, meta);
      var faved = isFav('material', m.slug);

      var brands = (m.brands || []).length
        ? '<div class="card panel"><h3>' + ICONS.box + ' ' + esc(t('brands')) + '</h3>' +
          m.brands.map(function (b) {
            return '<div class="brandrow"><span class="bname">' + esc(b.name) + '</span><span class="bprice">' + fmt(b.price) + '</span></div>';
          }).join('') + '</div>'
        : '';

      var sellers = (m.stores || []).length
        ? '<div class="card panel"><h3>' + ICONS.store + ' ' + esc(t('available_at')) + '</h3>' +
          m.stores.map(function (s) {
            return '<div class="sellerrow" data-action="open-store" data-slug="' + s.slug + '">' +
              '<div class="storeavatar">' + esc(s.name.trim()[0]) + '</div>' +
              '<div class="s-mid"><div class="s-name">' + esc(s.name) + '</div>' +
              '<div class="s-loc">' + esc(s.area) + ', ' + esc(s.city) + ' · ★ ' + s.rating.toFixed(1) + '</div></div>' +
              '<div class="s-right"><div class="s-price">' + fmt(s.price) + '</div>' + deltaBadge(s.delta_pct) + '</div></div>';
          }).join('') +
          '<p class="footnote" style="padding:8px 0 0">' + esc(t('disclaimer')) + '</p></div>'
        : '';

      main.innerHTML =
        '<div class="backbar"><button class="backbtn" data-action="back" data-to="#/materials">' + ICONS.back + ' ' + esc(t('back')) + '</button>' +
        '<button class="favbtn' + (faved ? ' faved' : '') + '" data-action="toggle-fav" data-type="material" data-slug="' + m.slug + '" aria-label="favourite">' + ICONS.heart + '</button></div>' +

        '<div class="hero"><span class="catpill">' + esc(state.lang === 'ta' ? cat.name_ta : cat.name) + '</span>' +
        '<h2>' + esc(m.name) + '</h2><div class="heroTa">' + esc(m.name_ta) + '</div>' +
        '<div class="heroprice"><strong>' + fmt(m.price_avg) + '</strong><span>' + esc(state.lang === 'ta' ? m.unit_ta : m.unit) + '</span>' +
        badge(m.change_pct, 'big onDark') + '</div>' +
        '<div class="herofoot"><span class="badge onDark flat">' + esc(t('updated')) + ': ' + esc(m.updated || '') + '</span></div></div>' +

        '<div class="statgrid">' +
        '<div class="stat"><label>' + esc(t('range')) + '</label><b>' + fmt(m.price_low) + '–' + fmt(m.price_high) + '</b></div>' +
        '<div class="stat"><label>' + esc(t('low')) + '</label><b>' + fmt(Math.min.apply(null, m.history)) + '</b></div>' +
        '<div class="stat"><label>' + esc(t('high')) + '</label><b>' + fmt(Math.max.apply(null, m.history)) + '</b></div>' +
        '</div>' +

        '<div class="card panel"><h3>' + ICONS.chart + ' ' + esc(t('trend8')) + '</h3><div class="chartwrap">' + bigSpark(m.history) + '</div></div>' +
        brands +

        '<div class="card panel"><h3>' + ICONS.info + ' ' + esc(t('about_material')) + '</h3>' +
        (m.specs ? '<p class="body">' + esc(m.specs) + '</p>' : '') +
        (m.uses ? '<p class="body">' + esc(m.uses) + '</p>' : '') +
        (m.gst_note ? '<p class="body">💡 ' + esc(m.gst_note) + '</p>' : '') +
        (m.note ? '<div class="notecard">⚠️ ' + esc(m.note) + '</div>' : '') + '</div>' +
        sellers;
    });
  }

  function storeCard(s) {
    var cats = (s.categories || []).slice(0, 3).map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('');
    return '<button class="storerow" data-action="open-store" data-slug="' + s.slug + '">' +
      '<span class="storeavatar">' + esc(s.name.trim()[0]) + '</span>' +
      '<span class="storemid"><span class="storename">' + esc(s.name) + '</span>' +
      '<span class="storeloc">' + esc(s.area) + ', ' + esc(s.city) + '</span>' +
      '<span class="storetags">' + cats + (s.delivery ? '<span class="tag delivery">' + esc(t('delivery_yes')) + '</span>' : '') + '</span></span>' +
      '<span class="storeright"><span class="rating">' + ICONS.star + ' ' + s.rating.toFixed(1) + '</span>' +
      '<span class="reviews">' + s.reviews + ' ' + esc(t('reviews')) + '</span></span></button>';
  }

  function viewStores() {
    main.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    return Promise.all([api('/api/meta'), api('/api/stores')]).then(function (res) {
      var meta = res[0], all = res[1].stores;
      var f = state.storeFilter;
      var chips = '<button class="chip' + (f.city === 'all' ? ' active' : '') + '" data-action="city" data-city="all">' + esc(t('all')) + '</button>' +
        meta.cities.map(function (c) {
          return '<button class="chip' + (f.city === c ? ' active' : '') + '" data-action="city" data-city="' + esc(c) + '">' + esc(c) + '</button>';
        }).join('');

      main.innerHTML =
        '<div class="searchbar">' + ICONS.search + '<input id="storeSearch" placeholder="' + esc(t('search_stores')) + '" value="' + esc(f.q) + '" autocomplete="off"></div>' +
        '<div class="chiprow" id="cityChips">' + chips + '</div>' +
        '<p class="countline" id="storeCount"></p>' +
        '<div id="storeList"></div>' +
        '<p class="footnote">' + esc(t('disclaimer')) + ' <button data-action="about">' + esc(t('about')) + '</button></p>';

      function update() {
        var q = f.q.trim().toLowerCase();
        var list = all.filter(function (s) {
          if (f.city !== 'all' && s.city !== f.city) return false;
          if (!q) return true;
          return (s.name + ' ' + s.area + ' ' + s.city).toLowerCase().indexOf(q) >= 0;
        });
        document.getElementById('storeCount').textContent = t('stores_count', all.length, list.length).replace('{n}', all.length).replace('{m}', list.length);
        document.getElementById('storeList').innerHTML = list.length
          ? list.map(storeCard).join('')
          : '<div class="empty"><div class="e-ico">🏪</div><h3>' + esc(t('no_results')) + '</h3><p>' + esc(t('no_results_hint')) + '</p></div>';
      }
      update();
      updaters.store = update;
    });
  }

  function viewStore(slug) {
    main.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    return api('/api/stores/' + encodeURIComponent(slug)).then(function (s) {
      if (!s || s.error) throw new Error('not found');
      var faved = isFav('store', s.slug);
      var maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ', ' + s.address);
      var rows = (s.materials || []).map(function (r) {
        return '<div class="sellerrow" data-action="open-material" data-slug="' + r.slug + '">' +
          '<div class="s-mid"><div class="s-name">' + esc(state.lang === 'ta' ? r.name_ta : r.name) + '</div>' +
          '<div class="s-loc">' + esc(state.lang === 'ta' ? r.unit_ta : r.unit) + '</div></div>' +
          '<div class="s-right"><div class="s-price">' + fmt(r.price) + '</div>' + deltaBadge(r.delta_pct) + '</div></div>';
      }).join('');

      main.innerHTML =
        '<div class="backbar"><button class="backbtn" data-action="back" data-to="#/stores">' + ICONS.back + ' ' + esc(t('back')) + '</button>' +
        '<button class="favbtn' + (faved ? ' faved' : '') + '" data-action="toggle-fav" data-type="store" data-slug="' + s.slug + '" aria-label="favourite">' + ICONS.heart + '</button></div>' +

        '<div class="hero"><span class="catpill">★ ' + s.rating.toFixed(1) + ' · ' + s.reviews + ' ' + esc(t('reviews')) + '</span>' +
        '<h2>' + esc(s.name) + '</h2><div class="heroTa">' + esc(s.area) + ', ' + esc(s.city) + '</div></div>' +

        '<div class="actionbtns">' +
        '<a class="btn primary" href="tel:' + esc(s.phone.replace(/\s/g, '')) + '">' + ICONS.phone + ' ' + esc(t('call')) + '</a>' +
        '<a class="btn dark" href="' + esc(maps) + '" target="_blank" rel="noopener">' + ICONS.pin + ' ' + esc(t('directions')) + '</a></div>' +

        '<div class="card panel"><h3>' + ICONS.info + ' ' + esc(t('address')) + '</h3>' +
        '<div class="inforow">' + ICONS.pin + '<span>' + esc(s.address) + '</span></div>' +
        '<div class="inforow">' + ICONS.clock + '<span><b>' + esc(t('hours')) + ':</b> ' + esc(s.hours) + '</span></div>' +
        (s.since ? '<div class="inforow">' + ICONS.store + '<span><b>' + esc(t('established')) + ':</b> ' + s.since + '</span></div>' : '') +
        (s.delivery ? '<div class="inforow">' + ICONS.truck + '<span>' + esc(t('delivery_yes')) + '</span></div>' : '') +
        '<div class="inforow">' + ICONS.phone + '<span>' + esc(s.phone) + '</span></div></div>' +

        '<div class="card panel"><h3>' + ICONS.box + ' ' + esc(t('stock')) + ' (' + s.materials.length + ')</h3>' + rows +
        '<p class="footnote" style="padding:8px 0 0">' + esc(t('disclaimer')) + '</p></div>';
    });
  }

  function viewSaved() {
    var matFavs = state.favs.filter(function (f) { return f.type === 'material'; });
    var storeFavs = state.favs.filter(function (f) { return f.type === 'store'; });
    var builderFavs = state.favs.filter(function (f) { return f.type === 'builder'; });

    if (!state.favs.length) {
      main.innerHTML = '<div class="empty"><div class="e-ico">💙</div><h3>' + esc(t('saved_empty_title')) + '</h3>' +
        '<p>' + esc(t('saved_empty_hint')) + '</p>' +
        '<div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">' +
        '<button class="btn dark" style="flex:none" data-action="nav" data-route="#/materials">' + esc(t('browse_materials')) + '</button>' +
        '<button class="btn" style="flex:none" data-action="nav" data-route="#/stores">' + esc(t('browse_stores')) + '</button></div></div>';
      return Promise.resolve();
    }

    return Promise.all([api('/api/materials'), api('/api/stores'), api('/api/builders')]).then(function (res) {
      var mats = res[0].materials, stores = res[1].stores, builders = res[2].builders;
      var matHtml = matFavs.map(function (f) {
        var m = mats.find(function (x) { return x.slug === f.slug; });
        return m ? matCard(m) : '';
      }).join('');
      var storeHtml = storeFavs.map(function (f) {
        var s = stores.find(function (x) { return x.slug === f.slug; });
        return s ? storeCard(s) : '';
      }).join('');

      var builderHtml = builderFavs.map(function (f) {
        var b = builders.find(function (x) { return x.slug === f.slug; });
        return b ? builderCard(b) : '';
      }).join('');

      main.innerHTML =
        (matFavs.length ? '<div class="section"><div class="section-head"><h2>' + esc(t('saved_materials')) + '</h2></div>' + matHtml + '</div>' : '') +
        (storeFavs.length ? '<div class="section"><div class="section-head"><h2>' + esc(t('saved_stores')) + '</h2></div>' + storeHtml + '</div>' : '') +
        (builderFavs.length ? '<div class="section"><div class="section-head"><h2>' + esc(t('saved_builders')) + '</h2></div>' + builderHtml + '</div>' : '');
    });
  }

  /* ---------------- builders ---------------- */
  var TYPE_KEYS = { turnkey: 'turnkey', semi: 'semi', contractor: 'type_contractor', labour: 'labour' };

  function builderCard(b) {
    var tags = '';
    if (b.rating != null) tags += '<span class="tag">★ ' + b.rating.toFixed(1) + '</span>';
    if (b.projects != null) tags += '<span class="tag">' + b.projects + ' ' + esc(t('projects_short')) + '</span>';
    if (b.years != null) tags += '<span class="tag">' + b.years + ' ' + esc(t('yrs_short')) + '</span>';
    if (b.min_area != null) tags += '<span class="tag">' + esc(t('min_area')) + ' ' + qfmt(b.min_area, 0) + ' sq.ft</span>';
    var rate = b.rate != null
      ? fmt(b.rate) + '<small>' + esc(t('per_sqft_short')) + '</small>'
      : '<small style="color:var(--muted)">' + esc(t('on_enquiry')) + '</small>';
    return '<button class="buildrow" data-action="open-builder" data-slug="' + b.slug + '">' +
      '<span class="builderavatar">' + esc(b.name.trim()[0]) + '</span>' +
      '<span class="buildermid"><span class="buildername">' + esc(b.name) + '</span>' +
      '<span class="builderloc">' + esc(b.city) + ' · ' + esc(t(TYPE_KEYS[b.type] || b.type)) + '</span>' +
      '<span class="buildertags">' + tags + '</span></span>' +
      '<span class="builderright"><span class="builderrate">' + rate + '</span></span></button>';
  }

  function viewBuilders() {
    main.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    return Promise.all([api('/api/meta'), api('/api/builders')]).then(function (res) {
      var meta = res[0], all = res[1].builders;
      var f = state.builderFilter;
      var typeChips = '<button class="chip' + (f.type === 'all' ? ' active' : '') + '" data-action="buildertype" data-val="all">' + esc(t('all_types')) + '</button>' +
        meta.builder_types.map(function (ty) {
          return '<button class="chip' + (f.type === ty.id ? ' active' : '') + '" data-action="buildertype" data-val="' + ty.id + '">' + esc(state.lang === 'ta' ? ty.name_ta : ty.name) + '</button>';
        }).join('');
      var cityChips = '<button class="chip' + (f.city === 'all' ? ' active' : '') + '" data-action="buildercity" data-val="all">' + esc(t('all')) + '</button>' +
        meta.builder_cities.map(function (c) {
          return '<button class="chip' + (f.city === c ? ' active' : '') + '" data-action="buildercity" data-val="' + esc(c) + '">' + esc(c) + '</button>';
        }).join('');

      main.innerHTML =
        '<div class="greeting"><h2>' + esc(t('builders_title')) + '</h2></div>' +
        '<div class="searchbar">' + ICONS.search + '<input id="builderSearch" placeholder="' + esc(t('search_builders')) + '" value="' + esc(f.q) + '" autocomplete="off"></div>' +
        '<div class="chiprow">' + typeChips + '</div>' +
        '<div class="chiprow">' + cityChips + '</div>' +
        '<p class="countline" id="builderCount"></p>' +
        '<div id="builderList"></div>' +
        '<p class="footnote">' + esc(t('verified_listing')) + '.</p>';

      function update() {
        var q = f.q.trim().toLowerCase();
        var list = all.filter(function (b) {
          if (f.city !== 'all' && b.city !== f.city) return false;
          if (f.type !== 'all' && b.type !== f.type) return false;
          if (!q) return true;
          return (b.name + ' ' + b.city).toLowerCase().indexOf(q) >= 0;
        });
        document.getElementById('builderCount').textContent = t('builders_count', all.length, list.length).replace('{n}', all.length).replace('{m}', list.length);
        document.getElementById('builderList').innerHTML = list.length
          ? list.map(builderCard).join('')
          : '<div class="empty"><div class="e-ico">🏗️</div><h3>' + esc(t('no_results')) + '</h3><p>' + esc(t('no_results_hint')) + '</p></div>';
      }
      update();
      updaters.builder = update;
    });
  }

  function viewBuilder(slug) {
    main.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    return api('/api/builders/' + encodeURIComponent(slug)).then(function (b) {
      if (!b || b.error) throw new Error('not found');
      var faved = isFav('builder', b.slug);
      var incl = (b.inclusions || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');

      var ratingLine = b.rating != null ? '★ ' + b.rating.toFixed(1) + (b.reviews ? ' · ' + b.reviews + ' ' + esc(t('reviews')) : '') : esc(b.areas.split('—')[0]);
      var heroRate = b.rate != null ? fmt(b.rate) : esc(t('on_enquiry'));
      var badges = '';
      if (b.projects != null) badges += '<span class="badge onDark flat">' + b.projects + ' ' + esc(t('projects_short')) + '</span>';
      if (b.years != null) badges += '<span class="badge onDark flat">' + b.years + ' ' + esc(t('yrs_short')) + ' ' + esc(t('experience')) + '</span>';
      if (b.min_area != null) badges += '<span class="badge onDark flat">' + esc(t('min_area')) + ' ' + qfmt(b.min_area, 0) + ' sq.ft</span>';
      if (b.website) badges += '<span class="badge onDark flat">' + esc(b.website) + '</span>';
      var callBtn = b.phone
        ? '<a class="btn primary" href="tel:' + esc(b.phone.replace(/\s/g, '')) + '">' + ICONS.phone + ' ' + esc(t('call')) + '</a>'
        : '';
      var webBtn = b.website
        ? '<a class="btn dark" href="https://' + esc(b.website) + '" target="_blank" rel="noopener">' + ICONS.pin + ' ' + esc(t('website_btn')) + '</a>'
        : '';
      var footnote = b.sample ? t('sample_listing') : t('verified_listing');

      main.innerHTML =
        '<div class="backbar"><button class="backbtn" data-action="back" data-to="#/builders">' + ICONS.back + ' ' + esc(t('back')) + '</button>' +
        '<button class="favbtn' + (faved ? ' faved' : '') + '" data-action="toggle-fav" data-type="builder" data-slug="' + b.slug + '" aria-label="favourite">' + ICONS.heart + '</button></div>' +

        '<div class="hero"><span class="catpill">' + esc(t(TYPE_KEYS[b.type] || b.type)) + ' · ' + esc(b.city) + '</span>' +
        '<h2>' + esc(b.name) + '</h2>' +
        '<div class="heroTa">' + ratingLine + '</div>' +
        '<div class="herosplit"><strong>' + heroRate + '</strong><span>' + esc(t('per_sqft_rate')) + '</span></div>' +
        '<div class="herofoot">' + badges + '</div></div>' +

        '<div class="actionbtns">' + callBtn + webBtn + '</div>' +

        '<div class="card panel"><h3>' + ICONS.info + ' ' + esc(t('inclusions')) + '</h3>' +
        '<ul class="inclist">' + incl + '</ul>' +
        (b.note ? '<div class="notecard">⚠️ ' + esc(b.note) + '</div>' : '') + '</div>' +

        '<div class="card panel"><h3>' + ICONS.pin + ' ' + esc(t('areas_served')) + '</h3>' +
        '<div class="inforow">' + ICONS.pin + '<span>' + esc(b.areas) + '</span></div>' +
        (b.phone ? '<div class="inforow">' + ICONS.phone + '<span>' + esc(b.phone) + '</span></div>' : '') +
        (b.website ? '<div class="inforow">' + ICONS.info + '<span>' + esc(b.website) + '</span></div>' : '') + '</div>' +

        '<p class="footnote">' + esc(footnote) + '.</p>';
    });
  }

  /* ---------------- construction calculator ---------------- */
  var CALC_FLOORS_KG = { g: 1.0, g1: 1.06, g2: 1.12 };
  var CALC_AGGR_T_PER_CFT = 0.042;  // blue metal: ~4.2 t per unit (100 cft)

  function calcEstimate(mats, cfg) {
    var by = {};
    mats.forEach(function (m) { by[m.slug] = m; });
    var c = cfg || state.calc;
    var tierIdx = { e: 0, s: 1, p: 2 }[c.tier];
    var A = c.area;

    var cementBags = A * [0.34, 0.40, 0.44][tierIdx];
    var steelKg = A * [3.4, 3.9, 4.5][tierIdx] * CALC_FLOORS_KG[c.floors];
    var msandUnits = (A * [0.95, 1.15, 1.30][tierIdx]) / 100;
    var psandUnits = (A * [0.32, 0.42, 0.50][tierIdx]) / 100;
    var aggTonnes = (A * [0.60, 0.75, 0.85][tierIdx]) * CALC_AGGR_T_PER_CFT;
    var wallCount = c.wall === 'red' ? A * [13, 15, 16][tierIdx]
                  : c.wall === 'aac' ? A * [1.45, 1.55, 1.65][tierIdx]
                  : A * [2.10, 2.25, 2.40][tierIdx];
    var wallSlug = c.wall === 'red' ? 'red-bricks' : c.wall === 'aac' ? 'aac-blocks' : 'solid-concrete-blocks';
    var paintL = A * [0.022, 0.026, 0.030][tierIdx];
    var primerL = A * [0.018, 0.020, 0.022][tierIdx];
    var puttyBags = (A * [0.10, 0.13, 0.16][tierIdx]) / 40;
    var tilesSqft = A * 0.95;
    var wireKg = steelKg / 100;

    var rows = [];
    function add(slug, qty, qtyLabel, rateLabel) {
      var m = by[slug];
      if (!m || !isFinite(qty) || qty <= 0) return;
      rows.push({
        m: m, qty: qty, qtyLabel: qtyLabel, rateLabel: rateLabel,
        rate: m.price_avg, cost: qty * m.price_avg
      });
    }
    add('cement-opc-53', cementBags, qfmt(cementBags, 0) + ' ' + t('u_bags'), t('u_bag'));
    add('tmt-steel-fe500d', steelKg, qfmt(steelKg, 0) + ' ' + t('u_kg') + (steelKg >= 1000 ? ' (' + qfmt(steelKg / 1000, 1) + ' ' + t('u_t') + ')' : ''), t('u_kg'));
    add(wallSlug, wallCount, qfmt(wallCount, 0) + ' ' + t('u_nos'), t('u_nos'));
    add('m-sand', msandUnits, qfmt(msandUnits, 1) + ' ' + t('u_units'), t('u_unit'));
    add('p-sand', psandUnits, qfmt(psandUnits, 1) + ' ' + t('u_units'), t('u_unit'));
    add('blue-metal-20mm', aggTonnes, qfmt(aggTonnes, 1) + ' ' + t('u_tonnes'), t('u_t'));
    add('vitrified-tiles', tilesSqft, qfmt(tilesSqft, 0) + ' ' + t('u_sqft'), t('u_sqft'));
    add('interior-emulsion', paintL, qfmt(paintL, 1) + ' ' + t('u_litres'), t('u_l'));
    add('wall-primer', primerL, qfmt(primerL, 1) + ' ' + t('u_litres'), t('u_l'));
    add('wall-putty', puttyBags, qfmt(puttyBags, 1) + ' ' + t('u_bags'), t('u_bag'));
    add('binding-wire', wireKg, qfmt(wireKg, 1) + ' ' + t('u_kg'), t('u_kg'));

    rows.sort(function (a, b) { return b.cost - a.cost; });
    var total = rows.reduce(function (s, r) { return s + r.cost; }, 0);
    return { rows: rows, total: total, perSqft: total / A, area: A };
  }

  function qfmt(n, dec) {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: dec, minimumFractionDigits: 0 }).format(n);
  }

  function calcSeg(key, opts) {
    return '<div class="chiprow">' + opts.map(function (o) {
      var active = state.calc[key] === o.v ? ' active' : '';
      return '<button class="chip' + active + '" data-action="calcset" data-key="' + key + '" data-val="' + o.v + '">' + esc(t(o.k)) + '</button>';
    }).join('') + '</div>';
  }

  function calcResultsHtml(est) {
    var max = est.rows.length ? est.rows[0].cost : 1;
    var rowsHtml = est.rows.map(function (r) {
      var pct = Math.max(3, Math.round(r.cost / max * 100));
      return '<div class="calcrow">' +
        '<div class="cr-top"><div><div class="cr-name">' + esc(state.lang === 'ta' ? r.m.name_ta : r.m.name) + '</div>' +
        '<div class="cr-qty">' + r.qtyLabel + ' × ' + fmt(r.rate) + ' / ' + r.rateLabel + '</div></div>' +
        '<div class="cr-cost">' + fmt(Math.round(r.cost)) + '</div></div>' +
        '<div class="cr-bar"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
    return '<div class="hero"><span class="catpill">' + esc(t('est_cost')) + '</span>' +
      '<div class="herosplit"><strong>' + fmt(Math.round(est.total)) + '</strong>' +
      '<span>≈ ' + fmt(Math.round(est.perSqft)) + ' ' + esc(t('per_sqft_rate')) + '</span></div>' +
      '<div class="herofoot"><span class="badge onDark flat">' + esc(t('materials_only')) + '</span>' +
      '<span class="badge onDark flat">' + qfmt(est.area, 0) + ' ' + esc(t('sqft_unit')) + '</span></div></div>' +
      '<div class="card panel"><h3>' + ICONS.box + ' ' + esc(t('breakdown')) + '</h3>' + rowsHtml + '</div>';
  }

  function calcModeChips() {
    return '<div class="chiprow">' +
      '<button class="chip' + (state.calcMode === 'materials' ? ' active' : '') + '" data-action="calcmode" data-val="materials">' + esc(t('mode_materials')) + '</button>' +
      '<button class="chip' + (state.calcMode === 'builderrate' ? ' active' : '') + '" data-action="calcmode" data-val="builderrate">' + esc(t('mode_builderrate')) + '</button>' +
      '<button class="chip' + (state.calcMode === 'loan' ? ' active' : '') + '" data-action="calcmode" data-val="loan">' + esc(t('mode_loan')) + '</button>' +
      '</div>';
  }

  function viewCalc() {
    if (state.calcMode === 'builderrate') return viewQuote();
    if (state.calcMode === 'loan') return viewCalcLoan();
    return viewCalcMaterials();
  }

  function viewCalcMaterials() {
    main.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    return api('/api/materials').then(function (res) {
      var mats = res.materials;

      function update() {
        document.getElementById('calcResults').innerHTML = calcResultsHtml(calcEstimate(mats));
      }
      main.innerHTML =
        '<div class="greeting"><h2>' + esc(t('calc_title')) + '</h2></div>' +
        calcModeChips() +

        '<div class="card calcpanel"><label class="plabel">' + esc(t('builtup')) + '</label>' +
        '<div class="stepper">' +
        '<button class="stepbtn" data-action="calcstep" data-delta="-100" aria-label="minus">−</button>' +
        '<input id="calcArea" class="areainput" type="number" inputmode="numeric" min="100" max="100000" step="50" value="' + state.calc.area + '" aria-label="built-up area">' +
        '<button class="stepbtn" data-action="calcstep" data-delta="100" aria-label="plus">+</button>' +
        '<span class="unitlbl">' + esc(t('sqft_unit')) + '</span></div></div>' +

        '<div class="card calcpanel"><label class="plabel">' + esc(t('quality')) + '</label>' +
        calcSeg('tier', [{ v: 'e', k: 'economy' }, { v: 's', k: 'standard' }, { v: 'p', k: 'premium' }]) + '</div>' +

        '<div class="card calcpanel"><label class="plabel">' + esc(t('floors')) + '</label>' +
        calcSeg('floors', [{ v: 'g', k: 'ground' }, { v: 'g1', k: 'g1' }, { v: 'g2', k: 'g2' }]) + '</div>' +

        '<div class="card calcpanel"><label class="plabel">' + esc(t('wallmat')) + '</label>' +
        calcSeg('wall', [{ v: 'red', k: 'red_bricks' }, { v: 'aac', k: 'aac_blocks' }, { v: 'solid', k: 'solid_blocks' }]) + '</div>' +

        '<div id="calcResults"></div>' +

        '<div class="card panel"><h3>' + ICONS.info + ' ' + esc(t('about')) + '</h3>' +
        '<p class="body">' + esc(t('calc_note1')) + '</p>' +
        '<p class="body">' + esc(t('calc_note2')) + '</p>' +
        '<div class="notecard">💡 ' + esc(t('rates_from')) + '.</div></div>';

      update();
      updaters.calc = update;
    });
  }

  /* ---------------- builder-quote home cost ---------------- */
  var QUOTE_EXTRAS = [
    { k: 'q_compound', min: 120000, max: 220000 },
    { k: 'q_eb', min: 40000, max: 80000 },
    { k: 'q_borewell', min: 100000, max: 180000 },
    { k: 'q_sump', min: 50000, max: 80000 },
    { k: 'q_septic', min: 40000, max: 70000 },
    { k: 'q_approval', min: 80000, max: 150000 },
    { k: 'q_siteworks', min: 40000, max: 100000 }
  ];

  function quoteFloorLabel(n) {
    return n === 1 ? t('floor_g') : 'G+' + (n - 1);
  }

  function quoteCalc() {
    var Q = state.quote;
    var totalArea = Q.area * Q.floors;
    var cost = Q.rate * totalArea;
    var cont = Math.round(cost * 0.05);
    var exMin = cont, exMax = cont;
    QUOTE_EXTRAS.forEach(function (e) { exMin += e.min; exMax += e.max; });
    return { totalArea: totalArea, cost: cost, cont: cont, exMin: exMin, exMax: exMax };
  }

  function quoteResultsHtml(r) {
    var rows = QUOTE_EXTRAS.map(function (e) {
      return '<div class="extrow"><div class="extname">' + esc(t(e.k)) +
        '<small>' + esc(t(e.k + '_n')) + '</small></div>' +
        '<div class="extamt">' + fmt(e.min) + ' – ' + fmt(e.max) + '</div></div>';
    }).join('');
    var pctMin = Math.round(r.exMin / r.cost * 100), pctMax = Math.round(r.exMax / r.cost * 100);
    return '<div class="hero"><span class="catpill">' + esc(t('quote_totalcost')) + '</span>' +
      '<div class="herosplit"><strong>' + fmt(r.cost) + '</strong><span>' + esc(t('per_sqft_rate')) + ' ' + fmt(state.quote.rate) + '</span></div>' +
      '<div class="herofoot"><span class="badge onDark flat">' + qfmt(r.totalArea, 0) + ' ' + esc(t('sqft_unit')) + '</span>' +
      '<span class="badge onDark flat">' + esc(quoteFloorLabel(state.quote.floors)) + '</span></div></div>' +

      '<div class="card panel"><h3>' + ICONS.box + ' ' + esc(t('breakdown')) + '</h3>' +
      '<div class="inforow">' + ICONS.ruppee + '<span><b>' + esc(t('quote_rate')) + ':</b> ' + fmt(state.quote.rate) + '</span></div>' +
      '<div class="inforow">' + ICONS.pin + '<span><b>' + esc(t('quote_area')) + ':</b> ' + qfmt(state.quote.area, 0) + ' ' + esc(t('sqft_unit')) + '</span></div>' +
      '<div class="inforow">' + ICONS.pin + '<span><b>' + esc(t('quote_totalarea')) + ':</b> ' + qfmt(r.totalArea, 0) + ' ' + esc(t('sqft_unit')) + ' <small>(' + state.quote.floors + ' × ' + qfmt(state.quote.area, 0) + ')</small></span></div>' +
      '<div class="inforow">' + ICONS.ruppee + '<span><b>' + esc(t('quote_totalcost')) + ':</b> ' + fmt(r.cost) + '</span></div></div>' +

      '<div class="card panel"><h3>' + ICONS.chart + ' ' + esc(t('quote_extras_title')) + '</h3>' + rows +
      '<div class="extrow"><div class="extname"><b>' + esc(t('q_contingency')) + '</b><small>' + esc(t('q_contingency_n')) + '</small></div>' +
      '<div class="extamt">' + fmt(r.cont) + '</div></div>' +
      '<div class="extratotal">' + esc(t('quote_extras_subtotal')) + ': ' + fmt(r.exMin) + ' – ' + fmt(r.exMax) +
      ' <small>(≈ ' + pctMin + '% – ' + pctMax + '% ' + esc(t('of_construction')) + ')</small></div>' +
      '<div class="extratotal big">' + esc(t('quote_total_project')) + ': ' + fmt(r.cost + r.exMin) + ' – ' + fmt(r.cost + r.exMax) + '</div>' +
      '<div class="notecard">💡 ' + esc(t('quote_note')) + '</div></div>';
  }

  function viewQuote() {
    function update() {
      document.getElementById('quoteResults').innerHTML = quoteResultsHtml(quoteCalc());
    }
    var Q = state.quote;
    main.innerHTML =
      '<div class="greeting"><h2>' + esc(t('mode_builderrate')) + '</h2></div>' +
      calcModeChips() +

      '<div class="card calcpanel"><label class="plabel">' + esc(t('quote_rate')) + '</label>' +
      '<div class="stepper">' +
      '<button class="stepbtn" data-action="quotestep" data-key="rate" data-delta="-50" aria-label="minus">−</button>' +
      '<input id="quoteRate" class="areainput" type="number" inputmode="numeric" min="500" max="6000" step="50" value="' + Q.rate + '" aria-label="builder rate per sqft">' +
      '<button class="stepbtn" data-action="quotestep" data-key="rate" data-delta="50" aria-label="plus">+</button>' +
      '<span class="unitlbl">₹ / sq.ft</span></div></div>' +

      '<div class="card calcpanel"><label class="plabel">' + esc(t('quote_floors')) + '</label>' +
      '<div class="chiprow">' + [1, 2, 3, 4].map(function (n) {
        return '<button class="chip' + (Q.floors === n ? ' active' : '') + '" data-action="quoteset" data-key="floors" data-val="' + n + '">' + esc(quoteFloorLabel(n)) + '</button>';
      }).join('') + '</div></div>' +

      '<div class="card calcpanel"><label class="plabel">' + esc(t('quote_area')) + '</label>' +
      '<div class="stepper">' +
      '<button class="stepbtn" data-action="quotestep" data-key="area" data-delta="-50" aria-label="minus">−</button>' +
      '<input id="quoteArea" class="areainput" type="number" inputmode="numeric" min="300" max="10000" step="50" value="' + Q.area + '" aria-label="built-up area per floor in sqft">' +
      '<button class="stepbtn" data-action="quotestep" data-key="area" data-delta="50" aria-label="plus">+</button>' +
      '<span class="unitlbl">' + esc(t('sqft_unit')) + '</span></div></div>' +

      '<div id="quoteResults"></div>';

    update();
    updaters.quote = update;
    return Promise.resolve();
  }

  /* ---------------- home loan calculator ---------------- */
  function loanCalc() {
    var L = state.loan;
    var cost = L.lakh * 100000;
    var loan = Math.max(0, cost * (1 - L.dp / 100));
    var r = L.rate / 1200;
    var n = L.years * 12;
    var emi;
    if (r <= 0) emi = loan / n;
    else { var f = Math.pow(1 + r, n); emi = loan * r * f / (f - 1); }
    return {
      cost: cost, loan: loan, dpAmt: cost - loan, emi: emi, n: n,
      totalRepay: emi * n, totalInt: emi * n - loan
    };
  }

  function fmtMos(m) {
    var y = Math.floor(m / 12), mo = m % 12, s = '';
    if (y) s += y + ' ' + t(y === 1 ? 'yr' : 'yrs');
    if (mo) s += (y ? ' ' : '') + mo + ' ' + t('mo_short');
    return s || '0';
  }

  /* prepayment simulation: user-entered (month, amount) entries applied at their months */
  function loanPrepay() {
    var L = state.loan, base = loanCalc();
    var r = L.rate / 1200, emi = base.emi, n = base.n, loan = base.loan;
    var out = { active: false, newN: n, monthsSaved: 0, intSaved: 0,
      newTotalInt: base.totalInt, newTotalRepay: base.totalRepay, reducedEmi: null, rows: [] };
    if (loan <= 0) return out;
    var payMap = {}, payKeys = 0;
    (L.prepays || []).forEach(function (p) {
      if (!p || !isFinite(+p.m) || !isFinite(+p.amt) || +p.amt <= 0) return;
      var mm = Math.min(Math.max(1, Math.round(+p.m)), n);
      if (!payMap[mm]) payKeys++;
      payMap[mm] = (payMap[mm] || 0) + Math.round(+p.amt);
    });
    if (!payKeys) return out;
    var singleMonth = payKeys === 1 ? +Object.keys(payMap)[0] : null;
    var B = loan, m = 0, intTot = 0, paidTot = 0, yp = 0, yi = 0, ypre = 0, BafterLast = null;
    while (B > 0.005 && m <= n) {
      m++;
      var iM = B * r;
      var pay = Math.min(emi, B + iM);
      var prM = pay - iM;
      B -= prM; if (B < 0) B = 0;
      paidTot += pay; intTot += iM; yp += prM; yi += iM;
      if (payMap[m]) {
        var ppay = Math.min(payMap[m], B);
        if (ppay > 0) { B -= ppay; paidTot += ppay; yp += ppay; ypre += ppay; }
        BafterLast = B;
      }
      if (m % 12 === 0 || B <= 0.005) { out.rows.push({ yr: Math.ceil(m / 12), p: yp, pre: ypre, i: yi, bal: B }); yp = 0; yi = 0; ypre = 0; }
    }
    if (B > 0.005) return out;
    out.active = true;
    out.newN = m;
    out.monthsSaved = Math.max(0, n - m);
    out.newTotalInt = intTot;
    out.newTotalRepay = paidTot;
    out.intSaved = Math.max(0, base.totalInt - intTot);
    if (singleMonth != null && singleMonth < n && BafterLast != null) {
      var remN = n - singleMonth;
      if (BafterLast <= 0.005) out.reducedEmi = 0;
      else { var f2 = Math.pow(1 + r, remN); out.reducedEmi = BafterLast * r * f2 / (f2 - 1); }
    }
    return out;
  }

  function prepayHtml(base) {
    var pp = loanPrepay();
    if (!pp.active) return '';
    var rows = pp.rows.map(function (row) {
      return '<tr><td>' + row.yr + '</td><td>' + fmt(Math.round(row.p)) + '</td><td>' + (row.pre > 0 ? fmt(Math.round(row.pre)) : '—') + '</td><td>' + fmt(Math.round(row.i)) + '</td><td>' + fmt(Math.round(row.bal)) + '</td></tr>';
    }).join('');
    var alt = '';
    if (pp.reducedEmi != null && pp.reducedEmi > 0) {
      alt = '<div class="inforow">' + ICONS.ruppee + '<span><b>' + esc(t('emi_if_tenure_kept')) + ':</b> ' +
        fmt(Math.round(pp.reducedEmi)) + ' <small>(' + esc(t('per_month')) + ' · ' + esc(t('orig_short')) + ' ' + fmt(Math.round(base.emi)) + ')</small></span></div>';
    }
    return '<div class="card panel"><h3>' + ICONS.chart + ' ' + esc(t('prepay_savings')) + '</h3>' +
      '<div class="savingsBox">💰 <b>' + esc(t('interest_saved')) + ':</b> ' + fmt(Math.round(pp.intSaved)) + '</div>' +
      '<div class="inforow">' + ICONS.chart + '<span><b>' + esc(t('tenure_cut')) + ':</b> ' + esc(fmtMos(pp.monthsSaved)) + '</span></div>' +
      '<div class="inforow">' + ICONS.chart + '<span><b>' + esc(t('loan_closes')) + ':</b> ' + esc(fmtMos(pp.newN)) +
      ' <small>(' + esc(t('orig_short')) + ' ' + state.loan.years + ' ' + esc(t('yrs')) + ')</small></span></div>' +
      '<div class="inforow">' + ICONS.ruppee + '<span><b>' + esc(t('new_total_interest')) + ':</b> ' + fmt(Math.round(pp.newTotalInt)) +
      ' <small>(' + esc(t('orig_short')) + ' ' + fmt(Math.round(base.totalInt)) + ')</small></span></div>' + alt +
      '<label class="plabel" style="margin-top:12px">' + esc(t('yr_schedule')) + '</label>' +
      '<div class="amortwrap"><table class="amort"><thead><tr>' +
      '<th>' + esc(t('col_year')) + '</th><th>' + esc(t('principal')) + '</th><th>' + esc(t('col_prepaid')) + '</th><th>' + esc(t('interest')) + '</th><th>' + esc(t('col_balance')) + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="notecard">💡 ' + esc(t('prepay_note')) + '</div></div>';
  }

  function loanResultsHtml(r) {
    var intPct = Math.round(r.totalInt / r.totalRepay * 100);
    return '<div class="hero"><span class="catpill">' + esc(t('monthly_emi')) + '</span>' +
      '<div class="herosplit"><strong>' + fmt(Math.round(r.emi)) + '</strong><span>' + esc(t('per_month')) + '</span></div>' +
      '<div class="herofoot"><span class="badge onDark flat">' + esc(t('loan_amount')) + ': ' + fmt(Math.round(r.loan)) + '</span>' +
      '<span class="badge onDark flat">' + state.loan.years + ' ' + esc(t(state.loan.years === 1 ? 'yr' : 'yrs')) + ' · ' + state.loan.rate + '%</span></div></div>' +

      '<div class="card panel"><h3>' + ICONS.chart + ' ' + esc(t('breakdown')) + '</h3>' +
      '<div class="inforow">' + ICONS.ruppee + '<span><b>' + esc(t('property_cost')) + ':</b> ' + fmt(Math.round(r.cost)) + '</span></div>' +
      '<div class="inforow">' + ICONS.ruppee + '<span><b>' + esc(t('down_payment')) + ' (' + state.loan.dp + '%):</b> ' + fmt(Math.round(r.dpAmt)) + '</span></div>' +
      '<div class="inforow">' + ICONS.ruppee + '<span><b>' + esc(t('loan_amount')) + ':</b> ' + fmt(Math.round(r.loan)) + '</span></div>' +
      '<div class="inforow">' + ICONS.ruppee + '<span><b>' + esc(t('total_interest')) + ':</b> ' + fmt(Math.round(r.totalInt)) + '</span></div>' +
      '<div class="inforow">' + ICONS.ruppee + '<span><b>' + esc(t('total_repay')) + ':</b> ' + fmt(Math.round(r.totalRepay)) + '</span></div>' +
      '<div class="splitbar"><i class="s1" style="width:' + (100 - intPct) + '%"></i><i class="s2" style="width:' + intPct + '%"></i></div>' +
      '<div class="splitlegend"><span><i class="s1" style="background:var(--navy-3)"></i>' + esc(t('principal')) + ' ' + (100 - intPct) + '%</span>' +
      '<span><i class="s2" style="background:var(--accent)"></i>' + esc(t('interest')) + ' ' + intPct + '%</span></div>' +
      '<div class="notecard">💡 ' + esc(t('loan_note')) + '</div></div>' +
      prepayHtml(r);
  }

  function viewCalcLoan() {
    function update() {
      document.getElementById('loanResults').innerHTML = loanResultsHtml(loanCalc());
    }
    var L = state.loan;
    main.innerHTML =
      '<div class="greeting"><h2>' + esc(t('mode_loan')) + '</h2></div>' +
      calcModeChips() +

      '<div class="card calcpanel"><label class="plabel">' + esc(t('property_cost')) + '</label>' +
      '<div class="stepper">' +
      '<button class="stepbtn" data-action="loanstep" data-key="lakh" data-delta="-1" aria-label="minus">−</button>' +
      '<input id="loanCost" class="areainput" type="number" inputmode="numeric" min="3" max="500" step="1" value="' + L.lakh + '" aria-label="cost in lakhs">' +
      '<button class="stepbtn" data-action="loanstep" data-key="lakh" data-delta="1" aria-label="plus">+</button>' +
      '<span class="unitlbl">' + esc(t('in_lakhs')) + '</span></div>' +
      '<div class="chiprow" style="margin-top:10px">' +
      [20, 30, 50, 75, 100].map(function (v) {
        return '<button class="chip' + (L.lakh === v ? ' active' : '') + '" data-action="loanset" data-key="lakh" data-val="' + v + '">' + v + 'L</button>';
      }).join('') + '</div></div>' +

      '<div class="card calcpanel"><label class="plabel">' + esc(t('down_payment')) + '</label>' +
      '<div class="stepper">' +
      '<button class="stepbtn" data-action="loanstep" data-key="dp" data-delta="-5" aria-label="minus">−</button>' +
      '<input id="loanDp" class="areainput" type="number" inputmode="numeric" min="1" max="90" step="1" value="' + L.dp + '" aria-label="down payment percent">' +
      '<button class="stepbtn" data-action="loanstep" data-key="dp" data-delta="5" aria-label="plus">+</button>' +
      '<span class="unitlbl">%</span></div></div>' +

      '<div class="card calcpanel"><label class="plabel">' + esc(t('interest_rate')) + '</label>' +
      '<div class="stepper">' +
      '<button class="stepbtn" data-action="loanstep" data-key="rate" data-delta="-0.25" aria-label="minus">−</button>' +
      '<input id="loanRate" class="areainput" type="number" inputmode="decimal" min="4" max="20" step="0.05" value="' + L.rate + '" aria-label="interest rate">' +
      '<button class="stepbtn" data-action="loanstep" data-key="rate" data-delta="0.25" aria-label="plus">+</button>' +
      '<span class="unitlbl">% p.a.</span></div></div>' +

      '<div class="card calcpanel"><label class="plabel">' + esc(t('loan_tenure')) + '</label>' +
      '<div class="stepper">' +
      '<button class="stepbtn" data-action="loanstep" data-key="years" data-delta="-1" aria-label="minus">−</button>' +
      '<input id="loanYears" class="areainput" type="number" inputmode="numeric" min="1" max="40" step="1" value="' + L.years + '" aria-label="tenure in years">' +
      '<button class="stepbtn" data-action="loanstep" data-key="years" data-delta="1" aria-label="plus">+</button>' +
      '<span class="unitlbl">' + esc(t('yrs')) + '</span></div></div>' +

      '<div class="card calcpanel"><label class="plabel">' + esc(t('prepay_title')) + '</label>' +
      '<div class="prepayRows">' +
      (L.prepays || []).map(function (p, i) {
        return '<div class="prepayRow">' +
          '<span class="prepayCell"><label>' + esc(t('month_no')) + '</label>' +
          '<input id="pp_m_' + i + '" class="areainput ppinput" type="number" inputmode="numeric" min="1" step="1" value="' + p.m + '" aria-label="prepayment month number"></span>' +
          '<span class="prepayCell"><label>' + esc(t('amount_lbl')) + ' (₹)</label>' +
          '<input id="pp_a_' + i + '" class="areainput ppinput" type="number" inputmode="numeric" min="0" step="10000" value="' + p.amt + '" aria-label="prepayment amount"></span>' +
          '<button class="ppdel" data-action="pp-del" data-idx="' + i + '" aria-label="remove prepayment">✕</button></div>';
      }).join('') + '</div>' +
      '<button class="chip" data-action="pp-add" style="margin-top:6px">＋ ' + esc(t('add_prepay')) + '</button>' +
      '<p class="footnote" style="margin:8px 0 0">' + esc(t('prepay_hint')) + '</p></div>' +

      '<div id="loanResults"></div>';

    update();
    updaters.loan = update;
    return Promise.resolve();
  }

  /* ---------------- render dispatcher ---------------- */
  function render() {
    if (pendingRoute) { state.route = pendingRoute; pendingRoute = null; }
    else { state.route = parseHash(); }
    setActiveTab(state.route.view);
    updaters.mat = null; updaters.store = null; updaters.calc = null; updaters.loan = null; updaters.quote = null; updaters.builder = null;
    main.scrollTop = 0;
    var p;
    switch (state.route.view) {
      case 'materials': p = viewMaterials(); break;
      case 'material': p = viewMaterial(state.route.param); break;
      case 'stores': p = viewStores(); break;
      case 'builders': p = viewBuilders(); break;
      case 'builder': p = viewBuilder(state.route.param); break;
      case 'calc': p = viewCalc(); break;
      case 'store': p = viewStore(state.route.param); break;
      case 'saved': p = viewSaved(); break;
      default: p = viewHome();
    }
    p.catch(function () {
      main.innerHTML = '<div class="empty"><div class="e-ico">📡</div><h3>' + esc(t('error')) + '</h3>' +
        '<p>' + esc(t('no_results_hint')) + '</p>' +
        '<button class="btn dark" style="flex:none" data-action="retry">' + esc(t('retry')) + '</button></div>';
    });
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var act = el.dataset.action;

    switch (act) {
      case 'nav':
        if (el.dataset.focus) state.focusSearch = true;
        go(el.dataset.route);
        break;
      case 'cat-open':
        state.matFilter.cat = el.dataset.cat;
        state.matFilter.q = '';
        go('#/materials');
        break;
      case 'open-material':
        go('#/material/' + encodeURIComponent(el.dataset.slug));
        break;
      case 'open-store':
        go('#/store/' + encodeURIComponent(el.dataset.slug));
        break;
      case 'back':
        go(el.dataset.to || '#/home');
        break;
      case 'matcat':
        state.matFilter.cat = el.dataset.cat;
        render();
        break;
      case 'city':
        state.storeFilter.city = el.dataset.city;
        render();
        break;
      case 'open-builder':
        go('#/builder/' + encodeURIComponent(el.dataset.slug));
        break;
      case 'buildertype':
        state.builderFilter.type = el.dataset.val;
        render();
        break;
      case 'buildercity':
        state.builderFilter.city = el.dataset.val;
        render();
        break;
      case 'calcmode':
        state.calcMode = ['materials', 'loan', 'builderrate'].indexOf(el.dataset.val) >= 0 ? el.dataset.val : 'materials';
        persistSet('br_cmode', state.calcMode);
        render();
        break;
      case 'quoteset':
        if (['rate', 'floors', 'area'].indexOf(el.dataset.key) >= 0 && isFinite(+el.dataset.val)) {
          state.quote[el.dataset.key] = +el.dataset.val;
          persistSet('br_quote', state.quote);
        }
        render();
        break;
      case 'quotestep': {
        var qk = el.dataset.key, qd = +el.dataset.delta;
        var qlim = { rate: [500, 6000], area: [300, 10000] }[qk];
        if (qlim) {
          state.quote[qk] = Math.round(Math.max(qlim[0], Math.min(qlim[1], (+state.quote[qk] || 0) + qd)));
          persistSet('br_quote', state.quote);
        }
        render();
        break;
      }
      case 'loanset':
        state.loan[el.dataset.key] = +el.dataset.val;
        persistSet('br_loan', state.loan);
        render();
        break;
      case 'loanstep': {
        var key = el.dataset.key, d = +el.dataset.delta;
        var lim = { lakh: [3, 500], dp: [1, 90], rate: [4, 20], years: [1, 40] }[key];
        if (lim) {
          var v = Math.max(lim[0], Math.min(lim[1], (+state.loan[key] || 0) + d));
          state.loan[key] = (key === 'rate') ? Math.round(v * 100) / 100 : Math.round(v);
          persistSet('br_loan', state.loan);
        }
        render();
        break;
      }
      case 'pp-add': {
        var ps = state.loan.prepays || [];
        var lastM = ps.length ? ps[ps.length - 1].m : 1;
        ps.push({ m: Math.min(lastM + 12, state.loan.years * 12), amt: 100000 });
        state.loan.prepays = ps;
        persistSet('br_loan', state.loan);
        render();
        break;
      }
      case 'pp-del':
        state.loan.prepays.splice(+el.dataset.idx, 1);
        persistSet('br_loan', state.loan);
        render();
        break;
      case 'calcset':
        state.calc[el.dataset.key] = el.dataset.val;
        persistSet('br_calc', state.calc);
        render();
        break;
      case 'calcstep':
        state.calc.area = Math.max(100, Math.min(100000, (+state.calc.area || 1000) + (+el.dataset.delta || 0)));
        persistSet('br_calc', state.calc);
        render();
        break;
      case 'toggle-fav':
        toggleFav(el.dataset.type, el.dataset.slug);
        el.classList.toggle('faved');
        if (state.route.view === 'saved') render();
        break;
      case 'chat-open':
        chatOpen();
        break;
      case 'img-regen': {
        var im = state.chat.msgs.filter(function (x) { return x.iid === el.dataset.iid; })[0];
        if (im && im.imgq) {
          im.img = imgUrl(im.imgq, Math.floor(Math.random() * 1e6));
          persistSet('br_chat', state.chat.msgs);
          chatRender();
        }
        break;
      }
      case 'chat-clear': {
        state.chat.msgs = [{ r: 'a', h: chatFmt(t('ai_greeting')) }];
        persistSet('br_chat', state.chat.msgs);
        document.getElementById('aiCfg').hidden = true;
        document.getElementById('chatSugg').style.display = '';
        chatSuggRender();
        chatRender();
        toast(t('ai_cleared'));
        break;
      }
      case 'chat-close':
        chatClose();
        break;
      case 'chat-sugg':
        chatSend(el.dataset.q || '');
        break;
      case 'chat-cfg':
        document.getElementById('aiCfg').hidden = !document.getElementById('aiCfg').hidden;
        if (!document.getElementById('aiCfg').hidden) aiCfgRender();
        break;
      case 'llm-prov': {
        var key = document.getElementById('llmKey') ? document.getElementById('llmKey').value : '';
        state.llm.p = ['free', 'gemini', 'openrouter', 'groq', 'custom'].indexOf(el.dataset.val) >= 0 ? el.dataset.val : 'free';
        state.llm.key = key;
        aiCfgRender();
        break;
      }
      case 'llm-save': {
        var k = (document.getElementById('llmKey').value || '').trim();
        var m = (document.getElementById('llmModel') ? document.getElementById('llmModel').value : '').trim();
        var u = (document.getElementById('llmUrl') ? document.getElementById('llmUrl').value : '').trim();
        state.llm.key = k; state.llm.model = m; state.llm.url = u;
        persistSet('br_llm', state.llm);
        aiStatusRender();
        document.getElementById('aiCfg').hidden = true;
        toast(state.llm.p === 'free' ? 'AI: ' + t('ai_mode_online') : (k ? 'AI: ' + t('ai_mode_full') : 'AI: ' + t('ai_mode_off')));
        break;
      }
      case 'llm-clear':
        state.llm.key = '';
        persistSet('br_llm', state.llm);
        aiStatusRender();
        aiCfgRender();
        break;
      case 'chat-act':
        chatClose();
        go(el.dataset.hash);
        break;
      case 'about':
        document.getElementById('sheetBackdrop').hidden = false;
        document.getElementById('aboutSheet').hidden = false;
        break;
      case 'close-about':
        document.getElementById('sheetBackdrop').hidden = true;
        document.getElementById('aboutSheet').hidden = true;
        break;
      case 'retry':
        render();
        break;
    }
  });

  document.getElementById('sheetBackdrop').addEventListener('click', function () {
    document.getElementById('sheetBackdrop').hidden = true;
    document.getElementById('aboutSheet').hidden = true;
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'matSearch') {
      state.matFilter.q = e.target.value;
      if (updaters.mat) updaters.mat();
    }
    if (e.target.id === 'storeSearch') {
      state.storeFilter.q = e.target.value;
      if (updaters.store) updaters.store();
    }
    if (e.target.id === 'builderSearch') {
      state.builderFilter.q = e.target.value;
      if (updaters.builder) updaters.builder();
    }
    if (e.target.id === 'loanCost') {
      var lakhs = parseInt(e.target.value, 10);
      if (!isNaN(lakhs) && lakhs >= 3) {
        state.loan.lakh = Math.min(500, lakhs);
        persistSet('br_loan', state.loan);
        if (updaters.loan) updaters.loan();
      }
    }
    if (e.target.id === 'loanRate') {
      var rt = parseFloat(e.target.value);
      if (!isNaN(rt) && rt >= 4 && rt <= 20) {
        state.loan.rate = rt;
        persistSet('br_loan', state.loan);
        if (updaters.loan) updaters.loan();
      }
    }
    if (e.target.id === 'loanDp') {
      var dpv = parseFloat(e.target.value);
      if (!isNaN(dpv) && dpv >= 1 && dpv <= 90) {
        state.loan.dp = dpv;
        persistSet('br_loan', state.loan);
        if (updaters.loan) updaters.loan();
      }
    }
    if (e.target.id === 'loanYears') {
      var yrv = parseInt(e.target.value, 10);
      if (!isNaN(yrv) && yrv >= 1 && yrv <= 40) {
        state.loan.years = yrv;
        persistSet('br_loan', state.loan);
        if (updaters.loan) updaters.loan();
      }
    }
    if (e.target.id && e.target.id.indexOf('pp_') === 0) {
      var pparts = e.target.id.split('_'), pidx = +pparts[2], pIsAmt = pparts[1] === 'a';
      var ps2 = state.loan.prepays || [];
      if (ps2[pidx]) {
        var pv = parseInt(e.target.value, 10);
        if (!isNaN(pv) && pv >= 0) {
          if (pIsAmt) ps2[pidx].amt = pv;
          else ps2[pidx].m = Math.max(1, pv);
          persistSet('br_loan', state.loan);
          if (updaters.loan) updaters.loan();
        }
      }
    }
    if (e.target.id === 'quoteRate') {
      var qrv = parseFloat(e.target.value);
      if (!isNaN(qrv) && qrv >= 500 && qrv <= 6000) {
        state.quote.rate = qrv;
        persistSet('br_quote', state.quote);
        if (updaters.quote) updaters.quote();
      }
    }
    if (e.target.id === 'quoteArea') {
      var qav = parseInt(e.target.value, 10);
      if (!isNaN(qav) && qav >= 300 && qav <= 10000) {
        state.quote.area = qav;
        persistSet('br_quote', state.quote);
        if (updaters.quote) updaters.quote();
      }
    }
    if (e.target.id === 'calcArea') {
      var v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 100) {
        state.calc.area = Math.min(100000, v);
        persistSet('br_calc', state.calc);
        if (updaters.calc) updaters.calc();
      }
    }
  });

  /* language toggle */
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.placeholder = t(el.dataset.i18nPh);
    });
    document.documentElement.lang = state.lang === 'ta' ? 'ta' : 'en';
    document.getElementById('langToggle').textContent = state.lang === 'ta' ? 'A' : 'அ';
  }
  document.getElementById('langToggle').addEventListener('click', function () {
    state.lang = state.lang === 'en' ? 'ta' : 'en';
    persistSet('br_lang', state.lang);
    applyI18n();
    render();
  });

  window.addEventListener('hashchange', function () {
    /* Skip the echo of our own hash update; only real back/forward
       or manual URL changes should trigger a re-render. */
    if (lastSetHash !== null && location.hash === lastSetHash) { lastSetHash = null; return; }
    lastSetHash = null;
    render();
  });
  applyI18n();
  render();
})();
