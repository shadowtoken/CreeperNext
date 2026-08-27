# Creeper Responsive Standard

这份规范定义 CreeperNext 如何让同一套 Web 在桌面、平板、H5、横屏、分屏和未来未知尺寸中保持可用。核心判断只有一句：**断点可以是固定值，但不能代表固定设备；布局变化应由内容和可用空间触发。**

GitHub Primer 和 Atlassian 都公开使用统一的宽度阈值。成熟系统避免的不是所有断点，而是按品牌、机型或 User-Agent 维护多套页面。

## 1. 五层响应模型

按顺序使用，只有上一层无法表达需求时才进入下一层。

### 1.1 Fluid Baseline

默认布局应在两个阈值之间连续变化：

```css
.section {
  width: min(73.75rem, calc(100% - 2 * var(--space-page-gutter)));
  padding-block: clamp(4rem, 9vw, 9rem);
}

.title {
  font-size: clamp(2.25rem, 5vw, 4.75rem);
}
```

- 宽度使用 `%`、`min()`、`max()`；
- 字号、留白和间距使用 `clamp()`；
- 长度优先使用 `rem`，让浏览器缩放和用户字号设置生效；
- Full-height 场景优先 `svh` / `dvh`，不把传统 `100vh` 当移动端可靠高度；
- 内容容器设置合理 `max-width`，宽屏不是把行长无限拉长。

### 1.2 Intrinsic Layout

如果布局只需要“装得下就并排，装不下就换行”，不要写 Media Query：

```css
.grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, 18rem), 1fr)
  );
}

.actions {
  display: flex;
  flex-wrap: wrap;
}
```

卡片数量改变、侧栏被嵌入较窄区域、浏览器分屏时，这种布局都能自然工作。

### 1.3 Component Container Query

可复用组件只知道自己有多少空间，不应根据整个视口猜测：

```css
.form {
  container-type: inline-size;
}

.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

@container (inline-size < 28rem) {
  .fields {
    grid-template-columns: 1fr;
  }
}
```

阈值来自组件内容开始拥挤的位置。不要把全局 `768px` 机械复制到每个组件。

### 1.4 Page Viewport Range

只有变化真正依赖浏览器窗口时，才使用 Viewport Query，例如：

- 全局导航从完整信息架构切换到精简入口；
- 横屏且高度不足时移除非必要的首屏最小高度；
- 页面级左右栏切换会改变阅读或焦点顺序；
- Print 等文档输出环境。

Viewport Range 使用 Mobile-first 的 Range Syntax，阈值用 `rem` 表达：

```css
@media (width >= 48rem) { /* 页面获得足够空间后增强 */ }
@media (height < 30rem) and (orientation: landscape) { /* 低矮横屏 */ }
```

`compact`、`regular`、`wide` 可以作为讨论与 QA 词汇，但不能让组件依赖一个虚构的设备类别。

### 1.5 Capability and Preference

屏幕宽不代表有鼠标，屏幕窄也不代表没有鼠标。交互应查询真实能力：

```css
@media (hover: hover) and (pointer: fine) {
  .button:hover { transform: translateY(-0.125rem); }
}

@media (prefers-reduced-motion: reduce) {
  /* 保留状态变化，移除非必要运动 */
}
```

根据功能使用 `hover`、`pointer`、`prefers-reduced-motion`、`prefers-contrast`、`forced-colors` 和 `orientation`。关键操作不能只在 Hover 中出现。

## 2. 决策表

| 问题 | 首选机制 | 例子 |
| --- | --- | --- |
| 尺寸应连续变化吗 | Fluid CSS | 页面 Gutter、标题字号、Section 间距 |
| 装不下时自然换行即可吗 | Intrinsic Grid / Flex | 卡片列表、按钮组、Footer |
| 同一组件会被放进不同宽度容器吗 | Container Query | 表单、卡片、局部导航、数据组件 |
| 变化与整个窗口或页面信息架构有关吗 | Viewport Query | 全站导航、全屏 Shell、低矮横屏 |
| 变化来自输入方式或用户偏好吗 | Capability Query | Hover、粗指针、Reduced Motion |
| 只是某款手机看起来不对吗 | 先修内容约束 | 长文本、固定宽度、图片、最小尺寸 |

禁止通过 User-Agent 或设备品牌选择布局。JavaScript 不负责基础响应式；只有布局结果会改变数据量、虚拟化或昂贵渲染时，才考虑在 JS 中订阅容器尺寸。

## 3. 如何确定阈值

