/* ============================================================
   content.js — 技术服务 / 分享：从 Supabase 读，读不到用内置兜底
   ------------------------------------------------------------
   依赖：config.js（兜底内容）、db.js（请求）
   用法：
     CONTENT.mountServices(el, { base: 'services/' })
     CONTENT.mountShares(el)
   表还没建时（sql/02 未执行）自动退回 SITE.services / SITE.shares，
   所以先上线后补表也不会白屏。
   ============================================================ */

(function () {
  const S = window.SITE;

  const esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ---------------- 图标 ---------------- */
  const ICONS = {
    film: '<rect x="3" y="4.5" width="18" height="15" rx="2.2"/><path d="M7.4 4.5v15M16.6 4.5v15M3 9.6h4.4M3 14.4h4.4M16.6 9.6H21M16.6 14.4H21"/>',
    music: '<path d="M9 17.5V6.2l10-2v11.3"/><ellipse cx="6.5" cy="17.8" rx="2.6" ry="2.3"/><ellipse cx="16.5" cy="15.6" rx="2.6" ry="2.3"/>',
    server: '<rect x="3.2" y="4" width="17.6" height="6.4" rx="1.8"/><rect x="3.2" y="13.6" width="17.6" height="6.4" rx="1.8"/><path d="M6.8 7.2h.02M6.8 16.8h.02M11 7.2h4.6M11 16.8h4.6"/>',
    tool: '<path d="M14.5 6.2a3.6 3.6 0 0 0 4.8 4.8L11 19.3a2.1 2.1 0 0 1-3-3l8.3-8.3"/><path d="M6.2 9.5a3.6 3.6 0 0 1 4.8-4.8L6.8 9"/>',
    box: '<path d="M12 3.2 20 7v10l-8 3.8L4 17V7l8-3.8Z"/><path d="M4 7l8 3.8L20 7M12 10.8V20"/>'
  };
  function iconSvg(key) {
    const body = ICONS[key] || ICONS.box;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"' +
           ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  const ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="m6.4 3.4 4.6 4.6-4.6 4.6" stroke="currentColor" stroke-width="1.6"' +
    ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------------- 技术服务 ---------------- */
  function normalizeSvc(r) {
    return {
      title: r.title || '',
      badge: r.badge || '',
      desc: r.descr != null ? r.descr : (r.desc || ''),
      price: r.price || '',
      priceUnit: r.price_unit != null ? r.price_unit : (r.priceUnit || ''),
      href: r.href || '',
      icon: r.icon || 'box'
    };
  }

  function svcCard(s, base) {
    const url = s.href ? (base || '') + s.href : '';
    const tag = url ? 'a' : 'div';
    return '<' + tag + ' class="svcard"' + (url ? ' href="' + esc(url) + '"' : '') + '>' +
      '<span class="svcard__top">' +
        '<span class="svcard__ic">' + iconSvg(s.icon) + '</span>' +
        '<span class="svcard__h">' +
          '<span class="svcard__t">' + esc(s.title) + '</span>' +
          (s.badge ? '<span class="svbadge">' + esc(s.badge) + '</span>' : '') +
        '</span>' +
      '</span>' +
      (s.desc ? '<span class="svcard__d">' + esc(s.desc) + '</span>' : '') +
      '<span class="svcard__f">' +
        '<span class="svcard__price">' + esc(s.price) +
          (s.priceUnit ? '<small>' + esc(s.priceUnit) + '</small>' : '') + '</span>' +
        (url ? '<span class="svcard__go">查看详情' + ARROW + '</span>' : '') +
      '</span>' +
    '</' + tag + '>';
  }

  async function loadServices() {
    try {
      const rows = await DB.list('services', '?select=*&order=sort_order.asc,id.asc');
      if (!Array.isArray(rows)) throw new Error('bad response');
      return rows.filter(function (r) { return r.visible !== false; }).map(normalizeSvc);
    } catch (e) {
      /* 表没建 / 没权限 → 用 config.js 里的兜底 */
      return (S.services || []).map(function (x) { return normalizeSvc(x); });
    }
  }

  async function mountServices(el, opts) {
    if (!el) return;
    const base = (opts && opts.base) || '';
    const list = await loadServices();
    if (!list.length) {
      el.innerHTML = '<div class="empty">还没有技术服务条目</div>';
      return;
    }
    el.innerHTML = list.map(function (s) { return svcCard(s, base); }).join('');
    document.querySelectorAll('[data-svc-count]').forEach(function (n) {
      n.textContent = list.length;
    });
  }

  /* ---------------- 分享 ---------------- */
  function normalizeShare(r) {
    return {
      group: r.group_name || r.group || '其他',
      title: r.title || '',
      desc: r.descr != null ? r.descr : (r.desc || ''),
      url: r.url || ''
    };
  }

  async function loadShares() {
    try {
      const rows = await DB.list('shares', '?select=*&order=sort_order.asc,id.asc');
      if (!Array.isArray(rows)) throw new Error('bad response');
      const flat = rows.filter(function (r) { return r.visible !== false; }).map(normalizeShare);
      if (!flat.length) return [];
      /* 按分组名聚起来，顺序按首次出现 */
      const order = [];
      const map = {};
      flat.forEach(function (it) {
        if (!map[it.group]) { map[it.group] = []; order.push(it.group); }
        map[it.group].push(it);
      });
      return order.map(function (g) { return { group: g, items: map[g] }; });
    } catch (e) {
      return (S.shares || []).map(function (g) {
        return { group: g.group, items: (g.items || []).map(normalizeShare) };
      });
    }
  }

  async function mountShares(el) {
    if (!el) return;
    const groups = await loadShares();
    el.innerHTML = renderShares(groups);
  }

  function renderShares(groups) {
    groups = groups || [];
    if (!groups.length) return '<div class="empty">还没有内容</div>';
    return groups.map(function (g, i) {
      const items = g.items || [];
      let body;
      if (!items.length) {
        body = '<div class="sblank"><b>这一格还空着</b>' +
               '<span>想放什么，后台加一条就到这儿了。</span></div>';
      } else {
        body = '<div class="slist">' + items.map(function (it) {
          return '<a class="sitem" href="' + esc(it.url || '#') + '" target="_blank" rel="noopener noreferrer">' +
              '<span class="sitem__x">' +
                '<span class="sitem__t">' + esc(it.title) + '</span>' +
                '<span class="sitem__d">' + esc(it.desc || '') + '</span>' +
              '</span>' +
              '<span class="sitem__go">' +
                '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
                '<path d="M3 8h10M8.6 3.6 13 8l-4.4 4.4" stroke="currentColor" stroke-width="1.6" ' +
                'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '</span>' +
            '</a>';
        }).join('') + '</div>';
      }
      return '<section class="sblock">' +
          '<div class="sec-head">' +
            '<span class="idx">' + String(i + 1).padStart(2, '0') + '</span>' +
            '<h2>' + esc(g.group) + '</h2>' +
            '<span class="n">' + items.length + ' 条</span>' +
          '</div>' + body +
        '</section>';
    }).join('');
  }

  window.CONTENT = {
    icons: Object.keys(ICONS),
    iconSvg, normalizeSvc, normalizeShare,
    loadServices, mountServices,
    loadShares, mountShares, renderShares
  };
})();
