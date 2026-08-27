# CreeperNext

一个可直接启动的标准 Next.js 产品脚手架。它只提供大多数产品真正共用的地基：

- 响应式 Landing Page
- 邮箱注册、登录、退出与数据库会话
- 服务端鉴权与 fail-closed 受保护路由
- 本地 UI 组件、Tailwind CSS 4 与语义 Design Tokens
- CSS 动效 Token、Reduced Motion 和键盘可访问性
- Metadata、Open Graph、robots 与 sitemap
- Lint、类型检查、生产构建、真实认证闭环与 9 视口浏览器门禁

Admin、多租户、计费、图表、编辑器和复杂状态管理不属于基础模板，需要时再按 Feature 加入。

## 快速启动

需要 Node.js `>=22.19.0` 和 pnpm `10.33.x`。Better Auth 的 SQLite 适配依赖较新的 `node:sqlite` API；项目通过 `engines` 和 `packageManager` 明确锁定可验证的运行时基线。

```bash
pnpm install
cp .env.example .env.local
openssl rand -base64 32
```

把最后一条命令生成的值填入 `.env.local` 的 `BETTER_AUTH_SECRET`，然后初始化本地认证数据库并启动：

```bash
pnpm auth:migrate
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。如果 3000 已被占用，可运行 `pnpm dev --port 3100`，并同步修改两个 URL 环境变量。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `BETTER_AUTH_SECRET` | 会话签名密钥；生产环境必须使用独立高熵值 |
| `BETTER_AUTH_URL` | Better Auth 的站点基准 URL |
| `AUTH_DB_PATH` | 本地 SQLite 数据库路径 |
| `NEXT_PUBLIC_SITE_URL` | Metadata、Open Graph、robots 与 sitemap 的公开站点 URL |

`.env.local` 和数据库文件不会进入版本控制。

## 整体工程结构

```text
CreeperNext/
├── app/                                  # Next.js App Router：路由、布局和 HTTP 入口
│   ├── layout.tsx                        # 根布局；字体、Metadata、全局 CSS、Skip Link
│   ├── page.tsx                          # /；公开 Landing Page
│   ├── (auth)/                            # 认证页面路由组；括号目录不会出现在 URL 中
│   │   ├── login/page.tsx                # /login；登录页面
│   │   └── register/page.tsx             # /register；注册页面
│   ├── (protected)/                       # 受保护页面路由组；统一挂载服务端门禁
│   │   ├── layout.tsx                    # 每次进入子页面前检查 Session，未登录则跳转
│   │   └── account/page.tsx              # /account；最小受保护页面样板
│   ├── api/auth/[...all]/route.ts        # /api/auth/*；Better Auth 的 Catch-all HTTP 入口
│   ├── globals.css                       # 全局唯一入口；只导入 Creeper Visual System
│   ├── page.module.css                   # Landing 独有的表达型页面样式
│   ├── status.module.css                 # 404 / Error 状态页的局部样式
│   ├── global-error.tsx                  # 根级运行时错误兜底
│   ├── not-found.tsx                     # 404 页面
│   ├── robots.ts                          # /robots.txt
│   └── sitemap.ts                         # /sitemap.xml


├── components/                           # 可复用 React 组件；Tailwind-first，复杂视觉局部共置
│   ├── ui/                               # Button、Kicker 等本地基础 UI 出口
│   ├── login-form.tsx                    # 登录交互 Client Component
│   ├── register-form.tsx                 # 注册交互 Client Component
│   └── ...                               # Header、Footer、品牌和页面共享组件


├── server/                               # 只能在服务端执行的认证与数据基础设施
│   ├── auth-config.ts                    # Better Auth、SQLite、Cookie 和密码策略配置
│   └── auth.ts                           # getSession / requireSession 服务端接口


├── lib/                                  # 跨层复用的小型工具和浏览器端适配器
│   ├── auth-client.ts                    # Better Auth 浏览器客户端；只给交互组件使用
│   ├── auth-paths.ts                     # 校验登录后的 returnTo，阻止开放重定向
│   └── cn.ts                             # 合并组件 className


