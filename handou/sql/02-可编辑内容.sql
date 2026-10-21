-- ============================================================
-- handou-site · 让「技术服务」和「分享」也能在后台改
-- 位置：Supabase Dashboard → SQL Editor，整段粘贴执行。
-- 可重复执行：表已存在就跳过，种子数据只在表为空时插入。
--
-- 建两张表：
--   services  技术服务条目（首页与 /services/ 都读它）
--   shares    分享条目（/share/ 读它，按 group_name 分组）
-- 同时把匿名读、登录写的权限配好。
-- ============================================================


-- ---------- 技术服务 ----------
create table if not exists public.services (
  id          bigserial primary key,
  title       text        not null,
  badge       text,                        -- 角标：热门 / 音质党 / 省心，可空
  descr       text,                        -- 一句话描述（desc 是 SQL 关键字，故用 descr）
  price       text,                        -- 显示的价格文字：¥299 / 按规模 / 按次
  price_unit  text,                        -- 价格后面的小字
  href        text,                        -- 详情页地址，可空
  icon        text        default 'box',   -- film / music / server / tool / box
  sort_order  int         default 0,
  visible     boolean     default true,
  created_at  timestamptz default now()
);

-- ---------- 分享 ----------
create table if not exists public.shares (
  id          bigserial primary key,
  group_name  text        not null default '资源',   -- 分组名，同名的会并到一组
  title       text        not null,
  descr       text,
  url         text,
  sort_order  int         default 0,
  visible     boolean     default true,
  created_at  timestamptz default now()
);


-- ---------- 种子：只在表还是空的时候塞一次 ----------
insert into public.services (title, badge, descr, price, price_unit, href, icon, sort_order)
select * from (values
  ('私人影音库搭建', '热门',   '装服务端、刮出海报墙、打通电视和手机，做完打开就能看。', '¥299',   '一次性 · 远程交付',  'movie.html', 'film',   1),
  ('音乐库整理服务', '音质党', '补标签、配封面、去重名，整成一张手机上直接能听的库。', '按规模', '看过清单再报价',    'music.html', 'music',  2),
  ('NAS 远程运维',   '省心',   '新机安装、外网访问、自动备份、容器环境，出事时有人能问。', '按次',   '一次一结，不绑订阅', 'nas.html',   'server', 3)
) as v
where not exists (select 1 from public.services);

insert into public.shares (group_name, title, descr, url, sort_order)
select * from (values
  ('资源', '飞牛影视使用帮助', '官方文档，卡住了先翻这里', 'https://www.kdocs.cn/l/cke5hsufd3Gb', 1),
  ('资源', '夸克网盘 1TB 获取教程', '含资源汇总，按需自取', 'https://pan.quark.cn/s/5f8aae6a025a', 2)
) as v
where not exists (select 1 from public.shares);


-- ---------- 权限 ----------
alter table public.services enable row level security;
alter table public.shares   enable row level security;

grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant usage, select on sequence public.services_id_seq to authenticated;

grant select on public.shares to anon;
grant select, insert, update, delete on public.shares to authenticated;
grant usage, select on sequence public.shares_id_seq to authenticated;

drop policy if exists services_read  on public.services;
create policy services_read  on public.services for select to anon, authenticated using (true);
drop policy if exists services_write on public.services;
create policy services_write on public.services for all    to authenticated   using (true) with check (true);

drop policy if exists shares_read  on public.shares;
create policy shares_read  on public.shares for select to anon, authenticated using (true);
drop policy if exists shares_write on public.shares;
create policy shares_write on public.shares for all    to authenticated   using (true) with check (true);


-- ============================================================
-- 自检
-- ============================================================
select 'services' as t, count(*) from public.services
union all
select 'shares', count(*) from public.shares;

-- 回滚（连数据一起删，慎用）
-- drop table if exists public.services;
-- drop table if exists public.shares;
