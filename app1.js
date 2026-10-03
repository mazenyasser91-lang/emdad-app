'use strict';
  var API = 'https://mazen1991.app.n8n.cloud/webhook/emdad-app-api';
  var S = { token: null, user: null, view: 'search', q: '', results: [], item: null, period: 'month', from: '', to: '', tab: 'sales', users: [], editing: null, busy: false, error: '', menu: false };
  var app = document.getElementById('app');
  var fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  var fmt0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  var MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) { return '<span class="num">' + fmt.format(Number(v) || 0) + '</span>'; }
  function money(v) { return '<span class="num">' + fmt0.format(Number(v) || 0) + '</span> ر.س'; }
  function riyadhToday() { return new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); }
  function addDays(d, k) { var x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); }
  function stripCode(name) { return String(name || '').replace(/^\[[^\]]*\]\s*/, ''); }

  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function api(payload) {
    if (S.token && !payload.token) payload.token = S.token;
    var body = new URLSearchParams(); body.set('p', JSON.stringify(payload));
    return fetch(API, { method: 'POST', body: body }).then(function (r) {
      if (!r.ok) throw new Error('السيرفر رجّع خطأ (' + r.status + ')');
      return r.json();
    }).then(function (d) {
      if (!d || d.ok === false) {
        if (d && d.code === 'auth') { logout(true); }
        if (d && d.code === 'must_change') { S.user.must_change = true; S.view = 'password'; render(); }
        throw new Error((d && d.error) || 'خطأ غير معروف');
      }
      return d;
    }, function (e) {
      if (e instanceof TypeError) throw new Error('تعذّر الاتصال — تأكد من الإنترنت وحاول تاني');
      throw e;
    });
  }

  function setPeriod(p) {
    var t = riyadhToday(); S.period = p;
    if (p === 'today') { S.from = t; S.to = t; }
    else if (p === '7d') { S.from = addDays(t, -6); S.to = t; }
    else if (p === 'month') { S.from = t.slice(0, 8) + '01'; S.to = t; }
    else if (p === 'last') { var f = new Date(t.slice(0, 8) + '01T00:00:00Z'); f.setUTCMonth(f.getUTCMonth() - 1); S.from = f.toISOString().slice(0, 10); S.to = addDays(t.slice(0, 8) + '01', -1); }
    else if (p === '90d') { S.from = addDays(t, -89); S.to = t; }
    else if (p === 'ytd') { S.from = t.slice(0, 4) + '-01-01'; S.to = t; }
  }

  // ================= views =================
  function render() {
    if (!S.token) return renderLogin();
    if (S.user && S.user.must_change) return renderPassword(true);
    var body = '';
    if (S.view === 'search') body = viewSearch();
    else if (S.view === 'item') body = viewItem();
    else if (S.view === 'users') body = viewUsers();
    else if (S.view === 'password') return renderPassword(false);
    app.innerHTML = shell(body);
    bindShell(); bindView();
  }

  function shell(body) {
    return '<header class="top"><div class="top-row">' +
      '<img src="logo.png" alt="الإمداد العصري">' +
      '<div class="who">' + esc(S.user ? S.user.name : '') + '</div>' +
      '<button class="menu-btn" id="menuBtn" aria-label="القائمة" aria-expanded="' + S.menu + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      (S.menu ? '<div class="menu" role="menu">' +
        '<button data-go="search">البحث عن صنف</button>' +
        (S.user && S.user.role === 'admin' ? '<button data-go="users">المستخدمين</button>' : '') +
        '<button data-go="password">تغيير كلمة المرور</button>' +
        '<button data-go="logout">تسجيل الخروج</button></div>' : '') +
      '</div></header><main>' + body + '</main>';
  }

  function bindShell() {
    var mb = document.getElementById('menuBtn');
    if (mb) mb.onclick = function (e) { e.stopPropagation(); S.menu = !S.menu; render(); };
    app.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () {
        var g = b.getAttribute('data-go'); S.menu = false;
        if (g === 'logout') return logout();
        if (g === 'users') return openUsers();
        S.view = g; S.error = ''; render();
      };
    });
  }
  document.addEventListener('click', function () { if (S.menu) { S.menu = false; render(); } });

  // ---------- login ----------
  function renderLogin() {
    app.innerHTML = '<div class="auth"><form class="auth-card" id="loginForm" autocomplete="on">' +
      '<img src="logo.png" alt="الإمداد العصري">' +
      '<p class="lead">استعلام مبيعات وأرصدة الأصناف</p>' +
      (S.error ? '<div class="err" role="alert">' + esc(S.error) + '</div>' : '') +
      '<label class="field"><span>اسم المستخدم</span><input name="u" autocomplete="username" autocapitalize="none" spellcheck="false" required dir="ltr"></label>' +
      '<label class="field"><span>كلمة المرور</span><input name="p" type="password" autocomplete="current-password" required dir="ltr"></label>' +
      '<button class="btn" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'جاري الدخول…' : 'دخول') + '</button>' +
      '</form></div>';
    var f = document.getElementById('loginForm');
    f.onsubmit = function (e) {
      e.preventDefault(); if (S.busy) return;
      var u = f.u.value.trim(), p = f.p.value;
      S.busy = true; S.error = ''; renderLogin();
      api({ action: 'login', username: u, password: p }).then(function (d) {
        S.busy = false; S.token = d.token; S.user = d.user; store('emdad_token', d.token); store('emdad_user', JSON.stringify(d.user));
        S.view = 'search'; render();
      }).catch(function (err) { S.busy = false; S.error = err.message; renderLogin(); });
    };
  }

  function logout(expired) {
    S.token = null; S.user = null; S.item = null; S.results = []; S.q = ''; S.menu = false;
    store('emdad_token', null); store('emdad_user', null);
    S.error = expired ? 'انتهت الجلسة — سجّل الدخول من جديد' : ''; render();
  }

  // ---------- password ----------
  function renderPassword(forced) {
    var html = '<form class="auth-card" id="pwForm" style="margin:0 auto">' +
      (forced ? '<img src="logo.png" alt="الإمداد العصري"><div class="note">أول مرة تدخل — اختار كلمة مرور جديدة خاصة بيك.</div>' : '<h1 style="font-size:20px;text-align:right">تغيير كلمة المرور</h1>') +
      (S.error ? '<div class="err" role="alert">' + esc(S.error) + '</div>' : '') +
      '<label class="field"><span>كلمة المرور الحالية</span><input name="o" type="password" autocomplete="current-password" required dir="ltr"></label>' +
      '<label class="field"><span>كلمة المرور الجديدة (8 حروف على الأقل، حروف وأرقام)</span><input name="n" type="password" autocomplete="new-password" minlength="8" required dir="ltr"></label>' +
      '<label class="field"><span>تأكيد كلمة المرور الجديدة</span><input name="c" type="password" autocomplete="new-password" minlength="8" required dir="ltr"></label>' +
      '<button class="btn" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'جاري الحفظ…' : 'حفظ كلمة المرور') + '</button>' +
      (forced ? '<p style="margin-top:14px"><button type="button" class="linkbtn" id="pwOut">تسجيل الخروج</button></p>' : '') +
      '</form>';
    if (forced) app.innerHTML = '<div class="auth">' + html + '</div>';
    else { app.innerHTML = shell(html); bindShell(); }
    var f = document.getElementById('pwForm');
    var out = document.getElementById('pwOut'); if (out) out.onclick = function () { logout(); };
    f.onsubmit = function (e) {
      e.preventDefault(); if (S.busy) return;
      if (f.n.value !== f.c.value) { S.error = 'كلمتين المرور الجديدة مش متطابقين'; return renderPassword(forced); }
      S.busy = true; S.error = ''; renderPassword(forced);
      api({ action: 'change_password', old_password: f.o.value, new_password: f.n.value }).then(function (d) {
        S.busy = false; S.token = d.token; S.user = d.user; store('emdad_token', d.token); store('emdad_user', JSON.stringify(d.user));
        S.view = 'search'; render(); toast('تم تغيير كلمة المرور');
      }).catch(function (err) { S.busy = false; S.error = err.message; renderPassword(forced); });
    };
  }

  // ---------- search ----------
  var searchTimer = null, searchSeq = 0;
  function viewSearch() {
    var list = '';
    if (S.busy && !S.results.length) list = '<div class="loading"><div class="spin"></div></div>';
    else if (S.error) list = '<div class="err">' + esc(S.error) + '</div>';
    else if (S.q.length >= 2 && !S.results.length) list = '<div class="hint">مفيش أصناف بالاسم أو الكود ده.</div>';
    else if (!S.q) list = '<div class="hint">اكتب اسم الصنف أو الكود أو امسح الباركود<br>وهتظهرلك مبيعاته في كل الفروع ورصيده في كل مستودع.</div>';
    else if (S.results.length) list = '<ul class="results">' + S.results.map(function (p) {
      return '<li><button data-id="' + p.id + '"><div class="r-main"><div class="r-name">' + esc(stripCode(p.name)) + '</div>' +
        '<div class="r-meta"><span class="num">' + esc(p.code) + '</span> · ' + esc(p.categ) + '</div></div>' +
        '<div class="r-qty"><b class="num">' + fmt.format(p.qty) + '</b><small>الرصيد</small></div></button></li>';
    }).join('') + '</ul>';
    return '<div class="search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input id="q" type="search" inputmode="search" placeholder="اسم الصنف أو الكود أو الباركود" value="' + esc(S.q) + '" autocomplete="off" enterkeyhint="search" aria-label="بحث عن صنف"></div>' +
      '<div id="resList">' + list + '</div>';
  }
  function runSearch() {
    var q = S.q, seq = ++searchSeq;
    if (q.length < 2) { S.results = []; S.busy = false; S.error = ''; return refreshList(); }
    S.busy = true; S.error = ''; refreshList();
    api({ action: 'search', q: q }).then(function (d) {
      if (seq !== searchSeq) return; S.busy = false; S.results = d.items || []; refreshList();
    }).catch(function (e) { if (seq !== searchSeq) return; S.busy = false; S.error = e.message; refreshList(); });
  }
  function refreshList() {
    if (S.view !== 'search') return;
    var tmp = document.createElement('div'); tmp.innerHTML = viewSearch();
    var box = document.getElementById('resList'); if (!box) return;
    box.innerHTML = tmp.querySelector('#resList').innerHTML; bindResults();
  }
  function bindResults() {
    app.querySelectorAll('#resList [data-id]').forEach(function (b) { b.onclick = function () { openItem(parseInt(b.getAttribute('data-id'), 10)); }; });
  }
