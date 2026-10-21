/* ============================================================
   nav.js — 常用入口页
   逻辑沿用原站：按 category 分「常用 / 其他」两组、可折叠、
   带口令的入口需输入、点击计一次数。
   改动只有一处：口令不再下发到前端，交给数据库比对。
   ============================================================ */

(function () {
  const S = window.SITE;
  const FOLD_KEY = 'handou_fold_v1';
  const mount = document.getElementById('navList');
  if (!mount) return;

  let ALL = [];          // 全量链接
  let LOCKED = new Set();// 有口令的 id
  let QUERY = '';
  /* 分组：优先用数据库里的 public.groups，读不到才退回 config.js 里那两条 */
  let GROUPS = (S.navGroups || []).map(function (g) {
    return { name: g.id, hint: g.hint || '', color: g.color || '#3FA3AE' };
  });

  /* ---------- 折叠状态 ---------- */
  function readFold() {
    try { return JSON.parse(localStorage.getItem(FOLD_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function writeFold(o) {
    try { localStorage.setItem(FOLD_KEY, JSON.stringify(o)); } catch (e) {}
  }

  /* ---------- 工具 ---------- */
  const esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* 首字方块：中文取首字，英文取首字母 */
  function initial(title) {
    const t = String(title || '').trim();
    if (!t) return '·';
    const ch = t[0];
    return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
  }

  /* 网址主域名，作为卡片的第二行 */
  function host(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  /* 数据库里存的是 SVG 原文，只用它，但要先去掉能执行的东西 */
  function iconOf(raw) {
    if (!raw || raw.indexOf('<svg') === -1) return '';
    let svg = String(raw)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<\s*(foreignObject|iframe|object|embed)[\s\S]*?<\/\s*\1\s*>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '');
    if (svg.indexOf('viewBox') === -1) return '';
    if (!/<(path|line|circle|rect|polyline|polygon|ellipse)\b/i.test(svg)) return '';

    /* 库里存的是 JSX 原文：strokeWidth={1.5} 这类写法浏览器不认，先转成标准属性 */
    svg = svg
      .replace(/\b(stroke|fill)-(\w)/g, function (m, a, b) { return a + '-' + b.toLowerCase(); })
      .replace(/\bstrokeWidth\s*=\s*["']?([^"'\s>]+)["']?/g, 'stroke-width="$1"')
      .replace(/\bstrokeLinecap\s*=\s*["']?([^"'\s>]+)["']?/g, 'stroke-linecap="$1"')
      .replace(/\bstrokeLinejoin\s*=\s*["']?([^"'\s>]+)["']?/g, 'stroke-linejoin="$1"')
      .replace(/\bclassName\s*=\s*("[^"]*"|'[^']*')/g, '')
      .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/g, '')
      .replace(/\s(width|height)\s*=\s*["'][^"']*["']/g, '');

    return svg;
  }

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"' +
              ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5"/></svg>';

  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"' +
             ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
             '<rect x="4.5" y="10.5" width="15" height="10" rx="2.4"/>' +
             '<path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/></svg>';

  /* 只挡 javascript: 这类；站内相对路径（services/movie.html）要放行 */
  function safeUrl(u) {
    if (!u) return '#';
    const t = String(u).trim();
    if (!t || /^javascript:/i.test(t)) return '#';
    return t;
  }

  /* ---------- 分组 ---------- */
  function groupOf(cat) {
    const names = GROUPS.map(function (g) { return g.name; });
    if (cat && names.indexOf(cat) !== -1) return cat;
    return GROUPS.length ? GROUPS[0].name : '默认';   // 未知分类 → 第一组
  }

  /* ---------- 渲染 ---------- */
  function render() {
    if (!GROUPS.length) {
      mount.innerHTML = '<div class="empty">还没有分组，去后台「分组」里加一个</div>';
      return;
    }
    const fold = readFold();
    const q = QUERY.trim().toLowerCase();

    const buckets = {};
    GROUPS.forEach(function (g) { buckets[g.name] = []; });

    ALL.forEach(function (l) {
      if (q) {
        const hay = (l.title || '') + ' ' + (l.url || '') + ' ' + (l.category || '');
        if (hay.toLowerCase().indexOf(q) === -1) return;
      }
      buckets[groupOf(l.category)].push(l);
    });

    const total = ALL.length;
    const shown = Object.keys(buckets).reduce(function (n, k) { return n + buckets[k].length; }, 0);

    const counter = document.getElementById('navCount');
    if (counter) {
      counter.textContent = q
        ? '命中 ' + shown + ' / ' + total
        : total + ' 条 · ' + LOCKED.size + ' 条需口令';
    }

    let html = '';
    GROUPS.forEach(function (g, i) {
      const items = buckets[g.name];
      /* 空分组不上前台（后台「分组」里仍然看得到） */
      if (!items.length && !q) return;
      /* 搜索时强制展开，否则按记忆状态 */
      const open = q ? true : fold[g.name] !== false;

      let inner = '';
      if (!items.length) {
        inner = '<div class="empty">' + (q ? '这个分组里没有匹配的' : '这个分组还空着') + '</div>';
      } else {
        inner = '<div class="lgrid">' + items.map(function (l) {
          const locked = LOCKED.has(String(l.id));
          const h = host(l.url);
          return '' +
            '<button class="lk' + (locked ? ' lk--locked' : '') + '"' +
            ' data-id="' + esc(l.id) + '"' +
            ' data-url="' + esc(safeUrl(l.url)) + '"' +
            ' data-title="' + esc(l.title) + '"' +
            ' data-locked="' + (locked ? '1' : '0') + '"' +
            ' data-g="' + i + '"' +
            ' title="' + esc(l.title) + (h ? ' · ' + esc(h) : '') + '">' +
              '<span class="lk__ic" aria-hidden="true">' + (iconOf(l.icon) || ARROW) + '</span>' +
              '<span class="lk__t">' + esc(l.title) + '</span>' +
              (locked ? '<span class="lk__lock" aria-label="需要口令">' + LOCK + '</span>' : '') +
            '</button>';
        }).join('') + '</div>';
      }

      html += '' +
        '<section class="grp" data-open="' + (open ? 'true' : 'false') + '" data-g="' + esc(g.name) + '">' +
          '<button class="grp__head" data-toggle="' + esc(g.name) + '">' +
            '<span class="grp__dot" style="background:' + g.color + '"></span>' +
            '<span class="grp__name">' + esc(g.name) + '</span>' +
            (g.hint ? '<span class="grp__hint">' + esc(g.hint) + '</span>' : '') +
            '<span class="grp__count">' + items.length + ' 个链接</span>' +
            '<span class="grp__chev">' +
              '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
              '<path d="M3.5 5.5 7 9l3.5-3.5" stroke="currentColor" stroke-width="1.6" ' +
              'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</span>' +
          '</button>' +
          '<div class="grp__body"><div class="grp__inner">' + inner + '</div></div>' +
        '</section>';
    });

    mount.innerHTML = html;
  }

  /* ---------- 折叠 ---------- */
  mount.addEventListener('click', function (e) {
    const head = e.target.closest('[data-toggle]');
    if (head) {
      const sec = head.closest('.grp');
      const on = sec.dataset.open !== 'true';
      sec.dataset.open = on ? 'true' : 'false';
      const f = readFold();
      f[head.dataset.toggle] = on;
      writeFold(f);
      return;
    }

    const card = e.target.closest('.lk');
    if (card) {
      const url = card.dataset.url;
      const title = card.dataset.title;
      const id = card.dataset.id;

      if (card.dataset.locked === '1') {
        askPass(id, title, url);
      } else {
        DB.logClick(id, title, url);
        if (url && url !== '#') {
          /* 站外开新标签，站内直接跳（不然每点一次就多一个标签页） */
          if (/^https?:\/\//i.test(url)) {
            window.open(url, '_blank', 'noopener,noreferrer');
          } else {
            location.href = url;
          }
        }
      }
    }
  });

  /* ---------- 口令浮层 ---------- */
  let pending = null;

  function askPass(id, title, url) {
    pending = { id: id, title: title, url: url };
    const t = document.getElementById('passTitle');
    const d = document.getElementById('passDesc');
    const inp = document.getElementById('passInput');
    const err = document.getElementById('passErr');
    const btn = document.getElementById('passOk');
    if (t) t.textContent = title;
    if (d) d.textContent = '这个入口需要口令才能打开。';
    if (inp) inp.value = '';
    if (err) err.textContent = '';
    if (btn) { btn.disabled = false; btn.textContent = '打开'; }
    openModal('passModal');
    if (inp) setTimeout(function () { inp.focus(); }, 80);
  }

  async function submitPass() {
    if (!pending) return;
    const inp = document.getElementById('passInput');
    const err = document.getElementById('passErr');
    const btn = document.getElementById('passOk');
    const val = (inp && inp.value || '').trim();

    if (!val) {
      if (err) err.textContent = '口令不能为空';
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '核对中…'; }
    if (err) err.textContent = '';

    let ok = false;
    try {
      ok = await DB.unlock(pending.id, val);
    } catch (e) {
      if (err) err.textContent = '网络不通，稍后再试';
    }

    if (btn) { btn.disabled = false; btn.textContent = '打开'; }

    if (ok) {
      DB.logClick(pending.id, pending.title, pending.url);
      closeModal('passModal');
      if (pending.url && pending.url !== '#') {
        window.open(pending.url, '_blank', 'noopener,noreferrer');
      }
      pending = null;
      window.toast('口令正确');
    } else {
      if (err) err.textContent = '口令不对';
      if (inp) { inp.select(); }
    }
  }

  const passOk = document.getElementById('passOk');
  const passInput = document.getElementById('passInput');
  if (passOk) passOk.addEventListener('click', submitPass);
  if (passInput) {
    passInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitPass();
    });
  }

  /* ---------- 搜索 ---------- */
  const search = document.getElementById('navSearch');
  if (search) {
    let t = null;
    search.addEventListener('input', function () {
      clearTimeout(t);
      const v = search.value;
      t = setTimeout(function () { QUERY = v; render(); }, 120);
    });
  }

  /* ---------- 加载 ---------- */
  async function boot() {
    mount.innerHTML = '<div class="empty">正在读取…</div>';
    try {
      const results = await Promise.all([
        DB.listLinks(),
        DB.lockedIds(),
        /* 分组表没建 / 读失败时给 null，主体照常渲染 */
        DB.listGroups().catch(function () { return null; })
      ]);
      ALL = results[0] || [];
      LOCKED = new Set(results[1] || []);
      const gs = results[2];
      if (Array.isArray(gs) && gs.length) {
        GROUPS = gs.filter(function (g) { return g.visible !== false; })
          .map(function (g) {
            return {
              name: g.name,
              hint: g.hint || '',
              color: g.color || '#3FA3AE'
            };
          });
      }
      render();
    } catch (e) {
      mount.innerHTML =
        '<div class="empty">读取失败：' + esc(e.message) +
        '<br><br><button class="btn btn--ghost btn--sm" onclick="location.reload()">重试</button></div>';
    }
  }

  boot();
})();
