# Creeper Responsive Standard

这份规范定义 CreeperNext 如何用同一套 Web 覆盖桌面、分屏、平板、H5、横屏和未来未知尺寸。核心判断是：**断点可以有固定值，但它表达的是内容需要多少空间，不是某一款设备。**

GitHub Primer、Tailwind CSS、Vercel Commerce 与 Dub 的实现都说明，成熟响应式并不是消灭 Breakpoint，而是把 Viewport、组件容器、流体尺寸、输入能力和用户偏好放在正确层级。

## 1. 响应式所有权

| 问题 | 唯一主要负责人 | 本项目示例 |
| --- | --- | --- |
| 页面 Gutter、字号、Section 密度连续变化 | CSS `clamp()` / `min()` / `max()` | Hero、Account、Auth 垂直密度 |
| 常规布局、间距、状态、Viewport Variant | Tailwind Utility | Header、Button、Form Grid |
| 可复用组件根据自身空间变化 | Tailwind Named Container Query | `header`、`form`、`preview` |
| 叙事阅读顺序或全屏 Shell 变化 | 页面级 Viewport Query | Landing 双栏、Auth 双栏 |
| 渐变、伪元素、插画和复杂构图 | CSS Modules | Landing、Auth Shell、Foundation Preview |
| Hover、触控、动效偏好 | Capability / Preference Query | `hover`、`pointer`、Reduced Motion |

同一个元素的同一个 CSS concern 只能有一个负责人。例如 Header 链接的 `display` 由 Tailwind 的 `hidden @min-*` 控制，CSS Module 就不能再设置 `display`。`twMerge()` 只能合并 Tailwind 类，不能解决 CSS Module 与 Tailwind 的 Cascade 冲突。

## 2. 五层响应模型

按顺序选择能力，上一层可以解决时，不进入下一层。

### 2.1 Fluid Baseline

宽度、高度和内容密度应先连续变化：

```css
.section {
  width: min(
    var(--size-content-max),
    calc(100% - 2 * var(--space-page-gutter-inline-safe))
  );
  padding-block: clamp(5rem, min(11vw, 16svh), 10rem);
}

.title {
  font-size: clamp(2.25rem, min(7vw, 9svh), 5.75rem);
}
```

- 宽度使用 `%`、`min()` 和 `max()`；
- 字号与留白使用 `clamp()`；
- 长度优先用 `rem`，保留浏览器缩放与用户字号设置；
- Full-height 场景使用 `svh` / `dvh`，不用传统 `100vh` 猜测移动浏览器工具栏；
- 低矮桌面同时参考 `svh`，不在 800px 高度附近突然切一套“Mac 模式”。

### 2.2 Intrinsic Layout

如果只需要“装得下就并排，装不下就换行”，使用 Intrinsic Grid / Flex：

```css
.cardGrid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, 18rem), 1fr)
  );
}
```

卡片集合与 Footer 适合这种方式。Hero、Auth 等有明确阅读顺序的 Canonical Layout 不交给 `auto-fit` 随机决定，而是默认单列，在内容真正有空间后显式增强为双栏。

### 2.3 Named Container Query

可复用组件应根据自己获得的空间响应，不根据整个浏览器猜测：

```tsx
<form className="@container/form">
  <div className="grid grid-cols-1 @min-[24rem]/form:grid-cols-2">
    {/* fields */}
  </div>
</form>
```

必须使用命名容器。匿名容器在嵌套后可能静默绑定到错误祖先。阈值来自组件内容开始拥挤的位置，不把全局 `768px` 机械复制进每个组件。

### 2.4 Page Viewport Range

只有变化真正依赖页面或窗口时才使用 Viewport Query：

```css
/* 阅读构图从上到下变为左右，不是“检测桌面设备”。 */
@media (width >= 64rem) {
  .authLayout {
    grid-template-columns: minmax(0, 1fr) minmax(26rem, 0.9fr);
  }
}
```

Tailwind 默认 `sm/md/lg/xl/2xl` 是统一 Page Range。它们是布局刻度，不是 Phone / Tablet / Desktop 类型。可复用组件不得用页面 `md:` 推断自身空间。

### 2.5 Capability and Preference

