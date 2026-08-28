# Auth API service

认证 API 的请求边界。`client.ts` 封装浏览器端 Better Auth SDK；实际 HTTP 入口是 `app/api/auth/[...all]`。业务组件不得直接拼接 `/api/auth/*`，也不维护一份与 SDK 重复的 DTO。
