# Auth feature

认证页面通过 `features/auth/login`、`register`、`two-factor`、`setup`、`account` 各自引用所需组件，不再使用汇总所有表单的 `features/auth/index.ts`。

这些是带 `server-only` 的页面组合入口。域内组件保持原本的交互边界；`components/` 是私有实现。Better Auth 配置位于 `server/`，浏览器 SDK 适配器位于 `services/api/auth/client.ts`。生产构建测试验证每个路由不会引入其他场景的认证客户端入口。

`lib/use-submission.ts` 为认证操作提供同步防重入锁和 pending 状态。失败时释放锁并保留输入，导航成功时保持锁直到卸载。表单反馈复用 `components/ui/feedback`，提交按钮通过 pending/pendingLabel 表达状态，不再各自复制反馈 CSS。退出登录也处理返回错误和网络异常；规则见 [页面状态规范](../../docs/page-states.md)。

`lib/auth-failure.ts` 将认证错误映射为安全文案、明确字段和恢复动作；未知码不直接显示 message。`lib/focus-field.ts` 仅为本地校验在 DOM 更新后移动焦点。`components/auth-recovery-action.tsx` 显示用户主动触发的返回登录/刷新操作，returnTo 再次经过安全过滤。客户端恢复只改变操作体验，不改变服务端的 Session/MFA 策略。
