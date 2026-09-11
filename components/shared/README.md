# Shared components

只放真正跨多个 Feature 的复合组件。当前 Brand 同时服务 Marketing、Auth、Account 和错误页；Landing 专用 Header/Footer 留在 `features/marketing`。

ContentState 统一区域加载、空内容和错误展示，已用于账户加载和路由兜底；它不请求数据、不鉴权，也不创建 main 地标。Feedback、Button 等更基础的语义与控件放在 `components/ui`。用法见 [页面状态规范](../../docs/page-states.md)。