├── styles/                               # Creeper Visual System；不放页面业务结构
│   ├── index.css                         # 视觉系统唯一入口和确定的导入顺序
│   ├── tokens/
│   │   ├── primitives.css                # 原始色阶、间距、圆角、时长和缓动
│   │   ├── semantic.css                  # 运行时语义 Token、密度、尺寸和 Safe Area
│   │   └── themes.css                    # Dark / High Contrast 等语义覆盖
│   ├── adapters/
│   │   ├── tailwind.css                  # @theme 映射、语义 Utility 和布局入口
│   │   └── shadcn.css                    # 第三方 Registry 兼容边界与 CLI 写入目标
│   └── foundations/
│       ├── reset.css                     # Tailwind Preflight 之外的项目级增量
│       ├── document.css                  # html/body 等文档级规则
│       ├── accessibility.css             # Focus 和 Skip Link；sr-only 使用 Tailwind 内建工具
│       └── motion.css                    # Productive / Expressive 与 Reduced Motion


├── docs/
│   ├── visual-system.md                  # 视觉分层、Token、组件和验收规范
│   └── responsive-design.md              # 响应模型、H5 规则、断点决策和 QA 矩阵


├── config/site.ts                         # 站点名称、描述、公开 URL 和分享图配置
├── public/                                # 不经过打包、按原路径提供的静态资源
├── tests/
│   ├── app.test.mjs                      # HTTP、路由、安全和真实认证闭环测试
│   ├── support/                          # 不依赖本机 .env 的隔离生产构建器
│   └── browser/                          # 响应矩阵、共享测试会话、能力偏好和 Axe


