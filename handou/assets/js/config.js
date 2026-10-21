/* ============================================================
   config.js — 全站唯一的数据源与常量
   改内容只改这里：服务、分享、联系方式、Supabase 地址
   ============================================================ */

window.SITE = {
  /* 站点身份 */
  brand:   '啊游的杂货铺',
  brandEn: 'handou',
  tagline: '把 NAS 上的东西收拾干净',
  domain:  '1188188.xyz',

  /* 数据源（Supabase 项目，只读用 anon key） */
  db: {
    url:  'https://mzxjyupadsakhsceidvm.supabase.co',
    anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eGp5dXBhZHNha2hzY2VpZHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDUzNjYsImV4cCI6MjA4NzkyMTM2Nn0.M4sPqp3-oYuw7JlRYmcqnCkLbRPvDYi7O6yMMdPXu88',
    table: 'links'
  },

  /* 常用入口：分组顺序与色点（其余分类自动归到第二组） */
  navGroups: [
    { id: '常用', hint: '装飞牛先看这几个', color: 'var(--band-1)' },
    { id: '其他', hint: '查资料、逛论坛',     color: 'var(--band-3)' }
  ],

  /* 技术服务：三大项 + 明价只有一档 */
  services: [
    {
      id: 'movie',
      name: '私人影音库搭建',
      desc: '装服务端、刮出海报墙、打通电视和手机，做完打开就能看。',
      price: '299',
      priceUnit: '一次性 · 远程交付',
      tags: ['远程', '当天可用'],
      href: 'movie.html',
      featured: true
    },
    {
      id: 'music',
      name: '音乐库整理',
      desc: '补标签、配封面、去重名，整成一张手机上直接能听的库。',
      price: '按曲库规模',
      priceUnit: '看过清单再报价',
      tags: ['按量计价'],
      href: 'music.html'
    },
    {
      id: 'nas',
      name: 'NAS 部署与运维',
      desc: '新机安装、外网访问、自动备份、容器环境，出事时有人能问。',
      price: '按单次',
      priceUnit: '一次一结，不绑订阅',
      tags: ['按次结算'],
      href: 'nas.html'
    }
  ],

  /* 分享：乱七八糟什么都放 */
  shares: [
    {
      group: '资源',
      items: [
        { title: '飞牛影视使用帮助', desc: '官方文档，卡住了先翻这里', url: 'https://www.kdocs.cn/l/cke5hsufd3Gb' },
        { title: '夸克网盘 1TB 获取教程', desc: '含资源汇总，按需自取', url: 'https://pan.quark.cn/s/5f8aae6a025a' }
      ]
    },
    {
      group: '工具',
      items: []
    }
  ],

  /* 联系方式 */
  contact: {
    qq: {
      label: 'QQ 群',
      url: 'https://qm.qq.com/cgi-bin/qm/qr?k=br7ATsw792ezfqZFH-s-3Eb2jklcH_F_'
    }
  },

  /* 合规声明（全站统一，别改） */
  disclaimer: '只提供技术部署与运维服务，不提供、不存储、不传播任何影视或音乐内容。'
};
