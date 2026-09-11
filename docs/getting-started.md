# 配置与首次启动

## 新项目最短路径

安装 Node.js >=22.19.0、pnpm 10.33.x。选择本地 Compose 数据库时还需要已运行的 Docker/OrbStack；使用现有 PostgreSQL 则不需要 Docker。

```bash
pnpm install --frozen-lockfile
pnpm setup:local
pnpm check:env
pnpm db:up
pnpm db:migrate
pnpm check:env --database
pnpm dev
```

默认站点 http://localhost:3000，本地数据库端口 55432。使用现有数据库时跳过 `db:up`，先在 `.env.local` 配置自己的 `DATABASE_URL`。迁移前确认目标数据库，不要把本地示例密码用于线上。

`setup:local` 只创建 `.env.local`，不装依赖、不启动服务、不迁移数据库。它使用系统随机数生成 32 字节认证密钥和项目独立的 Cookie 前缀，创建权限为 `0600`，不打印生成值。文件或同名软链接存在时直接保留；没有 `--force`。再次运行不会轮换密钥、改端口或覆盖已有配置。命令名刻意避开 pnpm 自带的 `setup` 和 `doctor`。

首次使用其他端口：

```bash
pnpm setup:local --port 3100
pnpm check:env
# 数据库启动和迁移步骤同上
pnpm dev --port 3100
```

已有 `.env.local` 时手动修改 `SITE_URL` 与 `BETTER_AUTH_URL`，再指定同一个启动端口。Next 的 `--port` 不会自动修改配置。多个项目不要共享认证密钥和 Cookie 前缀；Cookie 不按端口隔离。改 Cookie 前缀会使浏览器不再发送原名字的会话 Cookie，不应把它当作日常故障修复动作。

### 同时运行多个脚手架副本

Cookie 隔离不等于数据库隔离。`compose.yaml` 默认项目名为 `creeper-next`，复制目录后直接 `db:up` 会复用同名 Compose 项目。需要独立数据时，为新项目指定独立名称和空闲数据库端口：

```bash
COMPOSE_PROJECT_NAME=my-next-app DATABASE_PORT=55439 pnpm db:up
```

同时将该副本 `.env.local` 的 `DATABASE_URL` 端口改为 `55439`，再执行迁移。停止时沿用相同配置：

```bash
COMPOSE_PROJECT_NAME=my-next-app DATABASE_PORT=55439 pnpm db:stop
```

这些值是示例，应为每个项目选不同名称和端口。Compose 不自动读取 Next 的 `.env.local`，因此项目名和映射端口在 shell 中显式传入；数据库连接由 Next 配置读取。不要对正在使用的数据库执行清卷操作来“重新初始化”。

## 配置职责与优先级

| 配置 | 要求 | 读取位置 |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | 必填，至少 32 字符；setup:local 自动随机生成 | `config/auth.ts` |
| `BETTER_AUTH_URL` | 必填，完整的 HTTP(S) Origin | `config/auth.ts` |
| `SITE_URL` | 生产必填；开发缺失时回退 localhost:3000 | `config/runtime.ts`，应用通过 `config/env.ts` 访问 |
| `AUTH_COOKIE_PREFIX` | 生产必填；开发有默认值，但不同项目仍应独立 | `config/auth.ts` |
| `DATABASE_URL` | 必填，PostgreSQL 连接 | `config/database.ts` |
| `DATABASE_DIRECT_URL` | 可选；迁移直连，未填使用 DATABASE_URL | `config/database.ts` |
| `DATABASE_POOL_MAX` | 可选，默认 5，范围 1–100 | `config/database.ts` |
| Host / Origin / 协议设置 | 可选；参考 `.env.example`，只允许明确配置 | `config/auth.ts`、`config/runtime.ts` |
| `TEST_DATABASE_URL` | 仅测试必填；独立测试服务器，数据库名以 `_test` 结尾 | 测试支持代码 |

CLI 使用 Next 自身的 `@next/env`，与框架共享加载顺序：进程变量 → `.env.<mode>.local` → `.env.local` → `.env.<mode>` → `.env`。`check:env` 默认 development，`check:env --production` 使用 production；Next 的 test 模式不读取 `.env.local`。已有的集成测试明确加载本地测试连接，再为子进程注入隔离配置，不使用应用数据库。

`config/runtime.ts` 是 Next 配置和 CLI 共用的服务端解析模块，不是浏览器运行时配置。`config/env.ts` 保留 `server-only` 入口；依赖图检查禁止客户端间接引用任意私有 config。公开品牌常量仍放 `config/site.ts`，不要把密钥或数据库 URL 加入公共配置。

## 诊断与故障定位

`pnpm dev/build/start` 加载 Next 配置时调用同一组校验，集中列出缺失或非法项，**不连接数据库，也不自动迁移**。因此可以在数据库离线时构建。

```bash
pnpm check:env                       # 仅配置格式、Node 版本与基础一致性提醒
pnpm check:env --production          # 按生产环境加载规则检查
pnpm check:env --database            # 额外只读检查应用连接与基础认证表
pnpm check:env --production --database
```

数据库检查只执行元数据 SELECT，不读用户内容、不创建表、不改数据。它不能证明迁移没有漂移、写入权限足够、认证密钥足够随机或部署完全安全；生产 HTTP 仅发出提醒，以保留本地 production build 测试能力。正式发布必须配置 HTTPS、独立凭据和合适的 TLS。

| 现象 | 处理 |
| --- | --- |
| `pnpm` 不存在 / Node 过旧 | 先安装符合 package.json 的工具版本，再装依赖 |
| 配置检查失败 | 新项目运行 setup:local；已有配置按变量名修正，不要删除整个 env 文件 |
| `.env.local` 已改但没有生效 | 检查终端/部署平台的进程变量是否覆盖本地值，然后重启应用 |
| 数据库无法连接 | 确认 Docker/OrbStack 已运行，执行 db:up；或检查远程地址、网络、TLS 与凭据 |
| 数据库可达但缺表 | 确认连接指向目标库，审查迁移 SQL，再执行 db:migrate |
| 端口被占用 | 不要关闭不明进程；选择新端口并同步两个 Origin |
| 手机无法访问 | 手机不能用电脑的 localhost；使用同一局域网地址，并显式补 Host/Origin 白名单 |

诊断不打印原始配置值或驱动错误，避免凭据进入共享日志。遇到失败请提供变量名和错误提示，不要粘贴 `.env.local`、整段 Cookie 或数据库连接串。

验证命令：`pnpm test:config`。初始化测试只在自己创建的临时目录中运行，不改开发配置；数据库诊断另在 `pnpm test:db` 的随机隔离库中验证。