宽屏不等于鼠标，窄屏也不等于只能触摸：

```css
@media (hover: hover) and (pointer: fine) {
  .control:hover { transform: translateY(-0.125rem); }
}

@media (prefers-reduced-motion: reduce) {
  /* 保留状态变化，移除非必要运动。 */
}
```

根据功能使用 `hover`、`pointer`、`prefers-reduced-motion`、`prefers-contrast`、`forced-colors`、`orientation` 和 Print Query。关键操作不能只在 Hover 中出现。

## 3. 如何确定阈值

1. 从最窄支持宽度 320 CSS px 开始；
2. 缓慢放大内容或组件容器，不参考设备列表；
3. 在内容拥挤、行宽失效、阅读顺序错误或留白失衡处记录阈值；
4. 判断它属于组件容器还是页面 Viewport；
5. 转成 `rem`，只保留实现真实布局变化所需的最少阈值；
6. 在阈值上下各测 1px，防止边界抖动与溢出。

固定值不是坏实践。把 `768px` 解释成某款 iPad，并在所有组件复制它，才是坏实践。

## 4. Safe Area 与移动 Web

根布局设置 `viewportFit: "cover"`。Safe Area 按轴拆分：

- `--space-page-gutter-inline-safe`：页面左右 Gutter 与刘海左右 Inset 的最大值；
- `--space-page-gutter-block-end-safe`：页面底部 Gutter 与 Home Indicator Inset 的最大值；
- 顶部 Inset 由拥有 Header 的 Page Shell 处理；Footer 处理自己的底部 Inset。

禁止同时由 `body` 和 Page Shell 重复添加 Safe Area，也禁止把左右 Inset 当作 Bottom Padding。

H5 底线：

- 320 CSS px 无整页横向滚动；数据表等例外必须是显式、可聚焦、有名称的局部滚动容器；
- 项目交互目标标准为 44×44 CSS px；这是高于 WCAG 2.2 24px 最低规则的产品约定；
- 表单提供真实 `label`、正确 `autocomplete`、`inputmode` 与错误关联；不禁用页面缩放；
- 输入法出现后，主操作和错误仍可滚动到达；
- 中文 Display Heading 使用语义分行、`text-wrap: balance`、严格 CJK 换行和长词兜底；
- `html`、`body`、`main` 不得用 `overflow-x: hidden/clip` 掩盖布局错误；
- Fixed Bottom Bar 若存在，必须同时处理 Safe Area、软键盘和内容遮挡。

## 5. 响应式图片与媒体

- 内容图片使用 `next/image`，提供真实 `width` / `height` 或稳定 `aspect-ratio`；
- `fill` 图片必须有受约束的定位父级，并设置与真实布局一致的 `sizes`；
- 使用 `srcset` / `sizes`，不给手机下载桌面大图；
- 只有构图真的改变时才用 `<picture>` 做 Art Direction；
- 装饰媒体不得破坏 Reduced Motion、对比度和文字可读性。

Vercel Commerce 的 Navbar、Grid、Gallery 和 Footer 是很好的实战参考：页面 Range 用 Tailwind Mobile-first Variant，图片按真实布局声明 `sizes`，局部内容再使用精确阈值。

## 6. 本项目实现契约

- Tailwind Utility：常规布局、间距、显示状态、基础 Variant 和 Named Container Query；
- CSS Modules：页面艺术方向、复杂选择器、伪元素、渐变和特殊构图；
- CSS Variables：主题、密度、Safe Area、动效与跨技术栈 Token；
- 新代码默认窄版，空间增加时再增强；
- 页面级低高度优先使用带 `svh` 的 Fluid 值，不创建突变的设备模式；
- Page Query 必须用注释说明为什么它属于页面而不是组件；
- 不创建 `mobile.css`、`tablet.css`、`desktop.css`；
- 不使用 User-Agent 或设备品牌选择布局；
- 不用 JavaScript 负责基础响应式。只有布局结果会改变数据量、虚拟化或昂贵渲染时，才订阅尺寸。

## 7. 自动化矩阵

`pnpm test:responsive` 在生产构建上运行 Chromium：

