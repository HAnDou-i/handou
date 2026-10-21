/* ============================================================
   db.js — 直连 Supabase REST（原生 fetch，不引第三方 SDK）
   ------------------------------------------------------------
   读：links 表（永不取 password 值，只取“哪些 id 有密码”）
   写：click_log（走 record_click RPC，IP 由数据库侧补齐）
   鉴权：Supabase Auth 密码登录，token 存 sessionStorage
   ============================================================ */

(function () {
  const CFG = window.SITE.db;
  const AUTH_KEY = 'handou_admin_session';

  function baseHeaders(extra) {
    const h = {
      apikey: CFG.anon,
      'Content-Type': 'application/json'
    };
    const s = session();
    h.Authorization = 'Bearer ' + (s && s.access_token ? s.access_token : CFG.anon);
    return Object.assign(h, extra || {});
  }

  async function req(path, opts) {
    const o = opts || {};
    const res = await fetch(CFG.url + path, {
      method: o.method || 'GET',
      headers: baseHeaders(o.headers),
      body: o.body ? JSON.stringify(o.body) : undefined
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      const err = new Error((data && (data.message || data.error || data.hint)) || ('HTTP ' + res.status));
      err.status = res.status;
      err.detail = data;
      throw err;
    }
    return data;
  }

  /* ---------------- Auth ---------------- */
  function session() {
    try { return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function setSession(s) {
    if (s) sessionStorage.setItem(AUTH_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(AUTH_KEY);
  }

  async function signIn(email, password) {
    const data = await req('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: email, password: password }
    });
    if (!data || !data.access_token) throw new Error('登录失败：没有拿到令牌');
    const s = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      email: (data.user && data.user.email) || email,
      exp: data.expires_at || 0
    };
    setSession(s);
    return s;
  }

  async function signOut() {
    const s = session();
    setSession(null);
    if (s && s.access_token) {
      try {
        await req('/auth/v1/logout', { method: 'POST' });
      } catch (e) { /* 本地已登出即可 */ }
    }
  }

  function currentUser() { return session(); }

  /* ---------------- links 读取 ---------------- */

  /* 全部链接（不含 password 字段） */
  function listLinks() {
    return req('/rest/v1/' + CFG.table +
      '?select=id,title,url,category,icon&order=category.asc,id.asc');
  }

  /* 只问“哪些 id 有密码”，密码值不下发到前端
     优先走 locked_link_ids()（sql/01 里建的）；
     函数还没建时退回列过滤，两条路都能跑。
     缺函数只探一次，之后直接走旧路，不重复吃 404。 */
  let NO_RPC = false;

  async function lockedIds() {
    if (!NO_RPC) {
      try {
        const rows = await req('/rest/v1/rpc/locked_link_ids', {
          method: 'POST', body: {}
        });
        return (rows || []).map(r => String(r));
      } catch (e) {
        if (e && e.status === 404) NO_RPC = true;   // 函数不存在才关掉这条路
      }
    }
    const rows = await req('/rest/v1/' + CFG.table +
      '?select=id&password=not.is.null&password=neq.');
    return (rows || []).map(r => String(r.id));
  }

  /* 口令校验：让数据库来比，前端全程不接触明文
     优先走 unlock_link()：只回 true / false，连“哪些 id 有密码”都不外露；
     函数还没建时退回列过滤（旧做法，能用但不如前者干净）。 */
  async function unlock(id, pass) {
    if (!NO_RPC) {
      try {
        const ok = await req('/rest/v1/rpc/unlock_link', {
          method: 'POST',
          body: { p_id: Number(id), p_pass: pass }
        });
        return ok === true;
      } catch (e) {
        if (e && e.status === 404) NO_RPC = true;   // 函数不存在才关掉这条路
      }
    }
    const rows = await req('/rest/v1/' + CFG.table +
      '?select=id&id=eq.' + encodeURIComponent(id) +
      '&password=eq.' + encodeURIComponent(pass));
    return Array.isArray(rows) && rows.length > 0;
  }

  /* ---------------- 点击统计 ---------------- */
  function logClick(linkId, title, url) {
    if (!navigator.onLine) return;
    req('/rest/v1/rpc/record_click', {
      method: 'POST',
      body: {
        p_link_id: linkId || null,
        p_link_title: title || '',
        p_url: url || '',
        p_referrer: document.referrer || '',
        p_user_agent: navigator.userAgent || ''
      }
    }).catch(function () { /* 统计失败不影响跳转 */ });
  }

  /* ---------------- 后台写入（需登录） ---------------- */
  function createLink(row) {
    return req('/rest/v1/' + CFG.table, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: row
    });
  }
  function updateLink(id, row) {
    return req('/rest/v1/' + CFG.table + '?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: row
    });
  }
  function deleteLink(id) {
    return req('/rest/v1/' + CFG.table + '?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE'
    });
  }

  /* ---------------- 统计读取（后台） ---------------- */
  function recentClicks(limit) {
    return req('/rest/v1/click_log?select=*&order=clicked_at.desc&limit=' + (limit || 60));
  }

  /* ---------------- 任意表的读写（后台/内容表用） ---------------- */
  function list(table, qs) {
    return req('/rest/v1/' + table + (qs || ''));
  }
  function createIn(table, row) {
    return req('/rest/v1/' + table, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: row
    });
  }
  function updateIn(table, id, row) {
    return req('/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: row
    });
  }
  function removeIn(table, id) {
    return req('/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE'
    });
  }

  window.DB = {
    session, signIn, signOut, currentUser,
    listLinks, lockedIds, unlock, logClick,
    createLink, updateLink, deleteLink, recentClicks,
    list, createIn, updateIn, removeIn
  };
})();
