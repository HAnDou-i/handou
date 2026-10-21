/* ============================================================
   admin-login.js — 登录页（admin/index.html）
   只做三件事：探数据库连接、登录、登录成功跳到 app.html
   ============================================================ */

(function () {
  const $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------------- 数据库连接状态 ---------------- */
  async function probeDB() {
    const box = document.getElementById('connLogin');
    if (!box) return;
    const tx = box.querySelector('.conn__tx');
    const set = function (state, text) {
      if (state) box.dataset.s = state; else box.removeAttribute('data-s');
      if (tx) tx.textContent = text;
    };

    set('', '检查数据库连接…');
    try {
      const rows = await DB.listLinks();
      set('ok', '数据库已连接 · ' + (rows || []).length + ' 条链接');
    } catch (e) {
      const why = e.status === 404 ? '表不存在' : (e.status === 0 ? e.message : (e.message || '未知错误'));
      set('fail', '数据库连接失败：' + why);
    }
  }

  /* ---------------- 登录 ---------------- */
  const form = $('#loginForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = $('#emailInput').value.trim();
      const pass = $('#passInput').value;
      const btn = $('#loginBtn');
      const err = $('#loginErr');

      if (!email || !pass) { err.textContent = '邮箱和密码都要填'; return; }

      btn.disabled = true;
      btn.textContent = '登录中…';
      err.style.color = '';
      err.textContent = '';

      try {
        await DB.signIn(email, pass);
        err.style.color = '#276B52';
        err.textContent = '登录成功，正在进入后台…';
        /* 换页，不再在同一页里切换 */
        location.href = 'app.html';
      } catch (ex) {
        const code = ex.code || '';
        const m = String(ex.message || '');
        if (code === 'invalid_credentials' || /invalid login credentials/i.test(m)) {
          err.textContent = '邮箱或密码不对';
        } else if (code === 'email_not_confirmed' || /not confirmed/i.test(m)) {
          err.textContent = '这个邮箱还没确认，去 Supabase → Authentication → Users 里点确认后再登';
        } else if (code === 'over_email_send_rate_limit' || /rate limit/i.test(m)) {
          err.textContent = '尝试太频繁，等一分钟再试';
        } else {
          err.textContent = '登录失败：' + (m || '未知错误');
        }
        btn.disabled = false;
        btn.textContent = '登录';
      }
    });
  }

  /* 已经登录过就直接进去 */
  const s = DB.currentUser();
  if (s && s.access_token) {
    location.replace('app.html');
    return;
  }

  probeDB();
})();
