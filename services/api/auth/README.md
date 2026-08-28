# Auth API service

认证 API 的请求边界说明。实际 HTTP 入口是 `app/api/auth/[...all]`，业务组件不得直接拼接 `/api/auth/*`；需要新增调用时在这里集中封装。
