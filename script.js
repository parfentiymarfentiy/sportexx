/* ═══════════════════════════════════════════════
   SportEx — script.js  v2
   Fixes:
   1. Cursor works on splash screen
   2. After lang select → smooth reveal of main page
   3. Size selector (XS S M L XL XXL) in checkout
   4. Phone mask allows full 10-digit UA number
   5. Telegram bot LIVE — token + chat_id inserted
═══════════════════════════════════════════════ */

'use strict';

/* ─── TELEGRAM CONFIG ────────────────────────── */
const TG_TOKEN   = '8667869989:AAF5GKSaQZQY5o5-nSp7icEE4K8XBCUG8eI';
const TG_CHAT_ID = '6669059584';

/* ─── STATE ──────────────────────────────────── */
const State = {
  lang: localStorage.getItem('sx_lang') || null,
  dict: {},
  allLang: {},
  products: [],
  currentProduct: null,
};

/* ─── DOM HELPERS ────────────────────────────── */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ═══════════════════════════════════════════════
   BOOT — always start cursor first
═══════════════════════════════════════════════ */
async function boot() {
  initCursor(); // <- runs immediately, before any fetch

  try {
    const [langData, products] = await Promise.all([
      fetch('lang.json').then(r => r.json()),
      fetch('products.json').then(r => r.json()),
    ]);
    State.products = products;
    State.allLang  = langData;

    if (!State.lang) {
      showSplash(langData);
    } else {
      applyLang(langData[State.lang]);
      initApp();
    }
  } catch (err) {
    console.error('Boot failed:', err);
    initApp();
  }
}

/* ═══════════════════════════════════════════════
   CURSOR  — runs from page load, covers splash too
═══════════════════════════════════════════════ */
function initCursor() {
  const cursor = $('#cursor');
  const ring   = $('#cursor-ring');
  if (!cursor || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  (function animRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  })();

  // Delegated hover — works on dynamically added elements
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a,button,[role="button"],.product-card,.cat-card')) {
      cursor.style.width  = '20px';
      cursor.style.height = '20px';
      ring.style.width    = '52px';
      ring.style.height   = '52px';
      ring.style.opacity  = '0.9';
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a,button,[role="button"],.product-card,.cat-card')) {
      cursor.style.width  = '12px';
      cursor.style.height = '12px';
      ring.style.width    = '36px';
      ring.style.height   = '36px';
      ring.style.opacity  = '0.6';
    }
  });
}

/* ═══════════════════════════════════════════════
   SPLASH
═══════════════════════════════════════════════ */
function showSplash(langData) {
  const splash = $('#splash');
  if (!splash) return;
  splash.classList.remove('hidden');

  $$('.splash-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      State.lang = btn.dataset.lang;
      localStorage.setItem('sx_lang', State.lang);
      applyLang(langData[State.lang]);

      splash.style.transition = 'opacity .45s ease, transform .45s ease';
      splash.style.opacity    = '0';
      splash.style.transform  = 'scale(1.04)';

      setTimeout(() => {
        splash.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'instant' });
        initApp();
      }, 460);
    });
  });
}

/* ═══════════════════════════════════════════════
   I18N
═══════════════════════════════════════════════ */
function applyLang(dict) {
  if (!dict) return;
  State.dict = dict;

  $$('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key] === undefined) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = dict[key];
    } else if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = dict[key];
    } else {
      el.textContent = dict[key];
    }
  });

  $$('.lang-switch-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === State.lang)
  );

  document.documentElement.lang = State.lang === 'ua' ? 'uk' : (State.lang || 'ru');
}

function t(key) { return State.dict[key] || key; }

/* ═══════════════════════════════════════════════
   INIT APP
═══════════════════════════════════════════════ */
function initApp() {
  initHeader();
  initMobileNav();
  initReveal();
  renderProducts();
  initLangSwitch();
  handleUrlProduct();
  window.addEventListener('popstate', handleUrlProduct);
}

