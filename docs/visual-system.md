# Creeper Visual System

Creeper Visual System 是 CreeperNext 的视觉与交互契约。它独立于具体页面和第三方组件库，目标不是让所有页面长得一样，而是让 Landing、认证、产品端和未来 Admin 在同一套质量标准上形成各自的表达。

## 1. 分层模型

```text
Primitive Tokens
  ↓
Semantic Tokens + Themes
  ↓
Foundations（Reset / Document / Accessibility / Layout / Motion）
  ↓
UI Components（Button / Field / Card / Dialog…）
  ↓
Patterns（Auth Form / Hero / Empty State / App Shell…）
  ↓
Pages（Marketing / Product / Admin）
  ↓
Visual + Responsive + Accessibility QA
```

依赖只能从上向下。Token 不依赖组件；基础组件不依赖业务 Pattern；页面可以组合所有下层能力。

## 2. 文件职责

```text
styles/
├── index.css                    # 全局唯一入口和确定的导入顺序
├── tokens/
│   ├── primitives.css          # 原始色阶、间距、圆角、时长和缓动
│   ├── semantic.css            # 用途命名、Tailwind 映射和 shadcn 兼容变量
│   └── themes.css              # Light 之外的主题只覆盖语义 Token
└── foundations/
    ├── reset.css               # 浏览器基础归一
    ├── document.css            # html/body/链接等文档级规则
    ├── accessibility.css       # Focus、Skip Link、sr-only
    ├── layout.css              # Container、Stack、Inline、Grid 原语
    └── motion.css              # Productive / Expressive 动效节奏

app/globals.css                 # 只导入 styles/index.css
app/*.module.css                # 页面独有布局和艺术方向
components/**/*.module.css      # 组件结构、Variant 和交互状态
```

## 3. Token 规则

### Primitive Token

Primitive 表达“值是什么”，以 `--ref-*` 开头，例如：

```css
--ref-color-lime-300: #d7ff3f;
--ref-space-7: 1.5rem;
--ref-duration-fast: 140ms;
```

只有 `styles/tokens/primitives.css` 和主题实现可以直接声明原始色值。页面和组件不能直接消费原始颜色 Primitive，除非它是在实现插画、数据可视化或一次性品牌效果，并经过明确审查。间距、圆角和时长这类稳定 Scale 可以直接消费，但如果表达了页面层级、控件角色或状态，仍应先建立 Semantic Token。

### Semantic Token

Semantic 表达“值用来做什么”：

```css
--color-text-primary: var(--ref-color-stone-950);
--color-surface-raised: var(--ref-color-white);
--color-action-accent: var(--ref-color-lime-300);
--space-page-gutter: clamp(0.875rem, 3vw, 2.5rem);
```

组件和页面默认只使用 Semantic Token。命名按 `category-role-state` 组织，不按视觉近似选择变量。不要因为两个颜色当前相同，就把成功状态绑定到品牌色。

### Component Token

只有同一视觉决定被一个复杂组件的多个子元素或 Variant 反复消费时，才在组件的 `.module.css` 内建立 Component Token：

```css
.root {
  --button-bg-rest: var(--color-action-primary);
  --button-bg-hover: var(--color-action-primary-hover);
}
```

组件 Token 不进入全局空间，不被页面直接使用。

## 4. 两种视觉表面

### Marketing Surface

Landing、定价和活动页属于表达型表面，可以使用：

- Display Typography、宽松 Section Rhythm 和非对称 Grid；
- 品牌图像、插画、纹理和有限的装饰性效果；
- 只服务叙事的页面级 CSS Module；
- 在关键时刻使用 Expressive Motion。

Marketing 仍必须遵守对比度、触控目标、Reduced Motion、内容顺序和窄屏布局规范。

### Product Surface

账户、SaaS C 端和未来 Admin 属于生产力表面，应优先：

- 稳定的信息层级和可预测布局；
- 更高但可调节的信息密度；
- 完整的 Loading、Empty、Error、Success 和 Permission 状态；
- 快速、低干扰的 Productive Motion；
- 键盘操作、焦点管理和屏幕阅读顺序。

两种表面共享 Token、基础组件和无障碍底线，但不强迫使用同一种页面构图。

## 5. 布局与响应式

公开布局原语位于 `styles/foundations/layout.css`：

```tsx
<div className="l-container">
  <div className="l-stack" style={{ "--stack-gap": "var(--ref-space-8)" } as React.CSSProperties}>
    ...
  </div>
</div>
```

