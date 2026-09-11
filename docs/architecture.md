# 工程边界与功能开发规范

这个脚手架按职责和业务域组织。目录用于表达所有权，`server-only` / `use client` / `use server` 表达运行环境，自动检查约束实际 import 图。增加业务时按需建立文件，不要求为简单功能创建完整的空目录或通用 Repository 抽象。

## 目录职责

| 位置 | 放什么 | 依赖约束 |
| --- | --- | --- |
| `app` | 路由、Metadata、页面组合、Layout、HTTP 入口 | 消费 Feature 公开入口、服务端门禁和公共基础模块 |
| `components/ui` | 无业务知识的 UI 原子 | 只依赖同层、纯工具及前端领域类型；不依赖 Feature、Service、Shared |
| `components/shared` | 真正跨业务复用的组合 UI | 可以组合 UI、公共配置、Core 和纯工具；不调用业务服务、不依赖 Feature |
| `features/<domain>/components` | 该业务自己的界面 | 域内实现可以互相引用，跨域通过公开入口 |
| `features/<domain>/lib` | 域内校验、计算及其他共享实现 | 按真实需求创建；客户端使用的模块不能间接引用服务端能力 |
| `features/<domain>/lib/server` | 域内私有查询、操作与权限检查 | 依赖本域共享 lib、Core、Server、Config、类型；不能依赖 UI 或浏览器 SDK |
| `server` | 数据库、认证及其他服务端基础设施 | 不反向依赖 Feature、页面、UI、浏览器 Service 或 Hook |
| `services/api/<domain>`、`services/ws` | 浏览器请求适配、实时连接 | 不依赖页面、UI、Feature 或 Server；服务端对外访问适配放 `server` |
| `hooks` | 真正跨域的客户端 Hook | 可以消费 Service、Core、纯工具与类型，不依赖 Feature 或 UI |
| `core` | 路径契约、领域基础规则、错误与操作规则 | 只依赖 Core 和前端领域类型，无 React / Next 依赖 |
| `lib` | 无业务语义的共享工具，例如 `cn` | 不依赖业务层、框架或环境变量 |
| `types/api` | 外部后端 DTO、请求响应类型 | 可以引用 API 类型和领域类型，不引用实现层 |
| `types/domain` | 前端领域类型 | 不依赖 API DTO、框架或实现层 |
| `config/site.ts` | 可公开的品牌常量 | 可供浏览器使用，不包含环境变量和敏感数据 |
| 其他 `config/*` | 环境配置与服务端配置 | 默认按服务端配置处理；新增浏览器可用配置需明确调整规则 |

`hooks`、`types`、`services/ws` 当前仍是有文档的扩展位置，没有为了填目录而实现业务。完整允许关系在 `scripts/lib/architecture.mjs` 的 `allowed` 表维护。ESLint 保留基础的即时提示；`pnpm check:architecture` 是解析完整本地依赖图的检查入口。

## Feature 公开入口

域根目录中的 `.ts` / `.tsx` 文件是公开入口；`components/`、`lib/` 等子目录是内部实现。外部调用者包括 `app` 和其他 Feature，都不能直接引用这些内部文件。

小而纯的能力可以保留 `index.ts`，例如当前 `features/marketing/index.ts`。包含多个交互场景的域使用独立入口，避免把全部客户端组件汇总在一起。入口采用显式命名导出，不使用 `export *`。

认证域现有入口：

| 路由 | 公开入口 | 必要的认证客户端入口 |
| --- | --- | --- |
| `/login` | `features/auth/login.ts` | LoginForm |
| `/register` | `features/auth/register.ts` | RegisterForm |
| `/two-factor` | `features/auth/two-factor.ts` | TwoFactorChallengeForm |
| `/two-factor/setup` | `features/auth/setup.ts` | TwoFactorEnrollment、SignOutButton |
| `/account` | `features/auth/account.ts` | ChangePasswordForm、SignOutButton |

这些是供 Server Component 组合页面的入口，因此带有 `import "server-only"`。它们可以导出交互组件，但自身不加 `use client`；表单的交互边界仍在具体组件上。

```tsx
// app/(auth)/login/page.tsx
import { AuthShell, LoginForm } from "@/features/auth/login";
```

域内部使用相对路径；跨层推荐使用 `@/` 别名。检查器按解析后的实际文件判断职责，所以更换别名、使用 `../`、改用动态导入或 re-export 都不会改变规则。

