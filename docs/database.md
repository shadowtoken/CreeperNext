# 数据库与 Next 全栈规范

CreeperNext 使用 PostgreSQL + Drizzle ORM + `pg`，Better Auth 和未来业务表共用一个数据库。当前只包含真实需要的认证表，不创建 projects、billing、team 等示例业务。Drizzle 是服务端的数据访问工具；认证、输入校验、业务权限和返回字段选择仍由应用负责。

## 结构与依赖方向

```text
config/database.ts          PostgreSQL URL、连接数校验
config/auth.ts              认证 URL、密钥和 Cookie 环境配置
server/db/client.ts         server-only；每进程复用一个连接池
server/db/schema/auth.ts    当前 Better Auth 配置生成的表与关系
server/auth-config.ts      Drizzle adapter + 认证策略
drizzle/                   SQL 迁移、snapshot、journal，全部纳入版本控制
scripts/db-migrate.ts       显式执行迁移，执行后关闭自己的连接池
scripts/auth-schema.mjs     使用锁定版本的 Better Auth Schema 生成器
```

业务按需增加 `server/db/schema/<domain>.ts`。SQL 风格查询直接导入对应表即可；需要关系查询时，再把相关表和 relations 纳入 `client.ts` 的 schema。认证 Schema 独立生成，避免覆盖业务表。

Feature 保持 `components + lib + 按需公开入口`。服务端查询放入该域私有的 `lib/server/`，每个服务端模块加 `import "server-only"`，通过域根 `server.ts` 显式导出必要查询。表单写入通过域根的模块级 `use server` 文件 `actions.ts` 暴露；不通过 UI 的 `index.ts` 汇总数据库能力。不要求每个域创建空的 Repository、Service 或 Transaction 文件。完整规则见 [工程边界规范](architecture.md)。

- Server Component → 域内服务端查询 → Drizzle → PostgreSQL。
- 表单 → Server Action → 输入校验 + 当前 Session/MFA + 资源权限 → 数据库写入。
- 外部调用/Webhook → Route Handler → 身份或签名校验 → 相同业务逻辑。
- `services/api` 继续负责浏览器/外部后端的 HTTP 请求；服务端不请求自己的 `/api`。

受保护 Layout 不能代替数据边界授权。任何写操作和私有查询都需要重新验证当前身份，并在 SQL 条件中限制资源归属。查询只选择 UI 所需字段；不能把完整 account/session/two_factor 记录作为 props 返回浏览器。数据库行类型、API DTO、表单输入各自承担不同职责，ORM 类型安全不能替代运行时输入校验。

## 本地连接

`.env.example` 对应 `compose.yaml`：开发库监听 `127.0.0.1:55432`，测试库监听 `127.0.0.1:55433`。Docker 只提供本地 PostgreSQL，也可替换为自己管理的数据库。

```bash
pnpm db:up
pnpm db:migrate
pnpm dev
```

`DATABASE_URL` 必填，格式为 `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`。用户名、密码含特殊字符时应做 URL 编码；`.env` 中的 `$` 还需遵循 Next 环境变量转义规则。连接串绝不能使用 `NEXT_PUBLIC_` 前缀或输出到日志。

`DATABASE_POOL_MAX` 默认 5，表示每个 Node 进程的上限，不是整个系统的上限。连接池在开发热更新时复用，连接等待超时 5 秒，空闲连接回收 30 秒，普通查询执行上限 15 秒。修改数据库配置后重启 Next 进程。不要在每个请求中新建 Pool 或调用 `pool.end()`。

更改 Compose 端口可在 shell 设置 `DATABASE_PORT` / `TEST_DATABASE_PORT`，并同步修改连接 URL。Compose 不读取 Next 的 `.env.local`，默认命令也不依赖它。`pnpm db:stop` 保留开发数据卷；不要用 `docker compose down -v` 作为常规停止命令。

## Schema 与迁移

本项目锁定稳定版 Drizzle ORM 0.45.2 / Kit 0.31.10，与 Better Auth 1.7.1 的 Relations v1 适配器配套。不要直接套用 Drizzle 1.0 RC 的 Relations v2 示例。

Drizzle Kit 的旧加载器传递依赖带有受 GHSA-67mh-4wv8-2f99 影响的 esbuild；`package.json` 对 `@esbuild-kit/core-utils>esbuild` 定向固定为已修复的 0.25.12。升级 Kit 后应复查该覆盖是否仍需要，并重跑生成命令与审计。

认证 Schema 的来源是 `server/auth-config.ts` 中的 Better Auth 配置，包含 TOTP 插件和 `session.mfaVerifiedAt`。新增认证插件后：

