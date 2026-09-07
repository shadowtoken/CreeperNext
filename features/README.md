# Features

按业务域组织前端能力。每个域使用 `index.ts` 暴露公开能力，`components/`、`lib/` 等内部目录按真实需求创建，不制造空层。

使用 Next 全栈时，域内服务端查询/操作可放 `lib/server/`，通过 `server-only` 防止被客户端引用。浏览器入口 `index.ts` 不再导出这些模块；Server Component 按需直接导入。数据库连接集中在 `server/db/client.ts`，认证和资源权限必须在数据操作边界检查，参见 [数据库规范](../docs/database.md)。
