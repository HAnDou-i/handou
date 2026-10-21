-- ============================================================
-- handou-site · 分组改名 / 删除时，自动同步链接的分类
-- 位置：Supabase Dashboard → SQL Editor，整段执行。可重复执行。
--
-- 为什么需要：
--   links.category 里存的是分组名。以前改了 groups.name，
--   链接还留着旧名字，前台找不到这个分组，就会掉进第一组。
--
-- 两个触发器：
--   1) 改分组名  → 把 links.category 里同名的全部改过来
--   2) 删分组    → 把这一组的链接挪到剩下的第一个分组（没有就置空）
-- ============================================================

-- ---------- 1. 改名同步 ----------
create or replace function public.groups_sync_name() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.links
       set category = new.name
     where category = old.name;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_sync_name on public.groups;
create trigger groups_sync_name
  after update of name on public.groups
  for each row execute function public.groups_sync_name();


-- ---------- 2. 删分组时收尾 ----------
create or replace function public.groups_cleanup_links() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback text;
begin
  -- 剩下分组里排最前的那个，作为兜底
  select g.name into fallback
    from public.groups g
   where g.id <> old.id
   order by g.sort_order, g.id
   limit 1;

  update public.links
     set category = fallback          -- 没有其它分组时就是 null
   where category = old.name;

  return old;
end;
$$;

drop trigger if exists groups_cleanup_links on public.groups;
create trigger groups_cleanup_links
  after delete on public.groups
  for each row execute function public.groups_cleanup_links();


-- ---------- 自检 ----------
select g.name,
       (select count(*) from public.links l where l.category = g.name) as links
  from public.groups g
 order by g.sort_order, g.id;

-- 查有没有「分类名不在分组表里」的链接（应该为 0 行）
select l.id, l.title, l.category
  from public.links l
 where l.category is not null
   and not exists (select 1 from public.groups g where g.name = l.category);


-- ============================================================
-- 回滚（如果哪天不想自动改了）：
--   drop trigger if exists groups_sync_name on public.groups;
--   drop trigger if exists groups_cleanup_links on public.groups;
-- ============================================================
