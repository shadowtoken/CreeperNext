# Features

按业务域组织能力。域根的 `.ts` / `.tsx` 文件是公开入口；交互场景使用 `login.ts` 这样的窄入口，纯能力可保留 `index.ts`。`components/`、`lib/` 是内部实现，外部调用者不能直接引用；域内可以使用相对路径。全部入口使用显式命名导出。

使用 Next 全栈时，私有查询/操作放 `lib/server/`，带 `server-only` 标记，通过域根 `server.ts` 公开必要查询。客户端表单通过域根的模块级 `use server` 文件 `actions.ts` 调用写操作。页面组合入口可以导出 Client Component，但不应给整个入口加 `use client`。参见 [工程边界规范](../docs/architecture.md) 与 [数据库规范](../docs/database.md)。