| 场景 | 目的 |
| --- | --- |
| 320×568 | 最窄 H5、长文本、触控目标、无横向溢出 |
| 390×844 | 主触控场景、错误态与 Reduced Motion |
| 568×320 | 低矮横屏、表单和导航可达性 |
| 768×1024 | 中间宽度，不假设它是平板 |
| 1024×768 | Canonical 双栏临界点 |
| 1280×800 | MacBook Air / 紧凑桌面密度 |
| 1280×832 | 高度连续性与历史阈值回归 |
| 1440×900 | 常规桌面最大行宽与层级 |
| 1920×1080 | 超宽屏内容上限 |

边界门禁额外验证 559/560/561、1023/1024/1025 与 831/832/833。每个关键路由检查：

- Root `scrollWidth` 和所有可见元素几何；
- `html/body/main` 没有横向掩盖或纵向锁死，页面末端可达；
- 固定控件也在视口内，交互目标不互相覆盖；
- 可见文本及其裁切祖先没有被非预期 `overflow` 截断；
- 所有交互目标达到项目 44×44 标准；
- 登录态 Account 使用一次性 Setup 建立的真实 Cookie/Session，生产限流保持开启；
- 强制 MFA Setup 在 390×844 与 1280×800 完整走过确认密码、QR、恢复码三态，并检查几何、44px 目标与 Axe；
- 所有核心页面的 200% 文本放大、全页 Reduced Motion、错误态与 Light/Dark Axe WCAG A/AA 扫描。

320 CSS px 是 Reflow 自动门禁；`deviceScaleFactor: 2` 只改变 DPR，不等于浏览器 Zoom。Chrome/Safari 的真实 200%/400% Zoom 仍属于发布前人工检查。自动 Axe 也不能替代键盘、屏幕阅读器和真实设备验收。

## 8. 禁止的反模式

- 用 `overflow-x: clip` 掩盖整页溢出；
- 用 `auto-fit` 决定 Hero / Auth 的阅读顺序；
- 在组件里使用页面 `md/lg` 猜自身空间；
- 匿名 Container Query；
- `white-space: nowrap` 没有长文本和本地化兜底；
- 同一元素由 CSS Module 和 Tailwind 同时控制 `display`、`padding`、圆角或列数；
- 动态拼接 `bg-${color}` 等无法静态扫描的 Tailwind 类；
- 用 DPR 或 CSS `zoom` 冒充浏览器缩放测试；
- 把每页 × 每视口都做像素快照，造成无法维护的基线爆炸。

## 9. 依据与参考实现

- [Tailwind CSS：Responsive design](https://tailwindcss.com/docs/responsive-design) — Mobile-first Page Range 与内建 Named Container Query。
- [Next.js：CSS](https://nextjs.org/docs/app/getting-started/css) — 全局 CSS、Tailwind 与 CSS Modules 的使用边界及导入顺序。
- [GitHub Primer：Layout](https://primer.style/product/getting-started/foundations/layout/) — Narrow / Regular / Wide Page Range 与内容布局原则。
- [Vercel Commerce：Navbar](https://github.com/vercel/commerce/blob/main/components/layout/navbar/index.tsx)、[Grid](https://github.com/vercel/commerce/blob/main/components/grid/three-items.tsx)、[Gallery](https://github.com/vercel/commerce/blob/main/components/product/gallery.tsx) — 生产项目中的 Tailwind Mobile-first 与响应式图片。
- [Dub：Tailwind config](https://github.com/dubinc/dub/blob/main/packages/tailwind-config/tailwind.config.ts) 与 [Themes](https://github.com/dubinc/dub/blob/main/packages/tailwind-config/themes.css) — 共享配置、语义 Token 与组件容器实践。
- [Cal.com：Button](https://github.com/calcom/cal.com/blob/main/packages/ui/components/button/Button.tsx) — Typed Variant 与 Tailwind 组件边界。
- [MDN：Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) 与 [Media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using) — Container、Viewport、Capability 和 Preference Query。
- [Playwright：Web server](https://playwright.dev/docs/test-webserver) 与 [Accessibility testing](https://playwright.dev/docs/accessibility-testing) — 生产式 E2E 与 Axe 集成。
- [W3C：Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)、[Resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)、[Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) — 缩放、文字放大与触控目标标准。
