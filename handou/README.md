# 啊游的杂货铺 · 站点源码

四块内容：**首页 / 常用入口 / 技术服务 / 乱七八糟**，外加一个后台。
纯静态，零第三方依赖（不引 CDN、不引框架），双击 `index.html` 就能看。

---

## 目录结构

```
handou-site/
├── index.html                首页（欢迎条 + 两组胶囊 + 技术服务卡）
├── nav/
│   └── index.html            常用入口（同一套胶囊，多了搜索框）
├── services/
│   ├── index.html            技术服务总览（三行价目）
│   ├── movie.html            私人影音库搭建 ¥299
│   ├── music.html            音乐库整理（按规模）
│   └── nas.html              NAS 部署与运维（按次）
├── share/
│   └── index.html            乱七八糟（资源 / 工具两组）
├── admin/
│   └── index.html            后台（登录后改链接、看点击统计）
├── sql/
│   ├── 01-后台与口令.sql      Supabase 配置一：口令列收权 + 后台读写
│   ├── 02-可编辑内容.sql      Supabase 配置二：services / shares 两张内容表
│   └── 03-点击限频.sql        Supabase 配置三：click_log 同 IP 限频触发器
└── assets/
    ├── css/
    │   ├── tokens.css        全部设计变量，改颜色只改这页
    │   ├── base.css          重置 / 排版 / 版心
    │   └── components.css    顶栏、卡片、按钮、清单、浮层、服务行…
    └── js/
        ├── config.js         全站唯一的数据源与文案常量
        ├── db.js             Supabase REST 封装（原生 fetch）
        ├── common.js         提示条 / 浮层 / 时钟 / 复制
        ├── content.js        技术服务 / 分享的读取与渲染（带兜底）
        ├── nav.js            常用入口的渲染与口令校验
        └── admin.js          后台逻辑
```

**为什么这样分**
首页和「常用入口」用的是同一份渲染逻辑（`nav.js` + `#navList`），数据都来自 Supabase 的 `links` 表；
区别是首页没有搜索框，并在下面接了一组技术服务卡。服务卡样式在 `components.css`（首页与技术服务页共用）。
- 样式按「层级」分文件：改色改 `tokens.css`，改结构改 `components.css`，页面专有样式写在页面自己的 `<style>` 里。
- 数据与表现分离：所有会变的内容（服务、分享、联系方式）集中在 `config.js`，页面只负责排。

---

## 三处最常改的地方

### 1. 换文案 / 加服务 / 加分享

改 `assets/js/config.js`：

```js
services: [ { id, name, desc, price, priceUnit, tags, href, featured } ]
shares:   [ { group: '资源', items: [ { title, desc, url } ] } ]
contact:  { qq: { label, url } }
```

改完刷新即可。首页的入口卡、分享页的列表都是从这份配置渲染的。
（`services/` 下的三个详情页是手写 HTML，改它们要直接改文件。）

### 2. 换配色 / 字号 / 圆角

只改 `assets/css/tokens.css`：

```css
/* 底色渐变：青 → 粉，沿用原站 v6 的四个色 */
--bg-1: #8DD7D1;  --bg-2: #CBD7E8;  --bg-3: #F2BFD8;  --bg-4: #F6D7EA;

--ink:    #152438;   墨色（正文，原站 text-main 体系）
--card:   rgba(255,255,255,.78);  卡片（半透明，让渐变透上来）
--line:   rgba(36,52,77,.13);     细线
--accent: #334C72;   主色（藏青，原站 accent）
--band-1/2/3: #3FA3AE / #334C72 / #C4679A;   三个板块的色带：青 / 藏青 / 玫
```

层次是三层玻璃：**渐变底 → `<main>` 白纱底板（54%）→ 卡片（78%）**。
底板规则写在 `base.css` 顶部，卡片在 `components.css`，一处改全站生效。

### 3. 增删技术服务 / 分享

