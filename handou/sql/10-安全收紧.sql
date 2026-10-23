-- ============================================================
-- handou-site · 安全收紧（2026-10-23 全面安全审查后执行，已在库内生效）
-- 位置：Supabase Dashboard → SQL Editor，整段粘贴执行。可重复执行。
--
-- 背景：审计发现两件事
--   ① 项目开着「允许新用户注册」：任何人能注册拿到 authenticated 令牌，
--      而所有业务表的写策略都是 authenticated 一刀切放行 → 等于谁都能改你网站。
--   ② 探针验证：匿名确实注册成功过（测试账号已删）。
--
-- 这里做两件事：
--   ① 删掉测试注册的账号
--   ② 所有写策略从「authenticated 放行」收紧为「仅管理员这个 uid」
--      （就算以后误开注册，别人注册成功也动不了任何数据）
--
-- 配套：Dashboard → Authentication → Sign In / Providers →
--       "Allow new users to sign up" 已关闭（disable_signup = true）。
-- ============================================================

-- ① 删测试注册的账号（换成你自己的探针邮箱/uid）
delete from auth.users where id = '4b6a764a-5fa8-4c81-8c40-511f9b7fcf76';

-- ② 写权限收紧到管理员本人（uid 从 auth.users 里查你自己的账号）
drop policy if exists links_write_auth on public.links;
create policy links_write_auth on public.links
  for all to authenticated
  using (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895')
  with check (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895');

drop policy if exists groups_write on public.groups;
create policy groups_write on public.groups
  for all to authenticated
  using (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895')
  with check (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895');

drop policy if exists link_items_write on public.link_items;
create policy link_items_write on public.link_items
  for all to authenticated
  using (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895')
  with check (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895');

drop policy if exists services_write on public.services;
create policy services_write on public.services
  for all to authenticated
  using (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895')
  with check (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895');

drop policy if exists shares_write on public.shares;
create policy shares_write on public.shares
  for all to authenticated
  using (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895')
  with check (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895');

drop policy if exists click_log_read_auth on public.click_log;
create policy click_log_read_auth on public.click_log
  for select to authenticated
  using (auth.uid() = 'fff6a90a-d5fa-40a4-94eb-e688d57ea895');
