-- ============================================================
-- handou-site · 卡片可以挂「次级标题」（子链接）
-- 位置：Supabase Dashboard → SQL Editor，整段执行。可重复执行。
--
-- 一张卡片下面可以挂多个子项，每个子项有自己的标题和地址：
--   卡片「详细安装教程」
--     ├ 飞牛官方文档        → https://...
--     ├ Docker 版本安装      → https://...
--     └ 群晖迁移到飞牛       → https://...
-- 前台点卡片弹出这个列表，点子项才跳转。
-- 没有子项的卡片，点了照旧直接跳。
-- ============================================================

create table if not exists public.link_items (
  id         bigserial primary key,
  link_id    bigint not null references public.links(id) on delete cascade,
  title      text not null,
  url        text,
  sort_order int default 10,
  created_at timestamptz default now()
);

create index if not exists link_items_link_idx on public.link_items (link_id, sort_order, id);


-- ---------- 权限 ----------
alter table public.link_items enable row level security;

grant select on public.link_items to anon;
grant select, insert, update, delete on public.link_items to authenticated;
grant usage, select on sequence public.link_items_id_seq to authenticated;

drop policy if exists link_items_read  on public.link_items;
create policy link_items_read  on public.link_items for select to anon, authenticated using (true);

drop policy if exists link_items_write on public.link_items;
create policy link_items_write on public.link_items for all    to authenticated   using (true) with check (true);


-- ---------- 自检 ----------
select l.id, l.title,
       (select count(*) from public.link_items i where i.link_id = l.id) as items
  from public.links l
 order by l.sort_order, l.id;
