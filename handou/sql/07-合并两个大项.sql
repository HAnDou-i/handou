-- ============================================================
-- handou-site · 「技术服务支持」「乱七八糟」并成普通分组
-- 位置：Supabase Dashboard → SQL Editor，整段执行。可重复执行。
--
-- 背景：首页原来有两个特殊模块（服务卡、分享入口），点进去是次级页面。
-- 现在两者都改成和「常用 / 其他」一样的分组 —— 一栏卡片，里面是
-- 「卡片名 + 跳转链接」，用后台「链接管理」维护。
--
-- 这一步做三件事：
--   1) groups 里补两个分组行
--   2) 把 services 表里现有的三项服务搬进 links（跳转到 services/xxx.html）
--   3) shares 表如果有内容，一并搬进 links
-- 原来的 services / shares 表和页面都保留，不动一行。
-- ============================================================


-- ---------- 1. 两个分组 ----------
insert into public.groups (name, hint, color, sort_order)
values
  ('技术服务支持', '远程交付，只做技术',       '#9A7FD1', 30),
  ('乱七八糟',     '自己使用总结、免费分享的内容', '#C4679A', 40)
on conflict (name) do nothing;


-- ---------- 2. 服务 → 链接 ----------
insert into public.links (title, url, category, sort_order)
select s.title,
       case when s.href ~* '^https?://' then s.href
            else 'services/' || s.href end,
       '技术服务支持',
       row_number() over (order by s.sort_order nulls last, s.id) * 10
  from public.services s
 where coalesce(s.visible, true)
   and not exists (
     select 1 from public.links l
      where l.category = '技术服务支持'
        and (l.url = s.href or l.url = 'services/' || s.href)
   );


-- ---------- 3. 分享 → 链接 ----------
insert into public.links (title, url, category, sort_order)
select sh.title, sh.url, '乱七八糟',
       row_number() over (order by sh.sort_order nulls last, sh.id) * 10
  from public.shares sh
 where coalesce(sh.visible, true)
   and not exists (
     select 1 from public.links l
      where l.category = '乱七八糟' and l.url = sh.url
   );


-- ---------- 自检 ----------
select g.name,
       (select count(*) from public.links l where l.category = g.name) as links
  from public.groups g
 order by g.sort_order, g.id;

select id, title, url, category, sort_order
  from public.links
 where category in ('技术服务支持', '乱七八糟')
 order by sort_order, id;


-- ============================================================
-- 说明：搬过来的是副本。以后这两块的内容都在「链接管理」里改，
-- services / shares 表保留着，只给 services 总览页和分享页用，
-- 首页已经不读它们了。
-- ============================================================