1. 从最窄支持宽度 320 CSS px 开始；
2. 逐步放大容器，不参考设备列表；
3. 在内容出现拥挤、过长行宽、错误阅读顺序或无效留白的临界点记录阈值；
4. 判断它属于组件容器还是整个视口；
5. 转为 `rem`，并只保留实现真实布局变化所需的最少阈值；
6. 在阈值上下各测试 1px，避免恰好边界时发生溢出或抖动。

固定值是布局约束，不是坏实践。把 `768px` 理解成“iPad”，然后在全站复制它，才是坏实践。

## 4. H5 与移动 Web 底线

- 最小支持宽度为 320 CSS px，不允许页面横向滚动；数据表等明确横向内容必须提供局部滚动容器和可见提示；
- 关键触控目标至少 44×44 CSS px，并保留足够间距；
- 页面 Gutter 使用 Fluid Token，并按需包含 `env(safe-area-inset-*)`；
- 表单提供真实 `label`、正确 `autocomplete`、`inputmode` 和错误关联；页面缩放不能被禁用；
- 输入法弹出后，提交按钮和错误信息仍可滚动到达；
- 不依赖 Hover 暴露操作；触屏 Active 状态和键盘 Focus-visible 都必须存在；
- 中文标题使用语义分行、`text-wrap: balance` 或容器字号，不通过任意断字凑版；
- 低矮横屏不强制维持大 Hero 的 `100vh`；
- 固定底栏若存在，必须考虑 Safe Area、键盘和遮挡。

## 5. 响应式图片与媒体

- 内容图片使用 `next/image`，提供准确的 `width` / `height` 或稳定 `aspect-ratio`，防止布局跳动；
- `fill` 图片必须有受约束的定位父级，并设置与真实布局一致的 `sizes`；
- 使用 `srcset` / `sizes` 让浏览器按渲染宽度选择资源，不给手机下载桌面大图；
- Art Direction 确实改变构图时才使用 `<picture>`，不能只为缩放创建两套内容；
- 装饰媒体不能破坏 Reduced Motion、对比度和文本可读性。

## 6. 本项目代码约定

- 全局 Fluid 值位于 `styles/tokens/semantic.css`；
- `styles/foundations/layout.css` 提供 `l-container`、`l-stack`、`l-inline` 和 Intrinsic `l-grid`；
- 页面特有艺术方向位于 `app/*.module.css`；
- 可复用组件在自己的 `*.module.css` 声明 `container-type` 和 `@container`；
- Viewport Query 必须附带能解释“为什么它属于页面而不是组件”的上下文；
- 不创建 `mobile.css`、`tablet.css`、`desktop.css` 三套样式；
- QA 宽度不转换为全局 Breakpoint Token，除非多个页面出现同一种真实布局语义。

## 7. 验收矩阵

每个关键页面至少验证：

| 场景 | 目的 |
| --- | --- |
| 320×568 | 最窄 H5、长文本、触控目标、无横向溢出 |
| 390×844 | 主流手机内容密度和软键盘场景 |
| 568×320 横屏 | 低高度、导航和表单可达性 |
| 768×1024 | 中间宽度，不假设它一定是平板 |
| 1024×768 | 两列临界点和页面密度 |
| 1440×900 | 桌面最大行宽、留白和视觉层级 |
| 1920×1080 | 超宽屏内容上限，不盲目拉伸 |
| 200% Zoom | Reflow、文字裁切、键盘顺序 |
| Coarse Pointer | 无 Hover 依赖、触控目标 |
| Reduced Motion | 状态仍清楚，非必要动画消失 |

还要测试内容变量：最长中文标题、长邮箱、英文长词、错误文案、空状态、Loading、多一张和少一张卡片。响应式是“尺寸 × 内容 × 输入能力 × 用户偏好”的组合，不是截图五个宽度就结束。

## 8. 依据

- [web.dev：Responsive web design basics](https://web.dev/articles/responsive-web-design-basics?hl=en) — 从小屏开始，内容需要时再建立断点，不按设备品牌选择断点。
- [GitHub Primer：Layout](https://primer.style/product/getting-started/foundations/layout/) 与 [Size primitives](https://primer.style/product/primitives/size/) — 公开的宽度 Token、Viewport Range 与内容布局原则。
- [GitHub Primer：Responsive interfaces](https://primer.style/product/getting-started/foundations/responsive/) — 同时考虑 Viewport、输入能力和用户偏好。
- [Atlassian Design：Grid](https://atlassian.design/foundations/grid-beta/applying-grid/) — 固定、窄版与 Fluid Grid 的使用边界。
- [Material 3：Canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview) — 根据可用空间、惯例和人体工学切换布局模式。
- [MDN：CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) — 组件根据容器而非 Viewport 响应。
- [MDN：Using media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using) — Viewport、Hover、Pointer 与 Preference Media Feature。
