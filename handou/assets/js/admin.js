/* ============================================================
   admin.js — 后台：登录 / 链接增删改 / 点击统计
   所有写操作走 Supabase Auth 会话，未登录不能写。
   ============================================================ */

(function () {
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  const esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  let LINKS = [];
  let editingId = null;

  /* 没登录就别停在这页，回登录页 */
  const SESS = DB.currentUser();
  if (!SESS || !SESS.access_token) {
    location.replace('index.html');
  }

  /* ---------------- 退出 ---------------- */
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      await DB.signOut();
      location.replace('index.html');
    });
  }

  /* ---------------- 数据库连接状态 ---------------- */
  async function probeDB() {
    const boxes = [document.getElementById('connLogin'), document.getElementById('connApp')]
      .filter(Boolean);
    const set = function (state, text) {
      boxes.forEach(function (b) {
        if (state) b.dataset.s = state; else delete b.dataset.s;
        const tx = b.querySelector('.conn__tx');
        if (tx) tx.textContent = text;
      });
    };

    set('', '检查数据库连接…');
    try {
      const rows = await DB.listLinks();
      set('ok', '数据库已连接 · ' + (rows || []).length + ' 条链接');
    } catch (e) {
      const why = e.status === 404 ? '表不存在' : (e.message || '未知错误');
      set('fail', '数据库连接失败：' + why);
    }
  }

  /* ---------------- 标签页 ---------------- */
  const PANES = {
    links: '#paneLinks',
    services: '#paneServices',
    shares: '#paneShares',
    stats: '#paneStats'
  };
  $$('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      const tab = b.dataset.tab;
      $$('.tabs button').forEach(function (x) { x.dataset.on = 'false'; });
      b.dataset.on = 'true';
      Object.keys(PANES).forEach(function (k) {
        const el = $(PANES[k]);
        if (el) el.hidden = (k !== tab);
      });
      if (tab === 'stats') loadStats();
      if (tab === 'services') loadContent('services');
      if (tab === 'shares') loadContent('shares');
    });
  });

  /* ---------------- 链接列表 ---------------- */
  async function loadLinks() {
    const tbody = $('#linkRows');
    tbody.innerHTML = '<tr><td colspan="5" class="empty">正在读取…</td></tr>';
    try {
      const res = await Promise.all([DB.listLinks(), DB.lockedIds()]);
      const locked = new Set(res[1] || []);
      LINKS = (res[0] || []).map(function (l) {
        l._locked = locked.has(String(l.id));
        return l;
      });
      renderLinks();
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">读取失败：' + esc(e.message) + '</td></tr>';
    }
  }

  function renderLinks() {
    const tbody = $('#linkRows');
    if (!LINKS.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">还没有链接</td></tr>';
      $('#linkTotal').textContent = '0 条';
      return;
    }
    tbody.innerHTML = LINKS.map(function (l) {
      return '' +
        '<tr>' +
          '<td class="num">' + esc(l.id) + '</td>' +
          '<td>' + esc(l.title) + '</td>' +
          '<td class="ell num" style="font-size:12px;color:var(--ink-3)">' + esc(l.url) + '</td>' +
          '<td><span class="chip">' + esc(l.category || '默认') + '</span>' +
            (l._locked ? ' <span class="chip" style="color:var(--lock);background:var(--lock-w);border-color:#EFDCBF">口令</span>' : '') +
          '</td>' +
          '<td style="text-align:right;white-space:nowrap">' +
            '<button class="btn btn--ghost btn--sm" data-edit="' + esc(l.id) + '">改</button> ' +
            '<button class="btn btn--ghost btn--sm" data-del="' + esc(l.id) + '">删</button>' +
          '</td>' +
        '</tr>';
    }).join('');
    $('#linkTotal').textContent = LINKS.length + ' 条';
  }

  $('#linkRows').addEventListener('click', async function (e) {
    const ed = e.target.closest('[data-edit]');
    const dl = e.target.closest('[data-del]');

    if (ed) {
      const l = LINKS.find(function (x) { return String(x.id) === ed.dataset.edit; });
      if (l) openEdit(l);
    }

    if (dl) {
      const l = LINKS.find(function (x) { return String(x.id) === dl.dataset.del; });
      if (!l) return;
      if (!confirm('删除「' + l.title + '」？删了就没了。')) return;
      try {
        await DB.deleteLink(l.id);
        window.toast('已删除');
        loadLinks();
      } catch (ex) {
        window.toast('删除失败：' + ex.message);
      }
    }
  });

  /* ---------------- 新增 / 编辑 ---------------- */
  function openEdit(l) {
    editingId = l ? l.id : null;
    $('#editTitle').textContent = l ? '改链接' : '新增链接';
    $('#fTitle').value = l ? (l.title || '') : '';
    $('#fUrl').value = l ? (l.url || '') : '';
    $('#fCat').value = l ? (l.category || '常用') : '常用';
    $('#fPass').value = '';
    $('#fPass').placeholder = l && l._locked ? '已设口令，留空表示不改' : '可留空，表示不需要口令';
    $('#editErr').textContent = '';
    openModal('editModal');
  }

  $('#addBtn').addEventListener('click', function () { openEdit(null); });

  $('#saveBtn').addEventListener('click', async function () {
    const title = $('#fTitle').value.trim();
    const url = $('#fUrl').value.trim();
    const cat = $('#fCat').value;
    const pass = $('#fPass').value;
    const err = $('#editErr');
    const btn = $('#saveBtn');

    if (!title) { err.textContent = '标题不能空'; return; }
    if (!/^https?:\/\//i.test(url)) { err.textContent = '地址要以 http:// 或 https:// 开头'; return; }

    const row = { title: title, url: url, category: cat };
    if (pass !== '') row.password = pass;

    btn.disabled = true;
    btn.textContent = '保存中…';
    err.textContent = '';

    try {
      if (editingId == null) {
        await DB.createLink(row);
        window.toast('已新增');
      } else {
        await DB.updateLink(editingId, row);
        window.toast('已保存');
      }
      closeModal('editModal');
      loadLinks();
    } catch (ex) {
      err.textContent = '保存失败：' + ex.message;
    } finally {
      btn.disabled = false;
      btn.textContent = '保存';
    }
  });

  /* 清空口令 */
  $('#clearPassBtn').addEventListener('click', async function () {
    if (editingId == null) { window.toast('新增的条目直接留空即可'); return; }
    if (!confirm('清掉这条的口令？之后谁都能直接打开。')) return;
    try {
      await DB.updateLink(editingId, { password: null });
      window.toast('口令已清除');
      closeModal('editModal');
      loadLinks();
    } catch (ex) {
      $('#editErr').textContent = '清除失败：' + ex.message;
    }
  });

  /* ---------------- 统计 ---------------- */
  async function loadStats() {
    const box = $('#statsBox');
    box.innerHTML = '<div class="empty">正在读取…</div>';
    try {
      const rows = await DB.recentClicks(120);
      if (!rows || !rows.length) {
        box.innerHTML = '<div class="empty">还没有点击记录</div>';
        return;
      }

      /* 列名防御：按实际返回的字段取 */
      const keys = Object.keys(rows[0]);
      const pick = function (cands) {
        for (let i = 0; i < cands.length; i++) {
          if (keys.indexOf(cands[i]) !== -1) return cands[i];
        }
        return null;
      };
      const kTime = pick(['clicked_at', 'created_at', 'ts', 'timestamp']);
      const kTitle = pick(['link_title', 'title', 'p_link_title']);
      const kUrl = pick(['url', 'p_url', 'link_url']);
      const kIp = pick(['ip', 'client_ip', 'remote_addr']);
      const kId = pick(['link_id', 'p_link_id']);

      /* 按标题聚合 Top */
      const agg = {};
      rows.forEach(function (r) {
        const t = kTitle ? (r[kTitle] || '（未命名）') : '（未命名）';
        agg[t] = (agg[t] || 0) + 1;
      });
      const top = Object.keys(agg).sort(function (a, b) { return agg[b] - agg[a]; }).slice(0, 6);
      const max = top.length ? agg[top[0]] : 1;

      let html = '<div class="statgrid">';
      html += '<div class="statcard"><div class="k">最近记录</div><div class="v">' + rows.length + '</div>' +
              '<div class="d">窗口内条数，非全站总量</div></div>';
      html += '<div class="statcard"><div class="k">点得最多</div><div class="v" style="font-size:19px">' +
              esc(top.length ? top[0] : '—') + '</div><div class="d">' +
              (top.length ? agg[top[0]] + ' 次' : '') + '</div></div>';
      html += '</div>';

      html += '<div class="sec-head" style="margin-top:34px"><h2>点击分布</h2><span class="n">前 6</span></div>';
      html += '<div class="bars">';
      top.forEach(function (t) {
        const w = Math.round((agg[t] / max) * 100);
        html += '<div class="bar"><span class="bl">' + esc(t) + '</span>' +
                '<span class="bt"><i style="width:' + w + '%"></i></span>' +
                '<span class="bn">' + agg[t] + '</span></div>';
      });
      html += '</div>';

      html += '<div class="sec-head" style="margin-top:34px"><h2>最近明细</h2><span class="n">' +
              rows.length + ' 条</span></div>';
      html += '<div style="overflow-x:auto"><table class="tbl"><thead><tr>' +
              '<th>时间</th><th>链接</th>' + (kIp ? '<th>IP</th>' : '') +
              '</tr></thead><tbody>';
      rows.slice(0, 60).forEach(function (r) {
        let t = kTime ? r[kTime] : '';
        if (t) {
          try { t = new Date(t).toLocaleString('zh-CN', { hour12: false }); } catch (e) {}
        }
        html += '<tr>' +
          '<td class="num" style="white-space:nowrap;font-size:12.5px">' + esc(t) + '</td>' +
          '<td>' + esc(kTitle ? (r[kTitle] || '') : '') +
            (kUrl && r[kUrl] ? '<div class="num ell" style="font-size:11.5px;color:var(--ink-4)">' +
              esc(r[kUrl]) + '</div>' : '') + '</td>' +
          (kIp ? '<td class="num" style="font-size:12.5px">' + esc(r[kIp] || '') + '</td>' : '') +
          '</tr>';
      });
      html += '</tbody></table></div>';

      box.innerHTML = html;
    } catch (e) {
      box.innerHTML = '<div class="empty">读取失败：' + esc(e.message) +
        '<br><br>如果提示权限不足，说明 click_log 表还没给登录用户开读权限。</div>';
    }
  }


  /* ============================================================
     技术服务 / 分享：内容表增删改
     ============================================================ */
  const SCHEMAS = {
    services: {
      table: 'services',
      name: '技术服务',
      cols: [
        { k: 'title', t: '标题' },
        { k: 'badge', t: '角标', w: '96px' },
        { k: 'href', t: '跳到哪个页面', w: '200px' }
      ],
      fields: [
        { k: 'title', label: '卡片标题', ph: '私人影音库搭建', req: true },
        { k: 'badge', label: '角标（可空）', ph: '热门 / 音质党 / 省心' },
        { k: 'icon', label: '图标', type: 'select', opts: [
          ['film', '胶片'], ['music', '音符'], ['server', '机箱'], ['tool', '工具'], ['box', '箱子']
        ] },
        { k: 'href', label: '点开跳转到', ph: 'movie.html 或 https://…', req: true },
        { k: 'sort_order', label: '排序（小的在前）', type: 'number', ph: '1' }
      ]
    },
    shares: {
      table: 'shares',
      name: '分享',
      cols: [
        { k: 'group_name', t: '分组', w: '96px' },
        { k: 'title', t: '标题' },
        { k: 'descr', t: '说明' },
        { k: 'url', t: '地址', w: '200px' }
      ],
      fields: [
        { k: 'group_name', label: '分组', ph: '资源 / 工具', req: true },
        { k: 'title', label: '标题', ph: '飞牛影视使用帮助', req: true },
        { k: 'descr', label: '说明', ph: '官方文档，卡住了先翻这里' },
        { k: 'url', label: '地址', ph: 'https://...' },
        { k: 'sort_order', label: '排序（小的在前）', type: 'number', ph: '1' }
      ]
    }
  };

  const ROWS = { services: [], shares: [] };

  async function loadContent(kind) {
    const sch = SCHEMAS[kind];
    const tbody = $('#rows-' + kind);
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="empty">正在读取…</td></tr>';
    try {
      const rows = await DB.list(sch.table, '?select=*&order=sort_order.asc,id.asc');
      ROWS[kind] = rows || [];
      renderContent(kind);
    } catch (e) {
      const hint = e.status === 404
        ? '表还没建。先到 Supabase 的 SQL Editor 跑一遍 <b>sql/02-可编辑内容.sql</b>。'
        : '读取失败：' + esc(e.message);
      tbody.innerHTML = '<tr><td colspan="6" class="empty">' + hint + '</td></tr>';
    }
  }

  function renderContent(kind) {
    const sch = SCHEMAS[kind];
    const rows = ROWS[kind] || [];
    const tbody = $('#rows-' + kind);
    const total = $('#' + (kind === 'services' ? 'svcTotal' : 'shrTotal'));
    if (total) total.textContent = rows.length + ' 条';

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">还没有条目，点左上角新增</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (r) {
      const cells = sch.cols.map(function (c) {
        let v = r[c.k];
        v = (v == null ? '' : String(v));
        const cls = (c.k === 'url' || c.k === 'href') ? ' class="sm ell"' : ' class="sm"';
        return '<td' + cls + (c.w ? ' style="max-width:' + c.w + '"' : '') + '>' + esc(v) + '</td>';
      }).join('');
      return '<tr>' +
        '<td class="num">' + esc(r.id) + '</td>' +
        cells +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="btn btn--ghost btn--sm" data-c-edit="' + esc(r.id) + '">改</button> ' +
          '<button class="btn btn--ghost btn--sm" data-c-del="' + esc(r.id) + '">删</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  $$('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () { openContent(b.dataset.add, null); });
  });

  ['services', 'shares'].forEach(function (kind) {
    const tbody = $('#rows-' + kind);
    if (!tbody) return;
    tbody.addEventListener('click', async function (e) {
      const ed = e.target.closest('[data-c-edit]');
      const dl = e.target.closest('[data-c-del]');
      if (ed) {
        const row = ROWS[kind].find(function (x) { return String(x.id) === ed.dataset.cEdit; });
        if (row) openContent(kind, row);
      }
      if (dl) {
        const row = ROWS[kind].find(function (x) { return String(x.id) === dl.dataset.cDel; });
        if (!row) return;
        const nm = row.title || ('#' + row.id);
        if (!confirm('删除「' + nm + '」？删了就没了。')) return;
        try {
          await DB.removeIn(SCHEMAS[kind].table, row.id);
          window.toast('已删除');
          loadContent(kind);
        } catch (ex) {
          window.toast('删除失败：' + ex.message);
        }
      }
    });
  });

  let curKind = null;
  let curId = null;

  function openContent(kind, row) {
    const sch = SCHEMAS[kind];
    curKind = kind;
    curId = row ? row.id : null;
    $('#cTitle').textContent = (row ? '改' : '新增') + sch.name;
    $('#cErr').textContent = '';

    $('#cFields').innerHTML = sch.fields.map(function (f) {
      const v = row && row[f.k] != null ? String(row[f.k]) : (f.type === 'select' ? f.opts[0][0] : '');
      const id = 'cf_' + f.k;
      let ctrl;
      if (f.type === 'textarea') {
        ctrl = '<textarea class="inp" id="' + id + '" rows="3" placeholder="' + esc(f.ph || '') + '">' + esc(v) + '</textarea>';
      } else if (f.type === 'select') {
        ctrl = '<select class="inp" id="' + id + '">' + f.opts.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
        }).join('') + '</select>';
      } else {
        ctrl = '<input class="inp" id="' + id + '" type="' + (f.type || 'text') + '" value="' + esc(v) +
               '" placeholder="' + esc(f.ph || '') + '">';
      }
      return '<label class="field"><span>' + esc(f.label) + '</span>' + ctrl + '</label>';
    }).join('');

    openModal('cModal');
  }

  $('#cForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!curKind) return;
    const sch = SCHEMAS[curKind];
    const row = {};
    for (const f of sch.fields) {
      const el = $('#cf_' + f.k);
      if (!el) continue;
      let v = el.value.trim();
      if (f.req && !v) { $('#cErr').textContent = f.label + '不能空'; return; }
      if (f.type === 'number') v = v === '' ? 0 : Number(v);
      row[f.k] = v === '' ? null : v;
    }
    const btn = $('#cSave');
    btn.disabled = true; btn.textContent = '保存中…';
    $('#cErr').textContent = '';
    try {
      if (curId == null) await DB.createIn(sch.table, row);
      else await DB.updateIn(sch.table, curId, row);
      closeModal('cModal');
      window.toast('已保存，前台刷新可见');
      loadContent(curKind);
    } catch (ex) {
      $('#cErr').textContent = '保存失败：' + ex.message;
    } finally {
      btn.disabled = false; btn.textContent = '保存';
    }
  });


  /* ---------------- 启动 ---------------- */
  if (SESS && SESS.access_token) {
    const who = $('#whoami');
    if (who) who.textContent = SESS.email || '';
    probeDB();
    loadLinks();
    window.scrollTo(0, 0);
  }
})();