├── components.json                        # shadcn CLI、别名和 Token 文件入口
├── playwright.config.ts                   # 生产式 Chromium、独立 DB 和失败产物
├── .github/workflows/quality.yml          # PR / main 自动质量门禁
├── next.config.ts                         # Next.js 配置与安全响应头
├── postcss.config.mjs                     # Tailwind/PostCSS 构建配置
├── eslint.config.mjs                      # ESLint、React、Hooks 和可访问性规则
├── tsconfig.json                          # TypeScript 与 @/* 路径别名
└── package.json                           # pnpm 版本、Node 版本、依赖和工程命令
```

`.next/`、`node_modules/`、`*.sqlite`、`*.tsbuildinfo`、Playwright 报告和 `.env.local` 都是生成物或本机配置，不属于工程源码，也不会提交到 Git。

### 三个容易混淆的关键边界

#### `app/api/auth/[...all]/route.ts` 是什么

`route.ts` 是 App Router 的 Route Handler，它提供 HTTP 接口，不渲染页面。`[...all]` 是 Catch-all 动态段，因此同一个文件会接住 `/api/auth/` 下的多级路径，例如注册、登录、读取 Session 和退出等请求，再统一交给 Better Auth 处理。

这个文件只做协议适配，不在里面重复写密码校验、Cookie 或数据库逻辑：

```text
浏览器表单
  → lib/auth-client.ts
  → /api/auth/*
  → app/api/auth/[...all]/route.ts
  → server/auth-config.ts 中的 Better Auth
  → SQLite
```

Server Component 不应为了读取 Session 再请求自己的网站 API。它直接调用 `server/auth.ts`，链路更短，也不会多一次 HTTP 往返：

```text
Server Page / Layout
  → server/auth.ts
  → Better Auth Server API
  → SQLite
```

#### `app/(protected)/` 是什么

圆括号表示 Route Group，只用来组织代码，不会进入 URL，所以文件 `app/(protected)/account/page.tsx` 对外仍然是 `/account`，而不是 `/protected/account`。

它的价值是把一组私有页面放在同一个 Layout 下。当前 `app/(protected)/layout.tsx` 会在服务端调用 `requireSession()`；没有有效 Session 时直接跳到登录页，因此未来把 `/settings`、`/billing` 等页面放进这个组，就会默认受到同一层门禁保护。

目录名 `(protected)` 本身没有任何安全能力，真正的保护来自 Layout 中的服务端检查。Layout 是页面访问的 fail-closed 默认值，但不是唯一授权层：涉及私有数据、写操作、Server Action 或 API 时，仍要在最靠近数据的位置再次校验用户身份和权限。

#### `styles/`、CSS Modules 和 `app/globals.css` 是什么关系

当前加载链只有一个入口：

```text
app/layout.tsx
  └─ import app/globals.css
       └─ @import styles/index.css
            ├─ @import "tailwindcss"
            ├─ @import styles/tokens/*
            ├─ @import styles/adapters/*
            └─ @import styles/foundations/*
```

| 文件 | 应该负责什么 | 不应该负责什么 |
| --- | --- | --- |
| `styles/tokens/primitives.css` | 原始色阶、间距、圆角、时长和缓动 | 让业务直接使用原始颜色；稳定 Scale 的例外见视觉规范 |
| `styles/tokens/semantic.css` | 用途命名的运行时 Token、密度、尺寸和 Safe Area | Tailwind Namespace、Registry 变量、页面排版 |
| `styles/tokens/themes.css` | 通过覆盖语义角色实现 Dark、High Contrast 等主题 | 重写组件选择器 |
| `styles/adapters/tailwind.css` | 把 Semantic Token 映射为 Utility；定义 `page-container` | 成为第二套运行时主题来源 |
| `styles/adapters/shadcn.css` | 隔离第三方兼容变量和 CLI 写入 | 承载核心品牌 Token 或页面样式 |
| `styles/foundations/*` | Reset、文档、无障碍和动效政策 | Landing、Auth 等业务页面样式 |
| `app/globals.css` | 只导入 `styles/index.css`，确保全局加载入口唯一 | 放置页面和组件选择器 |
| Tailwind Utility | 常规布局、间距、显示状态、Variant、Named Container Query | 渐变、伪元素和长篇艺术构图 |
| `*.module.css` | 页面艺术方向、复杂局部视觉和特殊选择器 | 与 Tailwind 同时拥有同一元素的同一属性 |

当前是明确的 Tailwind-first 混合架构：Header、Button、基础 Variant 与组件容器响应使用 Tailwind；Landing、Auth Shell 和 Foundation Preview 等表达型构图使用 CSS Modules；主题和密度使用 CSS Variables。完整 CSS 所有权、Cascade、Marketing / Product 边界与第三方接入规则见 [`docs/visual-system.md`](docs/visual-system.md)。

### 响应式不是按设备写三套页面

当前采用五层模型：Fluid CSS → Intrinsic Layout → Component Container Query → 少量 Page Viewport Query → 输入能力与用户偏好 Query。Grid 和卡片先根据内容自动换列；表单、Header、Footer 和预览组件根据自身容器调整；只有导航层级、全屏高度等真正依赖浏览器窗口的行为才读取 Viewport。

320、390、568 横屏、768、1024、1280×800/832、1440、1920 是验收样本，不是 iPhone / iPad / Desktop 的代码分支。阈值在内容开始失效的位置产生，不按设备品牌、User-Agent 或当前市场机型表产生。完整实现规则、Safe Area、H5 底线、图片策略和自动测试矩阵见 [`docs/responsive-design.md`](docs/responsive-design.md)。

## 工程约定与最佳实践判断

| 当前做法 | 判断 | 原因与边界 |
| --- | --- | --- |
| App Router，页面与 Layout 默认 Server Component | 推荐 | 数据与密钥留在服务端，减少浏览器 JavaScript；只有表单、退出按钮等交互叶子使用 `"use client"` |
| 用 Route Group 区分 `(auth)` 与 `(protected)` | 推荐 | URL 保持干净，同时可以按业务边界共享 Layout；不要误以为目录名本身能鉴权 |
| 在 `(protected)/layout.tsx` 做统一 Session 门禁 | 推荐 | 新增私有页面默认 fail-closed；数据读取和写操作仍需再次授权 |
| 用 `[...all]/route.ts` 承接 Better Auth 接口 | 推荐 | 让认证库集中拥有注册、登录、Session 和 Cookie 协议，应用不重复实现安全敏感细节 |
| `server/` 与 `lib/auth-client.ts` 分开 | 推荐 | 服务端秘密不会误进 Client Bundle，浏览器端只暴露必要客户端能力 |
| 业务只依赖本地 `components/ui` | 推荐 | 可以引入 shadcn 或其他源码型组件，又不会把业务永久锁死在第三方 API 上 |
| Primitive → Semantic → Adapter → Component | 推荐 | 原始值、运行时主题、工具链兼容与组件状态解耦；第三方不能污染核心 Token |
| Tailwind-first + CSS Modules 艺术层 | 推荐 | 常规 UI 只有一种 Utility 语言，复杂构图仍保持局部、可读和可替换 |
| `globals.css` 只作为视觉系统入口 | 推荐 | 真正全局的规则集中在 Foundations，页面和组件使用局部 CSS Modules |
| Marketing 与 Product 共用地基、分开构图 | 推荐 | 官网可以表达品牌，SaaS 页面保持高效稳定，不强迫两者长得一样 |
| `app/` 放在项目根目录而不是 `src/app/` | 两者都正确 | Next.js 官方同时支持；当前工程规模小，少一层目录更直观，变大后也不必为“看起来标准”而强制搬迁 |
| 暂不创建 `features/`、Admin、Billing 等空目录 | 推荐 | 没有业务前不预设抽象；第一个真实 Feature 到来时再按垂直切片创建 |

继续开发时遵守这些约定：

- 页面和布局默认使用 Server Component；只把表单、退出按钮等交互叶子标成 Client Component。
- 受保护目录在 Layout 层 fail-closed；读取私有数据时仍应在数据层再次鉴权。
- Server Component 直接调用服务端模块，不请求自己的 `/api`。
- 登录后跳转只接受同源相对路径，认证路由不能成为跳转目标。
- 只服务一个页面的组件与页面共置；跨页面基础组件进入 `components/ui`。

## 认证与存储

基础版使用 Better Auth 和 Node 内置 SQLite，提供真实注册与持久会话。认证边界集中在三个位置：

- `server/auth-config.ts`：认证 Provider 和存储实现。
- `server/auth.ts`：服务端页面消费的稳定会话接口。
- `lib/auth-client.ts`：交互叶子使用的客户端接口。

为了避免重复注册暴露邮箱是否存在，注册成功后不会自动登录；用户会回到登录页，再建立服务端会话。基础版没有发送验证邮件，因此“拥有这个邮箱”尚未被验证，不能把邮箱验证状态作为权限依据。生产项目应接入邮件发送服务并启用邮箱验证，或替换为 OAuth、Passkey、企业 SSO。

当前 SQLite 配置适合本地开发，或带持久卷的单实例 Node 部署。它不适合无状态 Serverless、临时文件系统或多副本写入。部署到这类环境时，应把 `server/auth-config.ts` 的数据库替换为托管 PostgreSQL/MySQL 等持久存储，并在目标环境执行迁移；页面和组件不需要跟着改。

如果保留单实例 SQLite，需要使用持久绝对路径，限制数据库文件权限，配置迁移与备份，并按并发量评估 WAL 和 busy timeout。生产环境还应在网关或平台层为登录与注册端点配置跨实例限流，并根据部署平台补充 HTTPS/HSTS 策略。

## UI、主题与漂亮组件

脚手架不把业务写死在某个第三方组件 API 上。业务只导入本地 `components/ui`，外部组件先复制为本地源码，再适配语义 Token。

当前 `components.json` 已配置 shadcn Registry、Tailwind CSS 4 和 Base Nova 风格：

```bash
pnpm dlx shadcn@latest info
pnpm dlx shadcn@latest view button
pnpm dlx shadcn@latest add dialog --dry-run
pnpm dlx shadcn@latest add dialog
```

首次正式添加组件时，CLI 会补充该组件需要的基础依赖。安装社区 Registry 前先使用 `view`、`--dry-run` 与 `--diff` 审查源码、依赖、全局样式、Client 边界、键盘行为和许可证。完整页面 Block 可能与现有 `/login` 等路由冲突，应先放进隔离目录人工合并，不使用 `--overwrite` 盲装。

可运行时替换的是颜色、字体、圆角、密度和动效 Token；Base UI、Radix 或 React Aria 这类交互基座应在生成期选择，不做运行时切换层。Sidebar/Admin 等模块还需要按需补充自己的语义 Token，不提前把它们塞进基础模板。

## 动效策略

默认只使用 CSS transition/animation，并集中消费 `styles/foundations/motion.css` 的 Productive / Expressive Token。需要退出动画、布局动画或手势时，再把 Motion 安装到局部 Client Island；GSAP 只用于独立营销体验。根布局不因动效变成 Client Component。

## 质量门禁

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:responsive:install   # 首次本机执行一次
pnpm test:responsive
pnpm audit --prod
```

`pnpm test` 会构建生产版本、创建隔离的临时认证数据库，并验证 Landing、恶意跳转过滤、跨站认证拒绝、真实注册/登录会话、受保护路由、404、安全响应头、robots 与 sitemap。

`pnpm test:responsive` 会再次使用生产构建和隔离数据库，在 9 个 Chromium 视口验证 Landing、Login、Register、404、真实登录态 Account、边界上下 1px、双轴可达性、元素与祖先裁切、控件重叠、44×44 目标、200% 文本放大、Reduced Motion、Light/Dark 对比度、错误态与 Axe。认证 Setup 只建立一次测试会话，不会为了绕过门禁而关闭生产限流。失败时保留 Screenshot、Video 和 Trace。

仓库已经提供 `.github/workflows/quality.yml`：生产依赖审计 → Lint → TypeScript → Node 集成测试 → Chromium 响应式 / 无障碍门禁。自动扫描不能替代真实浏览器 Zoom、键盘、VoiceOver 和真机 Safe Area 人工验收。