function initHeader() {
  const h = $('#header');
  if (!h) return;
  window.addEventListener('scroll', () =>
    h.classList.toggle('scrolled', scrollY > 50), { passive: true });
}

function initMobileNav() {
  const burger = $('#burgerBtn');
  const nav    = $('#mobileNav');
  if (!burger || !nav) return;
  burger.addEventListener('click', () => nav.classList.add('open'));
  $('#closeNav')?.addEventListener('click', () => nav.classList.remove('open'));
  $$('.mobile-nav a').forEach(a =>
    a.addEventListener('click', () => nav.classList.remove('open')));
}

function initReveal() {
  const obs = new IntersectionObserver(entries =>
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1 }
  );
  $$('.reveal').forEach(el => obs.observe(el));
}

function initLangSwitch() {
  $$('.lang-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      State.lang = btn.dataset.lang;
      localStorage.setItem('sx_lang', State.lang);
      applyLang(State.allLang[State.lang]);
      renderProducts();
      if (State.currentProduct) renderProductPage(State.currentProduct);
    });
  });
}

/* ═══════════════════════════════════════════════
   PRODUCTS
═══════════════════════════════════════════════ */
function getProductName(p) {
  return State.lang === 'ua' ? p.name_ua
       : State.lang === 'en' ? p.name_en
       : p.name;
}

