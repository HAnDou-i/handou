-- ============================================================
-- handou-site · 链接加「次级标题」
-- 位置：Supabase Dashboard → SQL Editor，整段执行。可重复执行。
--
-- 卡片变成两行：上面标题，下面一行小字。
-- 不填就不显示，卡片还是原来的一行高。
-- ============================================================

alter table public.links add column if not exists subtitle text;

-- 匿名只读这一列（sql/01 里按列授权，新列要单独给）
grant select (subtitle) on public.links to anon;

-- 登录用户要能写
grant select (subtitle), insert (subtitle), update (subtitle) on public.links to authenticated;


-- ---------- 自检 ----------
select id, title, subtitle, url
  from public.links
 order by sort_order, id;