```bash
pnpm auth:generate
# 审查 server/db/schema/auth.ts 的变化
pnpm db:generate
# 审查生成的 SQL，确认是否有数据转换/约束变化
pnpm db:check
pnpm db:migrate
```

仅业务 Schema 变化时，从 `db:generate` 开始。生成命令不执行 DDL；`db:migrate` 只执行版本化迁移，重复执行会跳过已应用记录。`auth:migrate` 暂时保留为 `db:migrate` 的兼容别名，不再运行 SQLite 迁移。不要编辑已经应用的 SQL/snapshot/journal，后续变更新增迁移。

`auth:generate` 会更新认证 Schema 文件，需要审查差异。生成器使用已安装的 `auth/api`，通过 Node 的 `react-server` 条件加载真实服务端配置；无需临时移除 server-only。`db:generate` 不要求数据库在线；`auth:generate` 需要配置认证和数据库环境变量，但不会查询数据库。

构建和应用启动都不自动迁移。生产发布由单个受控步骤执行 `db:migrate`；涉及删列、改类型时先评审和备份，采用兼容旧应用的分阶段变更。Drizzle 不自动保证业务迁移无损，也不提供本项目的自动回滚方案。

## 事务

使用原生 Drizzle transaction；多次写入必须使用回调传入的 `tx`，不能在回调中改用外部 `db`：

```ts
await db.transaction(async (tx) => {
  // await tx.insert(...)
  // await tx.update(...)
  // 抛出错误时，本事务内的写入会一起回滚。
});
```

调用第三方支付、邮件等网络服务时不要长时间持有数据库事务。Better Auth 的 Drizzle adapter 已启用事务支持；认证安全门禁仍保留在 Better Auth hooks 和 `server/auth.ts`。

## 独立测试库

```bash
pnpm db:test:up
pnpm test
pnpm test:responsive:install  # 首次安装 Chromium
pnpm test:responsive
pnpm db:test:stop
```

测试只接受显式 `TEST_DATABASE_URL`，其数据库名须以 `_test` 结尾。测试角色需要 CREATEDB；必须使用独立测试服务器，不能使用生产服务器。测试会创建自己的 `creeper_test_<随机值>` 数据库、执行同一组真实 SQL 迁移、运行断言并清理自己创建的库，不清空 URL 指向的基准数据库。异常强杀可能留下测试库，应在测试服务器上确认归属后手动清理。

测试进程会覆盖应用连接、认证密钥、Cookie 前缀、Origin 和协议，避免本机认证配置污染测试。生产构建测试使用不可连接的 PostgreSQL 地址，因此能发现误把数据库查询放进模块初始化或静态构建的情况。CI 使用 PostgreSQL 18 service，与本地使用相同迁移和认证流程。

## 部署

运行时是 Node.js；`pg` 需要 TCP 连接能力，不能把这些模块直接放进 Edge Runtime。Serverless/多副本需计算“实例数 × 每实例连接数”，必要时使用供应商连接池。`DATABASE_DIRECT_URL` 可指定迁移专用直连和 DDL 凭据，未填时回退到 `DATABASE_URL`。应用角色在生产应只有所需 DML 权限，不需要 CREATEDB 或日常 DDL 权限。

远程数据库按供应商要求配置 TLS 和证书校验，不在代码中使用 `rejectUnauthorized: false`。Compose 密码是公开开发占位值，不能用于生产。备份、时间点恢复、监控和数据库凭据由部署环境管理。迁移和生成命令属于开发/发布工具，生产只安装运行依赖时应在独立发布任务中运行它们。

## 从 SQLite 升级

应用已经改为 PostgreSQL，不再使用 `AUTH_DB_PATH`。旧 `.sqlite`、WAL、SHM 文件不删除也不转换，依然被 Git 忽略。连接新 PostgreSQL 后，账号数据与旧 SQLite 独立，需要重新注册，除非另外执行数据迁移。

本次只提供 PostgreSQL 初始结构迁移，不包含旧用户数据导入。保留旧账户需要停写、备份、逐表转换并验证唯一约束/外键，尤其是日期、布尔值、认证标识和加密 TOTP 字段。必须保留原 `BETTER_AUTH_SECRET` 才能正确读取由它加密的认证数据；旧 Session 建议失效，要求重新登录及验证 TOTP。不能简单复制 SQLite 文件或把 SQL dump 直接导入 PostgreSQL。

参考：[Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)、[Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)、[Next 数据安全](https://nextjs.org/docs/app/guides/data-security)。
