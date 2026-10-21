-- ============================================================
-- handou-site · 常用入口的分组（分类）也能在后台改
-- 位置：Supabase Dashboard → SQL Editor，整段执行。可重复执行。
--
-- 做三件事：
--   1) 建 public.groups 表：分组名、副标题、颜色、排序
--   2) 把现有 links 里出现过的分类名导进去（常用 / 其他 带原来的配色与副标题）
--   3) 给 links.sort_order 补默认值并回填，让链接能手动排序
--
-- 注意：links.category 存的是「分组名」，改名时要同步改 links，见文件末尾说明。
-- ============================================================


-- ---------- 1. 分组表 ----------
create table if not exists public.groups (
  id         bigserial primary key,
  name       text not null unique,
  hint       text,
  color      text default '#3FA3AE',
  sort_order int  default 100,
  visible    boolean default true,
  created_at timestamptz default now()
);


-- ---------- 2. 权限 ----------
alter table public.groups enable row level security;

grant select on public.groups to anon;
grant select, insert, update, delete on public.groups to authenticated;
grant usage, select on sequence public.groups_id_seq to authenticated;

drop policy if exists groups_read  on public.groups;
create policy groups_read  on public.groups for select to anon, authenticated using (true);

drop policy if exists groups_write on public.groups;
create policy groups_write on public.groups for all    to authenticated   using (true) with check (true);


-- ---------- 3. 种子：现有两个分组 ----------
insert into public.groups (name, hint, color, sort_order)
values
  ('常用', '装飞牛先看这几个', '#3FA3AE', 10),
  ('其他', '查资料、逛论坛',   '#C4679A', 20)
on conflict (name) do nothing;

-- 链接里如果还有别的分类名，一并补进分组表（排在后面）
insert into public.groups (name, sort_order)
select distinct l.category, 100
  from public.links l
 where l.category is not null and btrim(l.category) <> ''
   and not exists (select 1 from public.groups g where g.name = l.category);


-- ---------- 4. 链接排序 ----------
alter table public.links add column if not exists sort_order int;

-- 没排序值的按 id 顺序补上，每 10 一个空档，方便以后插入
with t as (
  select id, row_number() over (order by category, id) as rn
    from public.links
   where sort_order is null
)
update public.links l
   set sort_order = t.rn * 10
  from t
 where l.id = t.id;


-- ---------- 自检 ----------
select g.name, g.hint, g.color, g.sort_order,
       (select count(*) from public.links l where l.category = g.name) as links
  from public.groups g
 order by g.sort_order, g.id;


-- ============================================================
-- 改名提示
-- groups.name 是分组标题，links.category 里存的是同一个名字。
-- 改名同步已经由 sql/06-分组改名同步.sql 的触发器自动处理，
-- 这里不用再手动 update。
-- ============================================================