function renderProducts() {
  const grid = $('#productsGrid');
  if (!grid) return;
  const dict = State.dict;
  grid.innerHTML = '';

  State.products.forEach((p, i) => {
    const name  = getProductName(p);
    const badge = p.badge === 'new' ? (dict.badge_new || 'NEW')
                : p.badge === 'hit' ? (dict.badge_hit || 'ХИТ') : '';

    const card = document.createElement('div');
    card.className = `product-card reveal reveal-delay-${(i % 4) + 1}`;
    card.dataset.productId = p.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${p.image}" alt="${name}" class="product-img" loading="lazy"
          onerror="this.src='https://placehold.co/400x400/161616/444?text=SportEx'"/>
        ${badge ? `<span class="product-badge">${badge}</span>` : ''}
      </div>
      <div class="product-info">
        <div class="product-name">${name}</div>
        <div class="product-footer">
          <div class="product-price">${p.price.toLocaleString('uk-UA')}<span> ₴</span></div>
          <button class="btn-buy" aria-label="${dict.btn_buy || 'Купить'}">→</button>
        </div>
      </div>`;

    card.addEventListener('click', e => {
      if (!e.target.closest('.btn-buy')) openProductPage(p.id);
    });
    card.querySelector('.btn-buy').addEventListener('click', e => {
      e.stopPropagation();
      openCheckout(p);
    });
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openProductPage(p.id); });
    grid.appendChild(card);
  });

  initReveal();
}

/* ═══════════════════════════════════════════════
   PRODUCT PAGE
═══════════════════════════════════════════════ */
function openProductPage(id) {
  const p = State.products.find(x => x.id === id);
  if (!p) return;
  State.currentProduct = p;
  history.pushState({ productId: id }, '', `?product=${id}`);
  renderProductPage(p);
}

function closeProductPage() {
  State.currentProduct = null;
  history.pushState({}, '', window.location.pathname);
  const o = $('#productOverlay');
  if (o) { o.classList.remove('open'); setTimeout(() => o.remove(), 400); }
  document.body.style.overflow = '';
}

function handleUrlProduct() {
  const id = parseInt(new URLSearchParams(location.search).get('product'));
  if (id) {
    const p = State.products.find(x => x.id === id);
    if (p) { State.currentProduct = p; renderProductPage(p); return; }
  }
  const o = $('#productOverlay');
  if (o) { o.classList.remove('open'); setTimeout(() => o.remove(), 400); document.body.style.overflow = ''; }
}

function renderProductPage(product) {
  $('#productOverlay')?.remove();
  const dict = State.dict;
  const name = getProductName(product);

  const overlay = document.createElement('div');
  overlay.id = 'productOverlay';
  overlay.className = 'product-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="product-overlay-inner">
      <button class="product-back-btn" id="productBackBtn">
        ${dict.product_back || '← Назад в каталог'}
      </button>
      <div class="product-page-grid">
        <div class="product-page-img-wrap">
          <img src="${product.image}" alt="${name}" class="product-page-img"
            onerror="this.src='https://placehold.co/600x600/161616/444?text=SportEx'"/>
        </div>
        <div class="product-page-info">
          <div class="product-page-label">
            ${product.category.toUpperCase()}${product.brand ? ' · ' + product.brand : ''}
          </div>
          <h1 class="product-page-name">${name}</h1>
          <div class="product-page-price">${product.price.toLocaleString('uk-UA')} <span>₴</span></div>
          <div class="product-page-meta">
            ${product.brand ? `<div class="meta-row"><span>${dict.product_brand || 'Бренд'}:</span><strong>${product.brand}</strong></div>` : ''}
            ${product.sku   ? `<div class="meta-row"><span>${dict.product_sku   || 'Артикул'}:</span><strong>${product.sku}</strong></div>` : ''}
            <div class="meta-row meta-available">
              <span class="available-dot"></span>
              <span>${dict.product_available || 'В наличии'}</span>
            </div>
          </div>
          <button class="btn-primary product-buy-btn" id="productBuyBtn">
            ${dict.product_btn_buy || 'Оформить заказ'}
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('open'));

  $('#productBackBtn').addEventListener('click', closeProductPage);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeProductPage(); });
  $('#productBuyBtn').addEventListener('click', () => openCheckout(product));
  const onEsc = e => {
    if (e.key === 'Escape') { closeProductPage(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);
}

/* ═══════════════════════════════════════════════
   CHECKOUT MODAL
═══════════════════════════════════════════════ */
function openCheckout(product) {
  $('#checkoutModal')?.remove();
  const dict = State.dict;
  const name = getProductName(product);

  const modal = document.createElement('div');
  modal.id = 'checkoutModal';
  modal.className = 'checkout-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="checkout-inner">
      <button class="checkout-close-btn" id="checkoutCloseBtn" aria-label="Закрыть">✕</button>
      <h2 class="checkout-title">${dict.checkout_title || 'Оформление заказа'}</h2>

      <div class="checkout-product-info">
        <img src="${product.image}" alt="${name}" class="checkout-product-img"
          onerror="this.src='https://placehold.co/80x80/161616/444?text=SX'"/>
        <div>
          <div class="checkout-product-name">${name}</div>
          <div class="checkout-product-price">${product.price.toLocaleString('uk-UA')} ₴</div>
        </div>
      </div>

      <form id="checkoutForm" novalidate autocomplete="on">

        <div class="form-group">
          <label for="cf-name">${dict.checkout_name || 'Имя *'}</label>
          <input type="text" id="cf-name" name="name" required autocomplete="given-name"
            placeholder="${dict.checkout_name_ph || 'Ваше имя'}"/>
          <span class="field-error" id="err-name"></span>
        </div>

        <div class="form-group">
          <label for="cf-phone">${dict.checkout_phone || 'Телефон *'}</label>
          <input type="tel" id="cf-phone" name="phone" required autocomplete="tel"
            placeholder="+380 (99) 999-99-99" maxlength="19"/>
          <span class="field-error" id="err-phone"></span>
        </div>

        <div class="form-group">
          <label for="cf-city">${dict.checkout_city || 'Город *'}</label>
          <input type="text" id="cf-city" name="city" required autocomplete="address-level2"
            placeholder="${dict.checkout_city_ph || 'Введите город'}" list="ukraine-cities"/>
          <datalist id="ukraine-cities">
            <option value="Одеса"><option value="Київ"><option value="Харків">
            <option value="Дніпро"><option value="Запоріжжя"><option value="Львів">
            <option value="Миколаїв"><option value="Херсон"><option value="Полтава">
            <option value="Черкаси"><option value="Вінниця"><option value="Житомир">
            <option value="Суми"><option value="Хмельницький"><option value="Рівне">
            <option value="Тернопіль"><option value="Луцьк"><option value="Ужгород">
            <option value="Чернівці"><option value="Чернігів"><option value="Кропивницький">
          </datalist>
          <span class="field-error" id="err-city"></span>
        </div>

        <!-- ═══ SIZE SELECTOR ═══ -->
        <div class="form-group">
          <label>${dict.checkout_size || 'Размер'}</label>
          <div class="size-options">
            ${['XS','S','M','L','XL','XXL'].map((s,i) => `
              <label class="size-btn-label">
                <input type="radio" name="size" value="${s}" ${i===2?'checked':''}>
                <span class="size-btn">${s}</span>
              </label>`).join('')}
          </div>
        </div>

        <!-- ═══ DELIVERY ═══ -->
        <div class="form-group">
          <label>${dict.checkout_delivery || 'Служба доставки *'}</label>
          <div class="delivery-options">
            <label class="radio-label">
              <input type="radio" name="delivery" value="nova" checked>
              <span class="radio-custom"></span>
              <span>${dict.checkout_nova || 'Нова Пошта'}</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="delivery" value="ukr">
              <span class="radio-custom"></span>
              <span>${dict.checkout_ukr || 'Укрпошта'}</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="cf-branch">${dict.checkout_branch || 'Номер отделения'}</label>
          <input type="text" id="cf-branch" name="branch"
            placeholder="${dict.checkout_branch_ph || '№ отделения'}"/>
        </div>

        <button type="submit" class="btn-primary checkout-submit-btn">
          ${dict.checkout_btn || 'Подтвердить заказ'}
        </button>
      </form>

      <div class="checkout-success hidden" id="checkoutSuccess">
        <div class="success-icon">✓</div>
        <p>${dict.checkout_success || '🎉 Спасибо за заказ! Мы свяжемся с вами.'}</p>
        <button class="btn-outline success-close-btn" id="successCloseBtn">
          ${dict.checkout_close || 'Закрыть'}
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.classList.add('open'));

  /* Phone mask */
  const ph = $('#cf-phone', modal);
  ph.addEventListener('input', () => applyPhoneMask(ph));

  /* Close handlers */
  $('#checkoutCloseBtn').addEventListener('click', closeCheckout);
  modal.addEventListener('click', e => { if (e.target === modal) closeCheckout(); });
  const onEsc = e => {
    if (e.key === 'Escape') { closeCheckout(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);

  /* Submit */
  $('#checkoutForm').addEventListener('submit', e => {
    e.preventDefault();
    if (validateCheckoutForm(modal)) submitOrder(collectFormData(modal, product));
  });

  $('#successCloseBtn')?.addEventListener('click', closeCheckout);
}

function closeCheckout() {
  const m = $('#checkoutModal');
  if (!m) return;
  m.classList.remove('open');
  setTimeout(() => {
    m.remove();
    if (!$('#productOverlay')) document.body.style.overflow = '';
  }, 400);
}

/* ─── Phone mask
   Ukrainian number: +380 XX XXX-XX-XX
   After +380 there are EXACTLY 9 digits (operator 2d + number 7d)
   Example: +380 99 421-22-38
   Full raw digits (with 380): 12 total
   maxlength="19" in the input fits:  +380 (99) 999-99-99  = 19 chars
─── */
function applyPhoneMask(input) {
  let d = input.value.replace(/\D/g, '');

  // Strip country code if pasted with it
  if (d.startsWith('380'))     d = d.slice(3);
  else if (d.startsWith('80')) d = d.slice(2);
  else if (d.startsWith('0'))  d = d.slice(1);

  d = d.slice(0, 9); // max 9 local digits

  let out = '+380 ';
  if (d.length > 0) out += '(' + d.slice(0, 2);
  if (d.length >= 2) out += ') ' + d.slice(2, 5);
  if (d.length >= 5) out += '-' + d.slice(5, 7);
  if (d.length >= 7) out += '-' + d.slice(7, 9);

  input.value = out;
}

/* ─── Validation ─── */
function validateCheckoutForm(modal) {
  let ok = true;
  const err = (id, msg) => {
    const el = $(`#${id}`, modal);
    if (el) el.textContent = msg;
    if (msg) ok = false;
  };

  err('err-name', ''); err('err-phone', ''); err('err-city', '');

  const nameVal  = $('#cf-name',  modal).value.trim();
  const phoneRaw = $('#cf-phone', modal).value.replace(/\D/g, ''); // 380 + 9 = 12 digits
  const cityVal  = $('#cf-city',  modal).value.trim();

  if (!nameVal)            err('err-name',  '⚠ Обязательное поле');
  if (phoneRaw.length < 12) err('err-phone', '⚠ Введите полный номер: +380XXXXXXXXX');
  if (!cityVal)            err('err-city',  '⚠ Обязательное поле');

  return ok;
}

/* ─── Collect ─── */
function collectFormData(modal, product) {
  const delivery = $('input[name="delivery"]:checked', modal)?.value || 'nova';
  return {
    product_id:    product.id,
    product_name:  getProductName(product),
    product_price: product.price,
    customer_name: $('#cf-name',  modal).value.trim(),
    phone:         $('#cf-phone', modal).value.trim(),
    city:          $('#cf-city',  modal).value.trim(),
    size:          $('input[name="size"]:checked', modal)?.value || '—',
    delivery,
    branch:        $('#cf-branch', modal).value.trim(),
    timestamp:     new Date().toISOString(),
    lang:          State.lang || 'ru',
  };
}

/* ═══════════════════════════════════════════════
   submitOrder — LIVE Telegram integration
═══════════════════════════════════════════════ */
async function submitOrder(data) {
  const delivLabel = data.delivery === 'nova' ? '🟡 Нова Пошта' : '🔵 Укрпошта';
  const time       = new Date(data.timestamp).toLocaleString('ru-UA', { timeZone: 'Europe/Kiev' });

  const text = [
    '🛒 <b>НОВЫЙ ЗАКАЗ — SportEx</b>',
    '',
    `📦 <b>Товар:</b> ${data.product_name}`,
    `💰 <b>Цена:</b> ${data.product_price.toLocaleString('uk-UA')} ₴`,
    `📐 <b>Размер:</b> <b>${data.size}</b>`,
    '',
    `👤 <b>Покупатель:</b> ${data.customer_name}`,
    `📞 <b>Телефон:</b> ${data.phone}`,
    `🏙 <b>Город:</b> ${data.city}`,
    `🚚 <b>Доставка:</b> ${delivLabel}`,
    `🏪 <b>Отделение:</b> ${data.branch || '—'}`,
    '',
    `🌐 <b>Язык сайта:</b> ${data.lang.toUpperCase()}`,
    `🕐 <b>Время:</b> ${time}`,
  ].join('\n');

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
      }
    );
    const json = await res.json();
    if (!json.ok) console.warn('Telegram API error:', json.description);
  } catch (e) {
    console.error('Telegram fetch failed:', e);
  }

  // Show success screen regardless of Telegram result
  const form    = $('#checkoutForm');
  const success = $('#checkoutSuccess');
  if (form && success) {
    form.style.transition = 'opacity .3s ease, transform .3s ease';
    form.style.opacity    = '0';
    form.style.transform  = 'translateY(-12px)';
    setTimeout(() => {
      form.style.display = 'none';
      success.classList.remove('hidden');
    }, 320);
  }
}

/* ─── Start ─── */
document.addEventListener('DOMContentLoaded', boot);
