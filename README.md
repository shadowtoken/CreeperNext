# CreeperNext

一个轻量、可直接启动的 Next.js 产品脚手架。它提供真正通用的地基：响应式 Landing、邮箱密码认证、强制 TOTP、服务端权限门禁、Design Tokens、无障碍与生产式测试。Admin、计费、多租户和业务状态管理按真实需求作为 Feature 加入。

## 快速启动

需要 Node.js `>=22.19.0` 和 pnpm `10.33.x`。

```bash
pnpm install
cp .env.example .env.local
openssl rand -base64 32
```

把生成值填入 `BETTER_AUTH_SECRET`，将 `AUTH_DB_PATH` 改为本机绝对路径，然后执行：

```bash
pnpm auth:migrate
pnpm dev
```

默认访问 [http://localhost:3000](http://localhost:3000)。改用 3100 端口时，需要同时修改 `SITE_URL` 和 `BETTER_AUTH_URL`。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `SITE_URL` | Metadata、robots 与 sitemap 使用的公开 Origin；只在服务端读取 |
| `BETTER_AUTH_SECRET` | 至少 32 字符的会话密钥 |
| `BETTER_AUTH_URL` | Better Auth canonical Origin |
| `BETTER_AUTH_PROTOCOL` | `http`、`https` 或 `auto` |
| `BETTER_AUTH_ALLOWED_HOSTS` | 动态 Base URL 的精确 Host 白名单 |
| `BETTER_AUTH_TRUSTED_ORIGINS` | 可选的额外浏览器 Origin 白名单 |
| `AUTH_COOKIE_PREFIX` | 当前应用独有的 Cookie 前缀 |
| `AUTH_DB_PATH` | SQLite 绝对路径；生产环境强制要求 |
| `NEXT_ALLOWED_DEV_ORIGINS` | 仅开发期允许加载 Dev Assets 的额外 hostname |

生产环境会 fail-fast：缺少 `SITE_URL`、认证密钥、认证 URL、Cookie 前缀或数据库路径时拒绝启动。URL 必须是没有 credentials、path、query 和 hash 的 HTTP(S) Origin。生产环境不自动信任 localhost。

`.env.local`、SQLite/WAL/SHM 和构建产物均被 Git 忽略。共享机器上的 `.env.local` 与数据库文件建议使用 `0600` 权限；正式部署使用 Secret Manager。当前 Node SQLite 只适合本地开发或带持久卷的单实例 Node，不适合临时文件系统、无状态 Serverless 或多副本写入。

### 多项目本地登录隔离

Cookie 的隔离键不包含端口，因此 `localhost:3000` 和 `localhost:3100` 可能携带同名 Cookie。每个项目必须使用不同的 `AUTH_COOKIE_PREFIX`；长期并行开发推荐使用 `creeper.localhost:3100`、`another.localhost:3101` 等不同本地域名，并分别配置允许的 Host/Origin。不要复制浏览器中整段跨项目 Cookie 调试认证接口。

## 工程结构

```text
CreeperNext/
├── app/                              # 路由、布局、Metadata、HTTP 入口
│   ├── (auth)/                       # 登录、注册、TOTP 路由组
│   ├── (protected)/                  # 统一服务端权限门禁
│   ├── api/auth/[...all]/route.ts    # Better Auth Catch-all HTTP 适配器
│   ├── error.tsx                     # 路由级可恢复错误边界
│   ├── global-error.tsx              # 根布局最终兜底
│   ├── globals.css                   # 全局视觉系统唯一入口
│   └── page.tsx                      # Landing 页面组装
├── components/
│   ├── ui/                           # Button、Kicker 等基础 UI 原子
│   └── shared/                       # 真正跨 Feature 的 Brand
├── features/
│   ├── auth/
│   │   ├── components/               # 登录、注册、TOTP、改密与安全设置
│   │   └── index.ts                  # 认证 Feature 公开入口
│   └── marketing/
│       ├── components/               # Landing Header、Footer 与预览构图
│       └── index.ts
├── core/
│   └── auth/                         # 与框架无关的路径和认证策略
├── services/
│   ├── api/auth/client.ts            # Better Auth 浏览器 transport adapter
│   └── ws/                           # 有实时业务后再实现
├── server/
│   ├── auth-config.ts                # Better Auth、SQLite 和安全 Hook
│   └── auth.ts                       # 服务端 Session/MFA 门禁
├── config/
│   ├── env.ts                        # 服务端公开 Origin 校验
│   └── site.ts                       # 非敏感品牌配置
├── styles/                           # Token → Adapter → Foundation
├── types/                            # 有真实 DTO/领域模型后按域创建
├── hooks/                            # 仅放真正跨域的客户端 Hook
├── tests/                            # HTTP、安全、响应式与 Axe
└── scripts/check-architecture.mjs    # Env 与目录边界门禁
```

目录约束：

- `app` 保持薄，只负责 Metadata、服务端门禁和页面组合。
- `components/ui` 不依赖 Feature、Service 或 Server。
- `components/shared` 只收纳真正跨多个 Feature 的组件。
- `features/<domain>` 通过 `index.ts` 暴露能力，`components/`、`lib/` 按需创建。
- `services/api/<domain>` 对应后端业务域的 transport adapter；不要在组件中拼接 API URL。
- `core` 不依赖 React、Next 或 Feature。
- Server Component 直接调用服务端模块，不通过 HTTP 请求本应用 `/api`。
- `use client` 只放在需要状态、事件或浏览器 API 的交互叶子。

ESLint 和 `pnpm check:architecture` 会自动阻止主要的反向依赖、根 `components` 杂物和散落的环境变量读取。

## 认证边界

浏览器链路：

```text
Feature Client Component
  → services/api/auth/client.ts
  → /api/auth/*
  → app/api/auth/[...all]/route.ts
  → server/auth-config.ts
  → SQLite
```

Server Component 不走 HTTP：

```text
Page / Layout
  → server/auth.ts
  → Better Auth Server API
  → SQLite
```

`app/(protected)` 是 Route Group，不会进入 URL。目录名本身没有权限能力；真正门禁来自其 Layout 的服务端检查，私有数据、Server Action 和 Route Handler 仍需在数据边界再次授权。

### 强制 TOTP 状态机

```text
注册
  → 密码登录
  → /two-factor/setup
  → 确认密码
  → 扫描二维码
  → 输入 6 位动态代码
  → 进入受保护应用
```

后续每次密码登录都必须完成 TOTP。门禁同时检查：

```text
user.twoFactorEnabled === true
session.mfaVerifiedAt != null
```

账户已绑定不等于当前 Session 已验证，这能防止另一浏览器中的旧密码 Session 自动获得权限。API Hook 会重新读取权威数据库 Session，并对未来新增的 Session 管理端点默认 fail-closed。

本产品默认不提供恢复码、可信设备绕过、导出 TOTP 密钥或关闭 2FA；对应 HTTP 端点均被硬禁用。动态代码连续失败五次会触发账户级临时锁定。升级 Better Auth 前应复核官方 [Two-Factor Authentication](https://better-auth.com/docs/plugins/2fa) 和 [Trusted Origins](https://better-auth.com/docs/reference/options) 协议，并重跑完整测试。

认证插件或数据库字段变化后执行：

```bash
pnpm auth:migrate
```

## 视觉与响应式

`app/globals.css` 只导入 `styles/index.css`。视觉链路保持单一：

```text
Primitive Tokens
  → Semantic Tokens / Theme
  → Tailwind & shadcn Adapters
  → Foundation Rules
  → UI / Feature CSS Modules
```

常规布局和组件状态使用 Tailwind；复杂 Landing 构图使用局部 CSS Modules。页面不直接消费原始色值。响应式使用 Fluid CSS、Intrinsic Layout、Named Container Query、少量内容驱动的 Viewport Query，以及 Safe Area、Reduced Motion 和输入能力查询。

320、390、568 横屏、768、1024、1280×800、1440 和 1920 是验收样本，不是设备分支。详细规范见 [视觉系统](docs/visual-system.md) 和 [响应式设计](docs/responsive-design.md)。

第三方 shadcn/Registry 组件先使用 `view`、`--dry-run` 和 `--diff` 审核，再复制为本地源码并适配 Token、RSC、键盘、H5、Reduced Motion 和许可证。完整页面 Block 不使用 `--overwrite` 盲装。

## 质量门禁

```bash
pnpm lint
pnpm check:architecture
pnpm check:secrets
pnpm typecheck
pnpm build
pnpm test
pnpm test:responsive:install   # 首次执行
pnpm test:responsive
pnpm audit --prod
git diff --check
```

`pnpm test` 使用生产构建和隔离数据库验证路由、Origin、真实注册登录、强制 TOTP、双浏览器旧 Session、敏感认证 API、恢复码端点禁用、开放重定向和安全响应头。

`pnpm test:responsive` 在 Chromium 多视口验证 Landing、认证、Account、404、边界上下 1px、横向溢出、内容裁切、44×44 触控目标、200% 文本、Reduced Motion、Light/Dark 对比度和 Axe。

GitHub Actions 会依次执行依赖审计、Lint、架构边界、TypeScript、生产 HTTP 测试和浏览器门禁。自动化不能替代发布前的键盘、VoiceOver、真实浏览器 Zoom 与真机 Safe Area 检查。