也都进 `/admin/`，分别有「技术服务」「分享」两个标签页，点新增填表即可：

- **技术服务**：标题、角标、一句话描述、价格、价格小字、详情页地址、图标、排序。
  首页和服务总览页都读这张表，改一处两边同步。
- **分享**：分组名、标题、说明、地址、排序。**分组名相同的自动并成一组**，
  想加一组新内容，直接把分组名写成新的即可。

数据在 Supabase 的 `services` / `shares` 表（先跑 `sql/02-可编辑内容.sql` 建表）。
表没建的时候，前台会退回 `config.js` 里写死的那几条，所以不会白屏；
后台会直接提示「表还没建」。

> 详情页正文（`movie.html` 等三段长文）仍是手写 HTML，不在这两张表里——
> 表里只管「卡片」，详情页想改还是改文件。

### 4. 增删常用入口

不用改代码，进 `/admin/` 登录后直接增删改。
数据在 Supabase 的 `links` 表，字段：`id / title / url / category / password / icon`。

- `category` 写「常用」或「其他」，不认识的分类会自动归到「常用」。
- `password` 留空 = 无需口令。

---

## 口令是怎么工作的

**前端不接触口令明文，匿名角色也读不到 `password` 列。**

1. 列表请求只取 `id,title,url,category,icon`，不含 `password`；
2. 「哪些 id 有密码」走 RPC `locked_link_ids()`，只回一串 id；
3. 用户输入口令后调 `unlock_link(id, 输入)`，比对在数据库里做，只回 `true / false`。

关键在于第 2、3 步的两个函数配合 `sql/01-后台与口令.sql` 里的列级授权：那张 SQL 把 `links` 的表级 `select` 从 `anon` 收回，再按列重新授权（跳过 `password`）。
**没有它，任何人拿页面里的 anon key 直接请求 `?select=*` 就能读到明文口令**——这是原站的实际状态。

> 两个 RPC 还没建时，`db.js` 会自动退回旧做法（`?password=eq.<输入>`），站点照常能用，只是安全性差一档。
> 所以：**先跑 SQL，再上线**。

---

## 后台能做什么

`/admin/` → 邮箱 + 密码登录（Supabase Auth）→ 两个标签页：

- **链接管理**：增 / 删 / 改，可设口令、可清口令、可改分类。
- **点击统计**：走现有的 `record_click` RPC 和 `click_log` 表，显示最近记录、按链接聚合的分布条。

上线前 Supabase 侧要做四件事，前三件在 `sql/01-后台与口令.sql` 里已经写好：

1. **建一个邮箱用户**：Authentication → Users → Add user（要勾「Auto Confirm」）；
2. **`links` 表给 `authenticated` 增删改**（SQL 已含）；
3. **`click_log` 表给 `authenticated` 读**（SQL 已含）；
4. **收回 `anon` 对 `password` 列的读权限**（SQL 已含）。

这四件没配：前台照常用，后台登录不上或只能看不能写。

---

## 部署

纯静态，把 `handou-site/` 整个目录丢到任何静态托管即可（GitHub Pages / Cloudflare Pages / NAS 上的 nginx）。

没有构建步骤，没有 `npm install`，没有环境变量。
唯一的外部依赖是 Supabase 项目，地址和 anon key 在 `config.js` 里。

---

## 还差什么

- 三份 SQL 都已在 Supabase（项目 handou-links）上执行并验证过：
  口令列已对匿名收回、`services` / `shares` 各就位、`click_log` 已加限频（3 秒 2 条 / 单 IP 每日 300 条）。
- `share/index.html` 的「工具」组是空的，占位已留好。
- 服务页的价格只有影音库是明价，另两项写的是「按规模 / 按次」。
- 后台还没有「拖动排序」，顺序按 `id` 排。
- 没有任何图片资源，全靠 CSS 画（想加 Logo / 截图再放 `assets/img/`）。