## 前后端开发流程

新增功能时先明确它是否需要服务端数据，通常只增加实际使用的文件：

1. 纯展示：增加域内组件，复用 UI 和视觉 Token，再添加窄入口供路由消费。
2. 私有读取：查询放在域内 `lib/server`，在查询函数中验证 Session/MFA 和资源归属。通过域根 `server.ts` 显式导出需要公开的查询。
3. 表单写入：入口放域根 `actions.ts`，文件顶部声明 `use server` 并导入 `server-only`。导出的异步函数做输入校验，调用域内服务端操作，成功后按需刷新缓存。
4. Server Component 调用服务端查询，Client Component 接收最小必要 DTO 或 Server Action 引用。外部后端的浏览器请求继续走 `services/api`。

服务端操作可以复用本域 `lib` 中的纯校验函数，但不能使用 `services/api/auth/client.ts` 这样的浏览器 SDK。数据库结构变化遵循 [数据库规范](database.md) 的 Schema → SQL → 审查 → 迁移流程。

Client Component 直接导入模块级 `use server` 文件是合法的 Server Action 引用：Next 会生成远程调用引用，检查器在这里停止浏览器依赖遍历。不能把普通服务端查询模块也当作这个例外；仅写一个函数内的 `use server` 不会让整个文件成为可供浏览器导入的 Action 模块。

受保护 Layout 用于页面访问体验。Server Action、Route Handler、私有查询仍需在数据操作边界鉴权和授权。这里的静态检查不验证业务权限是否正确，也不能代替服务端认证测试。

## 环境变量与类型

只有 `config/env.ts`、`config/runtime.ts`、`config/auth.ts`、`config/database.ts` 和 Next 自身配置可读取环境变量。`runtime.ts` 为 Next 配置与 CLI 共享解析逻辑，仍属于私有服务端配置；`env.ts` 保留 server-only 应用入口。检查覆盖常见的点访问、字符串下标访问、`globalThis.process`、从 process 解构 env，以及直接导入 process 模块；不把注释里的示例误报成代码。

不允许直接添加 `NEXT_PUBLIC_*` 变量；需要公开配置时，先确定浏览器确实需要这个值，再调整明确的配置边界和检查规则。私有配置即使当前没有密钥，也不能沿客户端依赖链进入浏览器。

`import type` / `export type` 不产生运行时依赖，因此不参与客户端遍历和运行时循环检测，但仍需遵守目录所有权。不要让 UI 直接导入数据库行类型或 Better Auth 内部类型；跨边界返回经过筛选的数据。类型安全不代替表单/API 的运行时校验。

## 自动检查与适用范围

```bash
pnpm check:architecture
pnpm test:architecture
pnpm test
```

检查器使用项目已有的 TypeScript 编译器，读取 `tsconfig.json` 解析路径，不增加架构分析依赖。它覆盖 Git 跟踪及尚未提交的新 JS/TS 文件，含 `hooks`、`types`，支持静态 import、re-export、字符串动态 import、require、import-equals 和 type import。动态拼接的模块路径要求改成显式的静态导入映射。

检查内容包括依赖方向、Feature 私有实现、服务端标记、客户端间接依赖、服务端业务代码误用浏览器代码、宽泛 Feature index 引入本域客户端组件、运行时循环，以及环境配置边界。诊断提供文件、行号或依赖链。

`server/db/schema/*` 是服务端目录，但因生成器/Drizzle CLI 需要读取，不强制加入 `server-only`。客户端依赖检查仍会拒绝到达这个目录。配置解析文件同样保留 CLI 可加载性。

检查范围是本地 JS/TS 的可静态解析依赖，不扫描 CSS 依赖图、第三方包内部或任意运行时代码行为。Next 构建继续承担真实 Server/Client 编译边界验证。不要把静态检查描述为完整的安全沙箱。

`tests/architecture.test.mjs` 使用虚拟源文件验证允许和禁止的情况，不污染工程目录。`tests/build-boundaries.test.mjs` 读取当前锁定 Next 版本的生产 client-reference manifest，验证五个认证路由各自包含必要的客户端入口。Next 升级改变产物格式时需要同步调整这项测试。

本次重构前，五个认证路由都引用了全部六个认证客户端入口；重构后分别为 1、1、1、2、2 个。构建测试约束的是模块职责，而不是易受版本、压缩和公共 chunk 影响的固定 KB 阈值。
