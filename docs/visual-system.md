# Creeper Visual System

Creeper Visual System 是 CreeperNext 的视觉与交互契约。它不要求 Landing、C 端和未来 Admin 长得一样，而是要求它们共享同一套 Token、组件边界、响应模型与质量门禁。

## 当前视觉方向：CR 原标与中性配色

使用用户在 DeerFlow 项目中提供的黑白 CR 原图，保存于 `public/brand/cr-solid.png`。源文件与引用项目中的资源保持字节一致，不重绘、不修改轮廓。Logo 仅用于导航、页脚和浏览器图标，不放大成首页展示区或认证侧栏。导航和页脚统一消费 `components/shared/brand.tsx`。原图白底在浅色表面使用 multiply，深底使用反色与 screen；Forced Colors 保留原图，不依赖滤镜表达功能。

- 配色：黑白灰为主体，铜色仅用于链接、焦点与少量强调。明暗主题必须成对检查前景与背景，不能只替换主色。
- 文案：用名称和用途描述内容，删除重复口号、全大写英文眉题、假窗口、无来源的状态与进度。不为填满区域增加一段说明。
- 符号：只用于真实操作或状态。不在每个按钮后加箭头，不以斜杠、圆点和勾号装饰普通文字。
- 首页：产品名称、简短介绍、账户入口、基础能力与真实目录说明。介绍区保持单栏，不用 Logo 占位填充第二栏。
- 认证：表单最多 27.5rem，所有尺寸保持单栏居中，不添加装饰侧栏。表单标题与必要的安全提示始终保留。
- 图片：使用 Next Image 明确宽高与响应式 sizes；展示区不直接向手机发送原尺寸图片。Logo 属于品牌资产，不用 CSS 几何重新拼造。
- 正文使用至少 1rem，常用标签至少 0.875rem，次要元信息至少 0.75rem。任务标题为 2–2.5rem，不能使用英文展示字体的紧行距排中文。
- 动效：保留必要的悬停与焦点反馈，不给 Logo、表单或正文添加循环和延迟入场。

几何检查不代表视觉验收：需检查 390px 手机与 1280×800/832 桌面截图，并验证 320px、横屏、200% 文本放大、明暗主题和资源加载。原有社交分享图本轮未重新生成。

### 简洁页面的执行约定

- 账户表单输入框与提交按钮共享 `--size-control-comfortable`（3.25rem 最小高度），按钮用 `min-h-control-comfortable` 消费；圆角共享 `--ds-radius-control`，不在每个表单重复写尺寸。
- 高度只是下限：输入框保留纵向内边距，字号放大后允许自然增高。密码显隐按钮保持独立的最小触控尺寸，在输入框内居中，不跟随整个字段拉伸。
- 密码规则是完成任务所需的信息，至少 0.875rem；标签与规则允许换行，不靠缩小字体塞进一行。表单底部的账户切换提示按正常文字换行。
- 官网和认证页头共享页面边距尺度；认证页在窄屏至少保留 1.25rem 与安全区域。窄屏或文本放大时，页头允许换行，不隐藏返回入口。
- 目录说明使用按内容最小宽度自适应的网格：空间够时名称、说明两列对齐，不够时转为上下排列。不能以裁切或省略号掩盖内容溢出。

## 1. 分层与依赖方向

```text
Primitive Tokens
  ↓
Semantic Tokens + Runtime Themes
  ↓
Adapters（Tailwind / shadcn）
  ↓
Foundations（Document / Accessibility / Motion）
  ↓
UI Components（Button / Field / Dialog…）
  ↓
Patterns（Auth Form / Hero / App Shell…）
  ↓
Pages（Marketing / Product / Admin）
  ↓
Responsive + Accessibility + Visual QA
```

依赖只能向下消费：Token 不知道组件；Adapter 只翻译 Token；基础 UI 不依赖业务 Pattern；页面可以组合所有下层能力。

