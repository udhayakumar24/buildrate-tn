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
      quote_note: 'Indicative Tamil Nadu ranges (Sep 2026). Interiors/woodwork, land cost & registration are NOT included. Some builders include sump, septic or compound wall — check exactly what your package covers.'
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
      quote_note: 'தமிழ்நாட்டு சராசரி வகைப்பாடுகள் (செப். 2026). இன்டீரியர்/மர வேலை, நில விலை & பதிவுக் கட்டணம் சேர்க்கப்படவில்லை. சில பில்டர்கள் சம்ப், செப்டிக், சுற்றுசுவரையும் பேக்கேஜில் சேர்ப்பார்கள் — உங்கள் ஒப்பந்தத்தில் சரிபார்க்கவும்.'
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

  function calcEstimate(mats) {
    var by = {};
    mats.forEach(function (m) { by[m.slug] = m; });
    var c = state.calc;
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
