// شاشة إدارة أعضاء الولاء — للمدير فقط
(function () {
  var PAPI = 'https://mazen1991.app.n8n.cloud/webhook/emdad-points-api';
  var PORTAL = 'https://mazenyasser91-lang.github.io/emdad-app/points/';
  var L = { list: [], counts: null, q: '', busy: false, err: '', open: null, mode: null, result: null, loaded: false, wa: false };
  var ST = { welcomed: ['مفعّل', ''], 'new': ['مستني رسالة الترحيب', ''], disabled: ['موقوف', 'off'] };

  function local(p) { return '0' + String(p || '').slice(3); }
  function digitsOnly(v) { var d = String(v || '').replace(/[^0-9]/g, ''); if (d.indexOf('966') === 0 && d.length > 9) d = d.slice(3); if (d.charAt(0) === '0') d = d.slice(1); return d.slice(0, 9); }
  function papi(p) {
    p.stoken = S.token;
    var b = new URLSearchParams(); b.set('p', JSON.stringify(p));
    return fetch(PAPI, { method: 'POST', body: b }).then(function (r) { if (!r.ok) throw new Error('السيرفر رجّع خطأ (' + r.status + ')'); return r.json(); })
      .then(function (d) { if (!d || d.ok === false) throw new Error((d && d.error) || 'خطأ'); return d; },
        function (e) { if (e instanceof TypeError) throw new Error('تعذّر الاتصال — تأكد من الإنترنت'); throw e; });
  }
  function loadL() {
    L.busy = true; L.err = ''; render();
    papi({ action: 'adm_list', q: L.q }).then(function (d) { L.busy = false; L.loaded = true; L.list = d.members || []; L.counts = d.counts; L.wa = d.whatsapp; render(); })
      .catch(function (e) { L.busy = false; L.loaded = true; L.err = e.message; render(); });
  }
  function shareText(name, phone, pin) {
    return 'أهلاً ' + (name || '') + ' 👋\nاتسجلت في برنامج نقاط الإمداد.\nتقدر تشوف رصيد نقاطك من هنا:\n' + PORTAL +
      '\n\nرقم الجوال: ' + local(phone) + '\nالرقم السري: ' + pin + '\n\nغيّر الرقم السري بعد أول دخول.';
  }

  function viewLoyalty() {
    var h = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:4px 0 12px"><h1 style="font-size:20px;margin:0">أعضاء الولاء</h1>' +
      '<button class="btn small" id="lAdd">إضافة عضو</button></div>';
    if (L.counts) h += '<div class="note">إجمالي <b class="num">' + L.counts.total + '</b> · مفعّل <b class="num">' + L.counts.active + '</b> · مستني الترحيب <b class="num">' + L.counts.waiting + '</b> · موقوف <b class="num">' + L.counts.disabled + '</b>' +
      ' · واتساب: <b>' + (L.wa ? 'شغال' : 'متوقف') + '</b></div>';
    if (L.err) h += '<div class="err">' + esc(L.err) + '</div>';

    if (L.result) {
      var r = L.result, txt = shareText(r.name, r.phone, r.pin);
      h += '<div class="panel" style="border-color:var(--brick)"><h2>' + esc(r.title) + '</h2>' +
        '<p style="margin:0 0 6px">العميل: <b>' + esc(r.name || '—') + '</b> · <span class="num">' + local(r.phone) + '</span></p>' +
        '<p style="margin:0 0 4px;color:var(--muted);font-size:13px">الرقم السري (بيظهر مرة واحدة بس):</p>' +
        '<div class="num" style="font-size:34px;font-weight:700;letter-spacing:6px;color:var(--brick);margin-bottom:12px">' + esc(r.pin) + '</div>' +
        '<div class="row-actions"><a class="btn small" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/' + r.phone + '?text=' + encodeURIComponent(txt) + '">ابعتها واتساب</a>' +
        '<button class="btn ghost small" id="lCopy">نسخ الرسالة</button><button class="btn ghost small" id="lDone">تم</button></div></div>';
    }

    if (L.mode === 'add') {
      h += '<form class="panel" id="lAddForm"><h2>إضافة عضو جديد</h2>' +
        '<label class="field"><span>رقم الجوال</span><div style="display:flex;direction:ltr;border:1.5px solid var(--line);border-radius:12px;background:#fff;overflow:hidden"><span style="padding:13px 12px;background:var(--sand-2);color:var(--muted);font-weight:600;margin:0">+966</span><input name="ph" inputmode="numeric" placeholder="5XXXXXXXX" style="border:0;flex:1;padding:13px;font-size:16px" required></div></label>' +
        '<label class="field"><span>الاسم (مطلوب بس لو العميل مش موجود في أودو)</span><input name="nm"></label>' +
        '<p class="note" style="margin-top:0">لو العميل موجود في أودو بالرقم ده هيتربط بيه وبكارت الولاء بتاعه، ولو مش موجود هيتعمله عميل وكارت جديد.</p>' +
        '<div class="row-actions"><button class="btn small" type="submit"' + (L.busy ? ' disabled' : '') + '>' + (L.busy ? 'جاري…' : 'إضافة') + '</button><button class="btn ghost small" type="button" id="lCancel">إلغاء</button></div></form>';
    }

    h += '<div class="search" style="margin-top:4px"><input id="lq" type="search" placeholder="دوّر برقم الجوال أو الاسم" value="' + esc(L.q) + '" aria-label="بحث في الأعضاء"></div>';
    if (L.busy && !L.list.length) return h + '<div class="loading"><div class="spin"></div></div>';

    h += '<div class="panel">' + (L.list.length ? L.list.map(function (m) {
      var st = ST[m.status] || [m.status, ''], isOpen = L.open === m.phone;
      var row = '<div class="user-row" style="flex-wrap:wrap"><div class="r-main"><div><b>' + esc(m.name || 'بدون اسم') + '</b> <span class="num" style="color:var(--muted)">' + local(m.phone) + '</span></div>' +
        '<small>' + (m.last_login ? 'آخر دخول: ' + new Date(m.last_login).toLocaleString('ar-SA-u-nu-latn-ca-gregory', { timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short' }) : 'لم يدخل بعد') + (m.note ? ' · ' + esc(m.note) : '') + '</small></div>' +
        '<span class="pill ' + st[1] + '">' + st[0] + '</span>' + (m.locked ? '<span class="pill off">مقفول مؤقتاً</span>' : '') +
        '<button class="btn ghost small" data-lopen="' + m.phone + '">' + (isOpen ? 'إغلاق' : 'إدارة') + '</button>';
      if (isOpen) {
        row += '<div style="flex-basis:100%;padding-top:10px"><div class="row-actions">' +
          '<button class="btn small" data-lact="reset" data-ph="' + m.phone + '">رقم سري جديد</button>' +
          '<button class="btn ghost small" data-lact="phone" data-ph="' + m.phone + '">تعديل الرقم</button>' +
          (m.status === 'disabled' ? '<button class="btn ghost small" data-lact="enable" data-ph="' + m.phone + '">تفعيل</button>' : '<button class="btn ghost small" data-lact="disable" data-ph="' + m.phone + '">إيقاف</button>') +
          '<button class="btn ghost small" data-lact="delete" data-ph="' + m.phone + '">حذف من البوابة</button></div>';
        if (L.mode === 'phone') row += '<form id="lPhoneForm" style="margin-top:10px"><label class="field"><span>الرقم الصحيح</span><input name="np" inputmode="numeric" dir="ltr" placeholder="5XXXXXXXX" required></label>' +
          '<label class="check"><input type="checkbox" name="od" checked> عدّل الرقم في أودو كمان</label>' +
          '<button class="btn small" type="submit">حفظ الرقم</button></form>';
        row += '</div>';
      }
      return row + '</div>';
    }).join('') : '<div class="empty">' + (L.q ? 'مفيش نتائج' : 'لسه مفيش أعضاء') + '</div>') + '</div>';
    return h;
  }

  function act(p, okMsg, after) {
    L.busy = true; L.err = ''; render();
    papi(p).then(function (d) { L.busy = false; if (okMsg) toast(okMsg); if (after) after(d); loadL(); })
      .catch(function (e) { L.busy = false; L.err = e.message; render(); });
  }

  function bindLoyalty() {
    var q = document.getElementById('lq'), t = null;
    if (q) q.oninput = function () { L.q = q.value.trim(); clearTimeout(t); t = setTimeout(loadL, 400); };
    var add = document.getElementById('lAdd'); if (add) add.onclick = function () { L.mode = 'add'; L.result = null; L.err = ''; render(); };
    var cancel = document.getElementById('lCancel'); if (cancel) cancel.onclick = function () { L.mode = null; render(); };
    var done = document.getElementById('lDone'); if (done) done.onclick = function () { L.result = null; render(); };
    var copy = document.getElementById('lCopy');
    if (copy) copy.onclick = function () { var r = L.result; try { navigator.clipboard.writeText(shareText(r.name, r.phone, r.pin)); toast('اتنسخت'); } catch (e) { toast('انسخها يدوي'); } };
    var af = document.getElementById('lAddForm');
    if (af) {
      af.ph.oninput = function () { af.ph.value = digitsOnly(af.ph.value); };
      af.onsubmit = function (e) {
        e.preventDefault(); if (L.busy) return;
        if (!/^5[0-9]{8}$/.test(af.ph.value)) { L.err = 'الرقم لازم 9 أرقام يبدأ بـ 5'; return render(); }
        act({ action: 'adm_add', phone: af.ph.value, name: af.nm.value.trim() }, 'تمت الإضافة', function (d) {
          L.mode = null; L.result = { title: 'تم تسجيل العضو' + (d.created_partner ? ' (اتعمله عميل جديد في أودو)' : ''), name: d.member.name, phone: d.member.phone, pin: d.pin };
        });
      };
    }
    app.querySelectorAll('[data-lopen]').forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-lopen'); L.open = L.open === p ? null : p; L.mode = null; render(); }; });
    app.querySelectorAll('[data-lact]').forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-lact'), ph = b.getAttribute('data-ph'), m = L.list.filter(function (x) { return x.phone === ph; })[0] || {};
        if (a === 'reset') { if (!confirm('هيتعمل رقم سري جديد لـ ' + local(ph) + ' والقديم هيبطل. تكمل؟')) return; act({ action: 'adm_reset', phone: ph }, null, function (d) { L.result = { title: 'رقم سري جديد', name: d.member.name, phone: ph, pin: d.pin }; }); }
        else if (a === 'phone') { L.mode = L.mode === 'phone' ? null : 'phone'; render(); }
        else if (a === 'disable') { if (confirm('إيقاف دخول ' + (m.name || local(ph)) + ' على البوابة؟')) act({ action: 'adm_status', phone: ph, disable: true }, 'تم الإيقاف'); }
        else if (a === 'enable') act({ action: 'adm_status', phone: ph, disable: false }, 'تم التفعيل');
        else if (a === 'delete') { if (confirm('حذف ' + local(ph) + ' من البوابة؟ نقاطه في أودو مش هتتأثر.')) act({ action: 'adm_delete', phone: ph }, 'تم الحذف', function () { L.open = null; }); }
      };
    });
    var pf = document.getElementById('lPhoneForm');
    if (pf) {
      pf.np.oninput = function () { pf.np.value = digitsOnly(pf.np.value); };
      pf.onsubmit = function (e) {
        e.preventDefault();
        if (!/^5[0-9]{8}$/.test(pf.np.value)) { L.err = 'الرقم لازم 9 أرقام يبدأ بـ 5'; return render(); }
        act({ action: 'adm_phone', phone: L.open, new_phone: pf.np.value, update_odoo: pf.od.checked }, 'تم تعديل الرقم', function () { L.open = null; L.mode = null; });
      };
    }
  }

  var _shell = shell;
  shell = function (body) {
    var h = _shell(body);
    if (S.menu && S.user && S.user.role === 'admin') h = h.replace('<button data-go="password">', '<button data-go="loyalty">أعضاء الولاء</button><button data-go="password">');
    return h;
  };
  var _render = render;
  render = function () {
    if (S.token && S.user && !S.user.must_change && S.view === 'loyalty') {
      if (S.user.role !== 'admin') { S.view = 'search'; return _render(); }
      app.innerHTML = shell(viewLoyalty()); bindShell(); bindLoyalty();
      if (!L.loaded && !L.busy) loadL();
      return;
    }
    if (S.view !== 'loyalty') L.loaded = false;
    _render();
  };
})();
