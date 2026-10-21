-- ============================================================
-- handou-site · 给点击统计加限频
-- 位置：Supabase Dashboard → SQL Editor，整段执行。可重复执行。
--
-- 背景：record_click 必须允许匿名调用（站点要统计点击），
--       所以任何人写脚本循环调用都能往 click_log 里灌垃圾。
-- 做法：不动 record_click，在 click_log 上加一个插入前触发器，
--       同一个 IP 太频繁就静默丢弃，正常用户完全无感。
--
-- 规则：
--   · 3 秒内同一 IP 最多 2 条（脚本狂刷直接被吃掉）
--   · 同一 IP 每天最多 300 条（防慢慢滴灌）
--   · 拿不到 IP 的（NULL / 空）一律放行，宁可放过不误杀
-- ============================================================

-- 查询要用到 (ip, clicked_at)，先补索引，否则每次插入都要全表扫
create index if not exists click_log_ip_time_idx
  on public.click_log (ip, clicked_at desc);


create or replace function public.click_log_throttle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
  today  int;
begin
  if new.ip is null or btrim(new.ip) = '' then
    return new;
  end if;

  -- 同一个 IP 串行化：否则并发请求会各自看到「最近 0 条」，一起穿过去
  perform pg_advisory_xact_lock(hashtext(new.ip)::bigint);

  select count(*) into recent
    from public.click_log
   where ip = new.ip
     and clicked_at > now() - interval '3 seconds';

  if recent >= 2 then
    return null;                    -- 3 秒内第 3 次起，丢掉
  end if;

  select count(*) into today
    from public.click_log
   where ip = new.ip
     and clicked_at > now() - interval '1 day';

  if today >= 300 then
    return null;                    -- 单 IP 当天到顶，丢掉
  end if;

  return new;
end;
$$;


drop trigger if exists click_log_throttle on public.click_log;
create trigger click_log_throttle
  before insert on public.click_log
  for each row execute function public.click_log_throttle();


-- ============================================================
-- 自检
-- ============================================================
select tgname as trigger_name, tgenabled as enabled
  from pg_trigger
 where tgrelid = 'public.click_log'::regclass
   and not tgisinternal;

-- 看索引在不在
select indexname from pg_indexes
 where schemaname = 'public' and tablename = 'click_log'
 order by indexname;


-- ============================================================
-- 平时维护（手动跑，或用 pg_cron 每月跑一次）
-- ------------------------------------------------------------
-- 删 180 天前的点击记录：
-- delete from public.click_log where clicked_at < now() - interval '180 days';
--
-- 看今天有没有异常 IP：
-- select ip, count(*) n from public.click_log
--  where clicked_at > now() - interval '1 day'
--  group by ip order by n desc limit 10;
--
-- 回滚（撤掉限频）：
-- drop trigger if exists click_log_throttle on public.click_log;
-- drop function if exists public.click_log_throttle();
-- ============================================================