- `l-container`：统一最大宽度和 Safe Gutter；
- `l-stack`：垂直关系，由父级控制间距；
- `l-inline`：横向排列并允许换行；
- `l-grid`：通过 `auto-fit + minmax()` 按内容最小宽度自动换列；复杂页面使用局部 CSS Module。

响应式不是“没有断点”，也不是“为 iPhone、iPad、桌面各写一套”。本项目按以下优先级选择能力：

1. 先用百分比、`min()`、`max()`、`clamp()`、Flex 换行和 Intrinsic Grid 连续适配；
2. 组件根据自身容器使用 Container Query，不猜测整个浏览器有多宽；
3. 页面级 Viewport Query 只处理导航层级、全屏模式等真正与视口有关的变化；
4. Hover、Pointer、Reduced Motion 等能力使用对应的 Media Feature，不从屏幕宽度推断；
5. 320、390、768、1024、1440 等只是 QA 样本，不是必须写进 CSS 的设备断点。

固定组件最小触控目标为 `--size-target-min`（44px）。优先使用 `svh` / `dvh`，避免依赖移动浏览器不稳定的传统 `100vh`。完整的断点决策、H5 规则、图片策略和测试矩阵见 [`responsive-design.md`](responsive-design.md)。

## 6. 组件契约

业务代码只从 `components/ui` 使用基础 UI。shadcn、Base UI、Radix、React Aria 或其他组件先进入本地 UI 边界，再适配本项目的 Token、RSC 边界和状态规范。

每个交互组件至少覆盖：

| 维度 | 必须覆盖 |
| --- | --- |
| 状态 | Rest、Hover、Active、Focus-visible、Disabled |
| 异步 | Idle、Loading、Success、Error |
| 输入 | Empty、Filled、Invalid、Read-only |
| 环境 | Compact、Wide、键盘、触控、Reduced Motion |
| 主题 | Light；启用 Dark 后必须单独验收 Dark |

组件公开 Variant，不公开内部 DOM class。业务页面通过 Props 和 `className` 做有限组合，不能依赖组件内部选择器。

## 7. CSS 所有权

- `app/globals.css` 不写页面或组件样式；
- 真正全局的规则只能进入 `styles/foundations`；
- 页面艺术方向放在同目录 `page.module.css`；
- 可复用组件样式与组件共置为 `<name>.module.css`；
- 能用现有 Token 时不创建新值；新 Token 必须表达重复出现的设计决定；
- 不使用无作用域的 `.button`、`.card`、`.header` 等泛化全局类；
- 不为了复用两三行 CSS 提前建立抽象，先让重复模式真实出现。

## 8. 动效规范

- Productive Motion：Hover、Toggle、Dropdown、表单反馈，使用 `--motion-fast` / `--motion-base`；
- Expressive Motion：页面关键揭示或品牌时刻，使用 `--motion-slow` / `--motion-expressive`；
- Entrance、Exit 和 Standard 使用不同语义缓动；
- 动效必须帮助理解状态、层级或空间关系，不能只为“显得高级”；
- 所有动效必须在 `prefers-reduced-motion` 下保留等价的静态状态表达。

只有 CSS 无法正确表达退出、布局或手势动画时，才在局部 Client Island 引入 Motion。不要把根 Layout 变为 Client Component。

## 9. 视觉验收门禁

新页面交付前至少检查：

1. 320、390、768、1024、1440、1920 六个代表宽度，以及 568×320 横屏；
2. 无横向溢出、标题孤字、控件裁切和不可触达内容；
3. 键盘 Tab 顺序、Focus-visible、Skip Link；
4. 文本与控件对比度、错误信息不只依赖颜色；
5. Rest、Hover、Loading、Error、Empty 状态；
6. 200% 缩放、粗指针、Reduced Motion；
7. 生产构建中的 CSS 顺序和页面切换。

基础组件达到约 10–15 个或进入多人协作后，再加入 Storybook、浏览器级可访问性检查和视觉回归基线。单个 Landing 阶段不为了工具完整而提前增加整套依赖。

## 10. 多前端演进

当前先在 CreeperNext 内维护视觉系统。第二个真实前端开始复用并且发布节奏稳定后，再提取：

```text
packages/
├── design-tokens/      # 平台无关 Token 与主题
├── ui/                 # 稳定基础组件
└── visual-testing/     # Story、截图与可访问性配置
```

页面 Pattern、营销艺术方向和具体业务组件默认留在各应用中。不要因为“未来可能复用”过早把所有内容放进共享包。