## 2. 文件职责

```text
styles/
├── index.css                    # 唯一视觉入口与确定的导入顺序
├── tokens/
│   ├── primitives.css          # 原始色阶、间距、圆角、时长、缓动
│   ├── semantic.css            # 运行时用途、密度、尺寸、Safe Area
│   └── themes.css              # Dark / High Contrast 只覆盖语义角色
├── adapters/
│   ├── tailwind.css            # @theme 映射与共享 Utility
│   └── shadcn.css              # 第三方 Registry 兼容变量
└── foundations/
    ├── reset.css               # 对 Tailwind Preflight 的项目增量
    ├── document.css            # html/body/链接等文档级规则
    ├── accessibility.css       # Focus、Skip Link、sr-only
    └── motion.css              # Productive / Expressive 与 Reduced Motion

app/globals.css                 # 只导入 styles/index.css
app/*.module.css                # 页面独有布局与艺术方向
components/**/*.module.css      # 复杂局部视觉；常规 UI 优先 Tailwind
```

`components.json` 指向 `styles/adapters/shadcn.css`。第三方 CLI 可以修改兼容边界，但不会把 Registry 变量、Import 或 Base Rule 写进核心 Semantic Token。

## 3. Token 规则

### Primitive

Primitive 表达“值是什么”，以 `--ref-*` 开头：

```css
--ref-color-copper-700: #914a2e;
--ref-space-6: 1.5rem;
--ref-duration-fast: 140ms;
```

间距数字与 Tailwind 的 quarter-rem Scale 对齐：`2 = 0.5rem`、`4 = 1rem`、`6 = 1.5rem`。相同数字不能在两套系统里表达不同距离。

页面和组件不能直接消费原始颜色 Primitive，除非实现插画、数据可视化或一次性品牌效果，并经过审查。间距和时长可以消费稳定 Scale；一旦它表达页面层级、控件角色或状态，就建立 Semantic Token。

### Semantic

Semantic 表达“值用来做什么”：

```css
--color-text-primary: var(--ref-color-ink-950);
--color-action-primary: var(--ref-color-ink-950);
--space-page-gutter-inline-safe: max(...);
--ds-radius-control: var(--ref-radius-sm);
```

语义 Token 是运行时主题 API。命名按 `category-role-state` 组织，不按当前视觉近似绑定。裸 `--radius-sm`、`--shadow` 等 Tailwind Theme Namespace 不在 Semantic 文件重定义，避免隐式半覆盖。

### Adapter

Tailwind 是 Token Consumer，不是 Token Source：

```css
@theme inline {
  --color-primary: var(--color-action-primary);
  --spacing-page-safe: var(--space-page-gutter-inline-safe);
  --radius-control: var(--ds-radius-control);
  --shadow-raised: var(--ds-shadow-raised);
}
```

因此 JSX 可以使用 `bg-primary`、`min-h-target`、`rounded-control`、`shadow-raised`，Dark / High Contrast 仍只需覆盖 Semantic Token。

### Component Token

只有一个复杂组件的多个子元素或 Variant 重复消费同一决定时，才在组件作用域建立 Token：

```css
.root {
  --button-icon-size: 1rem;
}
```

Component Token 不进入全局空间，也不被页面直接使用。

## 4. Tailwind-first 混合架构

“混合”不是同一套样式写两遍，而是明确分工：

| 能力 | 负责人 |
| --- | --- |
| 常规 Flex/Grid、Spacing、Size、State、Viewport Variant | Tailwind Utility |
| 基础组件 Variant / Compound State | Typed Class Map；复杂后再用 CVA |
| 可复用组件响应式 | Tailwind Named Container Query |
| 渐变、伪元素、复杂选择器、插画、页面艺术构图 | CSS Modules |
| 主题、密度、品牌值、Safe Area | CSS Variables |
| 文档行为、Focus、Reduced Motion、Forced Colors | Foundations CSS |

