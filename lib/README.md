# Shared utilities

只放无业务语义、无 React/Next 依赖的纯工具，目前是合并 className 的 `cn`。业务规则放 `core` 或对应 Feature；客户端 Hook 放 `hooks` 或域内 lib；数据库和服务端环境读取不进入此目录。工具被 Client Component 引用后，其运行时依赖也会进入客户端检查范围。
