  // ---------- users ----------
  function openUsers() { S.view = 'users'; S.editing = null; S.error = ''; S.busy = true; render(); loadUsers(); }
  function loadUsers() {
    api({ action: 'users_list' }).then(function (d) { S.busy = false; S.users = d.users || []; render(); })
      .catch(function (e) { S.busy = false; S.error = e.message; render(); });
  }
  function viewUsers() {
    var h = '<div style="display:flex;align-items:center;justify-content:space-between;margin:4px 0 12px"><h1 style="font-size:20px;margin:0">المستخدمين</h1>' +
      (S.editing ? '' : '<button class="btn small" id="addUser">إضافة مستخدم</button>') + '</div>';
    if (S.error) h += '<div class="err">' + esc(S.error) + '</div>';
    if (S.editing) {
      var u = S.editing, isNew = !u.username;
      h += '<form class="panel" id="userForm"><h2>' + (isNew ? 'مستخدم جديد' : 'تعديل ' + esc(u.username)) + '</h2><div class="grid2">' +
        '<label class="field"><span>اسم المستخدم (إنجليزي)</span><input name="un" dir="ltr" autocapitalize="none" value="' + esc(u.username || '') + '"' + (isNew ? '' : ' readonly') + ' required></label>' +
        '<label class="field"><span>الاسم الظاهر</span><input name="nm" value="' + esc(u.name || '') + '"></label>' +
        '<label class="field"><span>الصلاحية</span><select name="rl"><option value="user"' + (u.role !== 'admin' ? ' selected' : '') + '>مستخدم — يشوف المبيعات والأرصدة</option><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>مدير — يشوف التكلفة ويدير المستخدمين</option></select></label>' +
        '<label class="field"><span>' + (isNew ? 'كلمة المرور المؤقتة' : 'كلمة مرور جديدة (اتركها فاضية لو مش هتغيّرها)') + '</span><input name="pw" dir="ltr" autocomplete="new-password"' + (isNew ? ' required' : '') + '></label>' +
        '</div><label class="check"><input type="checkbox" name="ac"' + (u.active !== false ? ' checked' : '') + '> الحساب مفعّل</label>' +
        '<p class="note" style="margin-top:0">المستخدم هيُطلب منه يغيّر كلمة المرور أول ما يدخل.</p>' +
        '<div class="row-actions"><button class="btn small" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'جاري الحفظ…' : 'حفظ') + '</button>' +
        '<button class="btn ghost small" type="button" id="cancelEdit">إلغاء</button>' +
        (!isNew && u.username !== S.user.username ? '<button class="btn ghost small" type="button" id="delUser" style="margin-inline-start:auto">حذف المستخدم</button>' : '') + '</div></form>';
      return h;
    }
    if (S.busy) return h + '<div class="loading"><div class="spin"></div></div>';
    h += '<div class="panel">' + (S.users.length ? S.users.map(function (u) {
      return '<div class="user-row"><div class="r-main"><div><b>' + esc(u.name || u.username) + '</b> <span class="num" style="color:var(--muted);font-size:13px">' + esc(u.username) + '</span></div>' +
        '<small>' + (u.last_login ? 'آخر دخول: ' + new Date(u.last_login).toLocaleString('ar-SA-u-nu-latn', { timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short' }) : 'لم يدخل بعد') + '</small></div>' +
        (u.role === 'admin' ? '<span class="pill admin">مدير</span>' : '<span class="pill">مستخدم</span>') +
        (!u.active ? '<span class="pill off">موقوف</span>' : '') + (u.locked ? '<span class="pill off">مقفول مؤقتاً</span>' : '') +
        '<button class="btn ghost small" data-edit="' + esc(u.username) + '">تعديل</button></div>';
    }).join('') : '<div class="empty">مفيش مستخدمين.</div>') + '</div>';
    return h;
  }

  // ---------- bindings ----------
  function bindView() {
    if (S.view === 'search') {
      var q = document.getElementById('q');
      if (q) {
        q.oninput = function () { S.q = q.value.trim(); clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 350); };
        q.onkeydown = function (e) { if (e.key === 'Enter') { clearTimeout(searchTimer); runSearch(); q.blur(); } };
        if (!S.q) q.focus();
      }
      bindResults();
    }
    if (S.view === 'item') {
      var b = document.getElementById('backBtn'); if (b) b.onclick = function () { S.view = 'search'; S.error = ''; render(); };
      app.querySelectorAll('[data-p]').forEach(function (c) {
        c.onclick = function () { var p = c.getAttribute('data-p'); if (p === 'custom') { S.period = 'custom'; render(); return; } setPeriod(p); fetchItem(); };
      });
      var go = document.getElementById('dGo');
      if (go) go.onclick = function () { var f = document.getElementById('dFrom').value, t = document.getElementById('dTo').value; if (!f || !t) return toast('حدد التاريخين'); S.from = f; S.to = t; fetchItem(); };
      app.querySelectorAll('[data-tab]').forEach(function (t) { t.onclick = function () { S.tab = t.getAttribute('data-tab'); render(); }; });
      var r = document.getElementById('refresh'); if (r) r.onclick = fetchItem;
      var rt = document.getElementById('retry'); if (rt) rt.onclick = fetchItem;
    }
    if (S.view === 'users') {
      var add = document.getElementById('addUser'); if (add) add.onclick = function () { S.editing = { role: 'user', active: true }; S.error = ''; render(); };
      app.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { var un = b.getAttribute('data-edit'); S.editing = Object.assign({}, S.users.filter(function (u) { return u.username === un; })[0]); S.error = ''; render(); }; });
      var cancel = document.getElementById('cancelEdit'); if (cancel) cancel.onclick = function () { S.editing = null; S.error = ''; render(); };
      var del = document.getElementById('delUser');
      if (del) del.onclick = function () {
        if (!confirm('متأكد إنك عايز تحذف ' + S.editing.username + '؟')) return;
        S.busy = true; render();
        api({ action: 'user_delete', username: S.editing.username }).then(function () { toast('تم حذف المستخدم'); S.editing = null; loadUsers(); })
          .catch(function (e) { S.busy = false; S.error = e.message; render(); });
      };
      var f = document.getElementById('userForm');
      if (f) f.onsubmit = function (e) {
        e.preventDefault(); if (S.busy) return;
        var payload = { action: 'user_save', username: f.un.value.trim().toLowerCase(), name: f.nm.value.trim(), role: f.rl.value, active: f.ac.checked, unlock: true };
        if (f.pw.value) payload.password = f.pw.value;
        S.busy = true; S.error = ''; render();
        api(payload).then(function () { toast('تم الحفظ'); S.editing = null; loadUsers(); })
          .catch(function (e) { S.busy = false; S.error = e.message; render(); });
      };
    }
  }

  window.addEventListener('popstate', function () { if (S.view === 'item') { S.view = 'search'; render(); } });

  // ---------- start ----------
  S.token = load('emdad_token');
  try { S.user = JSON.parse(load('emdad_user') || 'null'); } catch (e) { S.user = null; }
  if (!S.user) S.token = null;
  setPeriod('month');
  render();
  if (S.token) api({ action: 'me' }).then(function (d) { S.user = d.user; store('emdad_user', JSON.stringify(d.user)); render(); }).catch(function () {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