Header 与 Button 是参考实现：

- Header 用 `@container/header` 和 `@min-*/header` 控制自身导航，不猜 Viewport；
- Button 用 Typed Class Map 暴露 `variant` / `size`，`cn()` 让调用方 Tailwind class 可靠覆盖；
- Foundation Preview 是真实目录的说明列表，保留 CSS Module 管理局部排版，不模拟编辑器窗口或完成进度。

不为了“看起来都用了 Tailwind”把长串渐变塞进 JSX，也不把普通 `display/grid/gap` 全藏进 CSS Module。

## 5. Cascade 与 CSS 所有权

Next.js 生产构建会合并和切分 CSS，导入顺序必须可预测。项目遵守：

1. 全局与 Tailwind 只从根 `app/globals.css` 进入；
2. `styles/index.css` 固定 Token → Adapter → Foundation 顺序；
3. 可复用 CSS Module 若允许调用方 `className` 覆盖，规则放在 `@layer components`，让 Tailwind `utilities` 层获胜；
4. Page CSS Module 是艺术方向的权威层；同一元素不再用 Tailwind 改相同属性；
5. 不依赖组件导入顺序争夺同一属性；共享决定提取为 UI Component 或 Token。

`twMerge()` 只合并 Tailwind 类，无法处理 unlayered CSS Module。以下写法禁止：

```tsx
// Module 和 Utility 同时拥有 display，生产 CSS 顺序可能改变结果。
<a className={cn(styles.inlineFlexLink, "hidden md:inline-flex")} />
```

正确做法是让 Module 只拥有颜色/装饰，或让 Tailwind 独占 `display`。

## 6. Marketing 与 Product Surface

### Marketing

Landing、定价和活动页可以使用 Display Typography、宽松 Section Rhythm、非对称 Grid、品牌图像与有限 Expressive Motion。页面级 CSS Module 可以更大胆，但仍遵守对比度、触控、Reduced Motion、内容顺序和 320px Reflow。

### Product

Account、C 端和未来 Admin 优先稳定的信息层级、可预测布局、可调密度、完整 Loading / Empty / Error / Permission 状态、键盘操作与低干扰 Productive Motion。

两者共享 Token 与基础 UI，不强迫使用同一种页面构图。

### Auth 与安全设置 Pattern

认证页是任务界面，不是第二个 Landing。登录与注册使用窄的单任务表单；需要 QR 或多步状态的安全引导使用独立宽版 Surface。不得通过大 Logo、装饰侧栏、第二个 CTA 或宣传卡列表填充空白。

强制 MFA 的参考 Pattern 是：

```text
Credential Form
  → Enrollment Flow（确认身份 / 绑定验证器 / 动态码验证）
  → Product Settings（状态行 / 修改密码）
```

- 页面标题使用 Product Typography，不使用 Landing 的超大 Display Heading；
- 密码复验表单只在用户发起敏感操作后展开，不常驻占满页面；
- Pill 只表达状态，产品按钮使用 10–12px 控件圆角；
- OTP 保留一个真实 Input，用等宽数字和字距表达六位代码，避免六个输入框带来的粘贴与读屏问题；
- QR 与说明在容器足够宽时并排，窄容器自然堆叠；
- 不提供恢复码时，服务端相关生成和验证端点也必须同步禁用；
- 错误必须靠近当前步骤，不允许同时出现互相矛盾的成功与失败反馈；
- Account 使用 Settings 信息架构，不显示 `PROTECTED ROUTE`、`NEXT LAYER` 等脚手架自述。

## 7. 组件契约

业务代码只从 `components/ui` 使用基础 UI。shadcn、Base UI、Radix、React Aria 或其他组件先进入本地边界，再适配 Token、RSC 和状态规范。

每个交互组件至少覆盖：

