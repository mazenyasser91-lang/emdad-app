// ---------- item ----------
  function openItem(id) {
    S.view = 'item'; S.itemId = id; S.item = null; S.error = ''; S.tab = 'sales';
    if (!S.from) setPeriod('month');
    render(); fetchItem();
    try { history.pushState({ v: 'item' }, ''); } catch (e) {}
  }
  function fetchItem() {
    S.busy = true; S.error = ''; render();
    api({ action: 'item', id: S.itemId, from: S.from, to: S.to }).then(function (d) {
      S.busy = false; S.item = d; render();
    }).catch(function (e) { S.busy = false; S.error = e.message; render(); });
  }

  function viewItem() {
    var d = S.item, h = '<button class="back" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>رجوع للبحث</button>';
    if (d) {
      var p = d.product;
      h += '<div class="head">' + (p.image ? '<img src="data:image/png;base64,' + p.image + '" alt="">' : '') +
        '<div><h1>' + esc(stripCode(p.name)) + '</h1><div class="meta"><span>الكود: <span class="num">' + esc(p.code) + '</span></span><span>' + esc(p.categ) + '</span>' +
        '<span>سعر البيع: ' + n(p.price) + '</span>' + (p.cost != null ? '<span>التكلفة: ' + n(p.cost) + '</span>' : '') + '</div></div></div>';
    }
    var P = [['today', 'اليوم'], ['7d', 'آخر 7 أيام'], ['month', 'الشهر الحالي'], ['last', 'الشهر الماضي'], ['90d', 'آخر 90 يوم'], ['ytd', 'من أول السنة'], ['custom', 'فترة مخصصة']];
    h += '<div class="periods" role="group" aria-label="الفترة">' + P.map(function (x) { return '<button class="chip" data-p="' + x[0] + '" aria-pressed="' + (S.period === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (S.period === 'custom') h += '<div class="custom"><label>من<input type="date" id="dFrom" value="' + S.from + '"></label><label>إلى<input type="date" id="dTo" value="' + S.to + '"></label><button class="btn small" id="dGo">عرض</button></div>';
    if (S.busy) return h + '<div class="loading"><div class="spin"></div>جاري سحب الأرقام من أودو…</div>';
    if (S.error) return h + '<div class="err">' + esc(S.error) + '</div><button class="btn ghost small" id="retry">حاول تاني</button>';
    if (!d) return h;

    var t = d.totals;
    h += '<section class="ledger" aria-label="ملخص الفترة"><div class="big"><b class="num">' + fmt.format(t.qty) + '</b><span>' + esc(d.product.uom || 'وحدة') + ' اتباعت</span></div>' +
      '<div class="sub">من <span class="num">' + d.period.from + '</span> إلى <span class="num">' + d.period.to + '</span> · <span class="num">' + d.period.days + '</span> يوم</div>' +
      '<div class="strip">' +
      '<div><small>صافي المبيعات (بدون ضريبة)</small><b>' + money(t.net) + '</b></div>' +
      '<div><small>متوسط البيع اليومي</small><b>' + n(t.daily_avg) + '</b></div>' +
      '<div><small>الرصيد الحالي</small><b>' + n(t.stock) + '</b></div>' +
      '<div><small>يكفي لمدة</small><b>' + (t.cover_days == null ? '—' : '<span class="num">' + t.cover_days + '</span> يوم') + '</b></div>' +
      (t.stock_value != null ? '<div><small>قيمة المخزون بالتكلفة</small><b>' + money(t.stock_value) + '</b></div>' : '') +
      '</div></section>';

    h += '<div class="tabs" role="tablist">' + [['sales', 'المبيعات'], ['stock', 'المخزون'], ['trend', 'آخر 12 شهر']].map(function (x) {
      return '<button role="tab" data-tab="' + x[0] + '" aria-selected="' + (S.tab === x[0]) + '">' + x[1] + '</button>';
    }).join('') + '</div>';

    if (S.tab === 'sales') h += tabSales(d);
    else if (S.tab === 'stock') h += tabStock(d);
    else h += tabTrend(d);

    var tm = new Date(d.generated_at); var hh = tm.toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' });
    h += '<div class="foot"><span>الأرقام لحظية من أودو · آخر تحديث ' + hh + '</span><button class="linkbtn" id="refresh">تحديث</button></div>';
    return h;
  }

  function tabSales(d) {
    if (!d.lines.length) return '<div class="panel"><div class="empty">الصنف ماتباعش في الفترة دي.</div></div>';
    var max = Math.max.apply(null, d.by_city.map(function (c) { return Math.abs(c.qty); }).concat([1]));
    var h = '<div class="panel"><h2>حسب المدينة</h2><div class="bars">' + d.by_city.map(function (c) {
      var w = function (v) { return Math.max(0, v) / max * 100; };
      return '<div class="bar-row"><div>' + esc(c.city) + '</div><div class="bar-track">' +
        '<i class="c-retail" style="width:' + w(c.retail) + '%"></i><i class="c-cafe" style="width:' + w(c.cafe) + '%"></i><i class="c-inv" style="width:' + w(c.invoice) + '%"></i>' +
        '</div><div><b>' + n(c.qty) + '</b></div></div>';
    }).join('') + '</div><div class="legend"><span style="--c:var(--brick)">ريتيل</span><span style="--c:#D08A5E">مقهى</span><span style="--c:#5C4A3F">فواتير / جملة</span></div></div>';
    h += '<div class="panel"><h2>التفصيل حسب نقطة البيع واليومية</h2><div class="tbl-wrap"><table><thead><tr><th>نقطة البيع / اليومية</th><th>النوع</th><th class="n">الكمية</th><th class="n">صافي المبيعات</th></tr></thead><tbody>' +
      d.lines.map(function (l) { return '<tr><td>' + esc(l.label) + '</td><td><span class="tag">' + esc(l.channel) + '</span></td><td class="n">' + n(l.qty) + '</td><td class="n">' + n(l.net) + '</td></tr>'; }).join('') +
      '<tr class="tfoot"><td>الإجمالي</td><td></td><td class="n">' + n(d.totals.qty) + '</td><td class="n">' + n(d.totals.net) + '</td></tr></tbody></table></div></div>';
    return h;
  }

  function tabStock(d) {
    if (!d.stock.length) return '<div class="panel"><div class="empty">مفيش رصيد للصنف ده في أي مستودع.</div></div>';
    var max = Math.max.apply(null, d.stock.map(function (s) { return Math.abs(s.qty); }).concat([1]));
    return '<div class="panel"><h2>الرصيد في كل مستودع</h2>' + d.stock.map(function (s) {
      return '<div class="stock-row"><div><div class="nm">' + esc(s.warehouse) + '</div><div class="sm">' + esc(s.city) +
        (s.reserved ? ' · محجوز <span class="num">' + fmt.format(s.reserved) + '</span> · متاح <span class="num">' + fmt.format(s.available) + '</span>' : '') + '</div></div>' +
        '<div class="q num">' + fmt.format(s.qty) + '</div><div class="bar-track"><i class="c-retail" style="width:' + (Math.max(0, s.qty) / max * 100) + '%"></i></div></div>';
    }).join('') + '<div class="stock-row"><div class="nm">الإجمالي</div><div class="q num">' + fmt.format(d.totals.stock) + '</div></div></div>';
  }

  function tabTrend(d) {
    var tr = d.trend || [];
    var max = Math.max.apply(null, tr.map(function (m) { return m.qty; }).concat([1]));
    var W = 380, H = 210, pad = 8, bw = (W - pad * 2) / tr.length;
    var bars = tr.map(function (m, i) {
      var h = Math.max(0, m.qty) / max * (H - 60), x = W - pad - (i + 1) * bw + bw * 0.18, y = H - 34 - h;
      var mo = MONTHS[parseInt(m.month.slice(5), 10) - 1];
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw * 0.64).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" fill="' + (i === tr.length - 1 ? '#A04235' : '#D9B8A8') + '"><title>' + mo + ' ' + m.month.slice(0, 4) + ': ' + fmt.format(m.qty) + '</title></rect>' +
        (m.qty ? '<text x="' + (x + bw * 0.32).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="10" fill="#2E211C" font-family="Readex Pro,Tahoma">' + fmt0.format(m.qty) + '</text>' : '') +
        '<text x="' + (x + bw * 0.32).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="9.5" fill="#7A6A5E" font-family="Readex Pro,Tahoma">' + mo.slice(0, 3) + '</text>';
    }).join('');
    var h = '<div class="panel trend"><h2>الكمية المباعة شهرياً</h2><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="رسم الكميات الشهرية"><line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (H - 34) + '" y2="' + (H - 34) + '" stroke="#E3D8C2"/>' + bars + '</svg></div>';
    h += '<div class="panel"><div class="tbl-wrap"><table><thead><tr><th>الشهر</th><th class="n">الكمية</th><th class="n">صافي المبيعات</th></tr></thead><tbody>' +
      tr.slice().reverse().map(function (m) { return '<tr><td>' + MONTHS[parseInt(m.month.slice(5), 10) - 1] + ' <span class="num">' + m.month.slice(0, 4) + '</span></td><td class="n">' + n(m.qty) + '</td><td class="n">' + n(m.net) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
    return h;
  }
