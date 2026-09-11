# UI primitives

只负责通用视觉与交互语义，不请求接口、不依赖 Feature 或服务端模块。

- `Button`：默认 type=button；提交时显式 type=submit。pending 自动禁用并播报 pendingLabel，普通 disabled 不表示正在加载。
- `ButtonLink`：导航操作使用链接语义，不用 button 模拟链接。
- `Feedback`：持久挂载的错误/成功 live region，调用者提供安全文案与输入关联 ID；不传后端原始报错。
- `Kicker`：辅助视觉标签，不代替语义标题。

复合页面区域状态放在 `components/shared/content-state`。布局与状态规范见 [页面状态规范](../../docs/page-states.md) 和 [视觉系统](../../docs/visual-system.md)。
