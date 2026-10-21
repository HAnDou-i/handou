/* ============================================================
   common.js — 全站通用交互：提示条 / 浮层 / 时钟 / 复制
   ============================================================ */

(function () {
  /* ---------------- 提示条 ---------------- */
  let toastTimer = null;
  window.toast = function (msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.dataset.show = 'true';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.dataset.show = 'false'; }, 2000);
  };

  /* ---------------- 浮层 ---------------- */
  window.openModal = function (id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.dataset.open = 'true';
    const first = m.querySelector('input, button');
    if (first) setTimeout(function () { first.focus(); }, 60);
  };
  window.closeModal = function (id) {
    const m = document.getElementById(id);
    if (m) m.dataset.open = 'false';
  };

  document.addEventListener('click', function (e) {
    const closer = e.target.closest('[data-close]');
    if (closer) {
      const m = closer.closest('.modal');
      if (m) m.dataset.open = 'false';
    }
    if (e.target.classList && e.target.classList.contains('modal')) {
      e.target.dataset.open = 'false';
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal[data-open="true"]')
        .forEach(function (m) { m.dataset.open = 'false'; });
    }
  });

  /* ---------------- 复制 ---------------- */
  window.copyText = async function (text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      window.toast(okMsg || '已复制');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); window.toast(okMsg || '已复制'); }
      catch (e2) { window.toast('复制失败，请手动选择'); }
      ta.remove();
    }
  };

  /* ---------------- 时钟（只在需要时跑） ---------------- */
  const clockEls = document.querySelectorAll('[data-clock]');
  if (clockEls.length) {
    const fmt = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Asia/Hong_Kong'
    });
    const tick = function () {
      const t = fmt.format(new Date());
      clockEls.forEach(function (el) { el.textContent = t; });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------- 年份 ---------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------------- 外部链接一律新窗口 ---------------- */
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href^="http"]');
    if (a && !a.target) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
})();
