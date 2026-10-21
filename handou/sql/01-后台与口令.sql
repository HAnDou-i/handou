-- ============================================================
-- handou-site · Supabase 一次性配置
-- 位置：Supabase Dashboard → SQL Editor，整段粘贴执行。
-- 可重复执行，不会覆盖数据。
--
-- 干四件事：
--   ① 口令改成库内比对，匿名角色再也读不到 password 列
--   ② 新增两个小函数：unlock_link / locked_link_ids
--   ③ 登录用户能增删改 links（后台）
--   ④ 登录用户能读 click_log（后台统计）
--
-- 执行前建议先在 Dashboard 里确认 role 名称没被改过（默认 anon / authenticated）。
-- ============================================================


-- ---------- ① 口令比对：在库内完成，明文不出库 ----------
-- 前端只传「id + 用户输入」，返回对/不对，拿不到正确口令。
create or replace function public.unlock_link(p_id bigint, p_pass text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.links
     where id = p_id
       and coalesce(password, '') <> ''
       and password = p_pass
  );
$$;


-- ---------- ② 哪些链接上锁：只吐 id，不吐口令 ----------
create or replace function public.locked_link_ids()
returns setof bigint
language sql
security definer
set search_path = public
as $$
  select id
    from public.links
   where coalesce(password, '') <> '';
$$;

revoke all on function public.unlock_link(bigint, text) from public;
revoke all on function public.locked_link_ids() from public;
grant execute on function public.unlock_link(bigint, text) to anon, authenticated;
grant execute on function public.locked_link_ids() to anon, authenticated;


-- ---------- ③ 收回匿名读 password 列 ----------
-- 关键：现在任何人拿页面里的 anon key 直接请求 ?select=* 都能读到明文口令。
-- 这里把表级 select 收回，再按列重新授权（不含 password）。
-- 列名用动态拼装，不用手抄，表改了也不会漏。
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'links'
     and column_name <> 'password';

  if cols is null then
    raise notice 'public.links 没找到，跳过列级授权';
    return;
  end if;

  execute 'revoke select on public.links from anon';
  execute 'revoke select on public.links from public';
  execute format('grant select (%s) on public.links to anon', cols);
end $$;


-- ---------- ④ 登录用户可写 links ----------
grant select, insert, update, delete on public.links to authenticated;

alter table public.links enable row level security;

drop policy if exists links_read_public on public.links;
create policy links_read_public on public.links
  for select to anon, authenticated
  using (true);

drop policy if exists links_write_auth on public.links;
create policy links_write_auth on public.links
  for all to authenticated
  using (true) with check (true);


-- ---------- ⑤ 登录用户可读 click_log ----------
alter table public.click_log enable row level security;

grant select on public.click_log to authenticated;

drop policy if exists click_log_read_auth on public.click_log;
create policy click_log_read_auth on public.click_log
  for select to authenticated
  using (true);

-- 写入仍然只走 record_click 这个 security definer 函数，匿名不需要 insert 权限。


-- ============================================================
-- 自检（执行完会自动跑一遍，看到结果就说明成功）
-- ============================================================

-- 1) 每个链接是否上锁
select id,
       title,
       case when coalesce(password, '') = '' then 'open' else 'locked' end as state
  from public.links
 order by id;

-- 2) anon 现在能看到 links 的哪些列（应当没有 password）
select column_name
  from information_schema.column_privileges
 where table_schema = 'public'
   and table_name   = 'links'
   and grantee      = 'anon'
   and privilege_type = 'SELECT'
 order by column_name;

-- 3) 两个函数在不在
select proname, pg_get_function_identity_arguments(oid) as args
  from pg_proc
 where proname in ('unlock_link', 'locked_link_ids');

-- ============================================================
-- 回滚（万一想退回旧做法）
-- ------------------------------------------------------------
-- grant select on public.links to anon;
-- drop function if exists public.unlock_link(bigint, text);
-- drop function if exists public.locked_link_ids();
-- 注意：退回后口令会重新对匿名可读。
-- ============================================================