| 维度 | 必须覆盖 |
| --- | --- |
| 状态 | Rest、Hover、Active、Focus-visible、Disabled |
| 异步 | Idle、Loading、Success、Error |
| 输入 | Empty、Filled、Invalid、Read-only |
| 环境 | Narrow、Compact、Wide、键盘、触控、Reduced Motion |
| 主题 | Light；启用 Dark 后单独验收 Dark |

组件公开 Props 和 `className`，不公开内部 DOM class。Variant 只有两三个轴时使用 Typed Class Map；出现 Compound Variant 后再引入 CVA，基础模板不为未来可能性增加依赖。

## 8. 第三方 UI 接入

```bash
pnpm dlx shadcn@latest info
pnpm dlx shadcn@latest add dialog --dry-run
pnpm dlx shadcn@latest add dialog
```

安装前检查源码、依赖、全局样式、Client Boundary、键盘行为和许可证。完整 Block 先进入隔离目录人工合并，不用 `--overwrite` 覆盖现有路由。

引入后的收口步骤：

1. 业务只引用本地 `components/ui`；
2. Raw Palette 替换为 Semantic Utility；
3. Viewport Variant 判断是否应改成 Named Container；
4. 检查 RSC / `use client` 是否保持最小叶子；
5. 跑 Lint、TypeScript、生产构建和浏览器矩阵。

## 9. 动效规范

- Productive Motion：Hover、Toggle、Dropdown、表单反馈，使用 `duration-fast/base`；
- Expressive Motion：页面关键揭示或品牌时刻，使用 `duration-slow/expressive`；
- Entrance、Exit 与 Standard 使用不同语义缓动；
- 动效必须解释状态、层级或空间关系；
- `prefers-reduced-motion` 下保留静态状态表达并把时长降到近零。

只有 CSS 无法正确表达退出、布局或手势动画时，才在局部 Client Island 引入 Motion。不要把根 Layout 变为 Client Component。

## 10. 视觉质量门禁

自动门禁：

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:responsive
```

浏览器矩阵检查 9 个视口、边界上下 1px、横向几何、裁切、44×44 目标、200% 文本放大、Reduced Motion、真实认证态和 Axe。详细矩阵见 [`responsive-design.md`](responsive-design.md)。

像素快照只覆盖稳定、高价值构图，不做“所有页面 × 所有视口”。当前 Landing 是可替换示例，因此只在失败时保留 Screenshot、Video 和 Trace；页面稳定后再为 320、1280×800 等少量关键构图提交基线。

人工门禁仍包括：真实 Chrome/Safari Zoom、键盘 Tab 顺序、VoiceOver、软键盘、长翻译、Forced Colors 与真机 Safe Area。

## 11. 多前端演进

当前视觉系统留在 CreeperNext 内。第二个真实前端开始复用且发布节奏稳定后，再提取：

```text
packages/
├── design-tokens/      # 平台无关 Token 与主题
├── ui/                 # 稳定基础组件
└── visual-testing/     # 浏览器断言、Story 与截图策略
```

页面 Pattern、营销艺术方向和业务组件默认留在各应用。不要因为“未来可能复用”过早建立共享包。

## 12. 反模式清单

- `@apply` 把 Utility 重新藏回 CSS；
- Tailwind Raw Palette 与 Semantic Token 混用；
- 同一元素由 Tailwind 和 Module 设置同一属性；
- 动态拼接无法扫描的 Tailwind 类；
- 让 shadcn CLI 直接写核心 Token；
- 在可复用组件用页面 `md/lg` 推断空间；
- 匿名 Container Query；
- 全仓 Desktop-first，再逐层用 `max-width` 撤销；
- `overflow-x: clip` 掩盖布局错误；
- 为“可能以后用”预装大型动效、表单或组件依赖。

相关依据：[Next.js CSS 指南](https://nextjs.org/docs/app/getting-started/css)、[Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)、[GitHub Primer Layout](https://primer.style/product/getting-started/foundations/layout/)。
