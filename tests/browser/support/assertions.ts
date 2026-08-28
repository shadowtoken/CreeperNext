import { expect, type BrowserContext, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { authStatePath } from "../global-setup";

type LayoutAudit = {
  bottomReachable: boolean;
  clippedText: string[];
  horizontalOverflow: number;
  overlappingTargets: string[];
  structuralClipping: string[];
  verticalStructuralClipping: string[];
  viewportOffenders: string[];
};

export async function expectResponsiveLayout(page: Page) {
  const audit = await page.evaluate<LayoutAudit>(async () => {
    const root = document.documentElement;
    const describe = (element: Element) => {
      const html = element as HTMLElement;
      const id = html.id ? `#${html.id}` : "";
      const classes = typeof html.className === "string"
        ? html.className.split(/\s+/).filter(Boolean).slice(0, 2).map((name) => `.${name}`).join("")
        : "";
      return `${html.tagName.toLowerCase()}${id}${classes}`;
    };
    const isVisible = (element: HTMLElement) => {
      let current: HTMLElement | null = element;
      while (current) {
        const style = getComputedStyle(current);
        if (
          style.display === "none"
          || style.visibility === "hidden"
          || Number(style.opacity) === 0
        ) return false;
        current = current.parentElement;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const contentRoots = [root, document.body, ...document.querySelectorAll("main")];
    const structuralClipping = contentRoots
      .filter((element) => ["hidden", "clip"].includes(getComputedStyle(element).overflowX))
      .map(describe);
    const verticalStructuralClipping = contentRoots
      .filter((element) => ["hidden", "clip"].includes(getComputedStyle(element).overflowY))
      .map(describe);

    const viewportOffenders: string[] = [];
    const clippedText: string[] = [];
    for (const element of document.body.querySelectorAll<HTMLElement>("*")) {
      if (
        !isVisible(element)
        || element.matches(".sr-only")
        || element.closest(".sr-only, [data-responsive-overflow-ok]")
      ) continue;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (rect.left < -1 || rect.right > root.clientWidth + 1) {
        viewportOffenders.push(describe(element));
      }
      const clips = [style.overflowX, style.overflowY].some((value) => ["hidden", "clip"].includes(value));
      const hasText = Boolean(element.textContent?.trim());
      if (
        clips
        && hasText
        && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
      ) {
        clippedText.push(describe(element));
      }
    }

    const interactiveSelector = "a[href], button, input:not([type='hidden']), select, textarea, summary, [role='button'], [role='link']";
    const targets = [...document.querySelectorAll<HTMLElement>(interactiveSelector)]
      .filter((element) => isVisible(element) && !element.closest("[data-responsive-overflow-ok]"))
      .map((element) => ({ element, rect: element.getBoundingClientRect(), name: describe(element) }));
    const overlappingTargets: string[] = [];
    const isIntentionalCompositeOverlap = (first: HTMLElement, second: HTMLElement) => {
      const button = first instanceof HTMLButtonElement
        ? first
        : second instanceof HTMLButtonElement
          ? second
          : null;
      const input = first instanceof HTMLInputElement
        ? first
        : second instanceof HTMLInputElement
          ? second
          : null;

      return Boolean(
        button
        && input?.id
        && button.getAttribute("aria-controls") === input.id
        && button.parentElement === input.parentElement,
      );
    };
    for (let index = 0; index < targets.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < targets.length; compareIndex += 1) {
        const first = targets[index];
        const second = targets[compareIndex];
        if (first.element.contains(second.element) || second.element.contains(first.element)) continue;
        if (isIntentionalCompositeOverlap(first.element, second.element)) continue;
        const overlapWidth = Math.min(first.rect.right, second.rect.right) - Math.max(first.rect.left, second.rect.left);
        const overlapHeight = Math.min(first.rect.bottom, second.rect.bottom) - Math.max(first.rect.top, second.rect.top);
        if (overlapWidth > 1 && overlapHeight > 1) {
          overlappingTargets.push(`${first.name} ↔ ${second.name}`);
        }
      }
    }

    const originalScrollY = window.scrollY;
    const originalScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, root.scrollHeight);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const bottomReachable = window.scrollY + window.innerHeight >= root.scrollHeight - 2;
    window.scrollTo(0, originalScrollY);
    root.style.scrollBehavior = originalScrollBehavior;

    return {
      bottomReachable,
      horizontalOverflow: root.scrollWidth - root.clientWidth,
      structuralClipping: [...new Set(structuralClipping)],
      verticalStructuralClipping: [...new Set(verticalStructuralClipping)],
      viewportOffenders: [...new Set(viewportOffenders)].slice(0, 12),
      clippedText: [...new Set(clippedText)].slice(0, 12),
      overlappingTargets: [...new Set(overlappingTargets)].slice(0, 12),
    };
  });

  expect(audit.horizontalOverflow, `页面横向溢出 ${audit.horizontalOverflow}px`).toBeLessThanOrEqual(1);
  expect(audit.structuralClipping, "html/body/main 不得横向裁切以掩盖响应式问题").toEqual([]);
  expect(audit.verticalStructuralClipping, "html/body/main 不得纵向锁死内容").toEqual([]);
  expect(audit.viewportOffenders, "可见元素不应跑出视口").toEqual([]);
  expect(audit.clippedText, "文本不应被 overflow 裁切").toEqual([]);
  expect(audit.overlappingTargets, "交互目标不应互相覆盖").toEqual([]);
  expect(audit.bottomReachable, "页面末端必须可滚动到达").toBe(true);
}

export async function expectTouchTargets(page: Page) {
  const undersized = await page.evaluate(() => {
    const selector = "a[href], button, input:not([type='hidden']), select, textarea, summary, [role='button'], [role='link']";
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const hasSurroundingInlineText = element instanceof HTMLAnchorElement
          && style.display === "inline"
          && [...(element.parentElement?.childNodes ?? [])].some(
            (node) => node !== element && node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
          );
        return !element.closest("[data-target-size-exempt]")
          && !hasSurroundingInlineText
          && style.display !== "none"
          && style.visibility !== "hidden"
          && Number(style.opacity) > 0
          && rect.width > 0
          && rect.height > 0;
      })
      .map((element) => {
        const ownRect = element.getBoundingClientRect();
        const relatedRects = element instanceof HTMLInputElement
          && ["checkbox", "radio"].includes(element.type)
          ? [ownRect, ...[...(element.labels ?? [])].map((label) => label.getBoundingClientRect())]
          : [ownRect];
        const rect = {
          left: Math.min(...relatedRects.map((item) => item.left)),
          right: Math.max(...relatedRects.map((item) => item.right)),
          top: Math.min(...relatedRects.map((item) => item.top)),
          bottom: Math.max(...relatedRects.map((item) => item.bottom)),
        };
        return {
          element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`,
          width: Math.round((rect.right - rect.left) * 10) / 10,
          height: Math.round((rect.bottom - rect.top) * 10) / 10,
        };
      })
      .filter(({ width, height }) => width < 43.5 || height < 43.5);
  });

  expect(undersized, "Creeper 的交互目标标准是 44×44 CSS px").toEqual([]);
}

export async function expectAuthTaskGeometry(page: Page) {
  const geometry = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>("[data-auth-card]");
    const form = document.querySelector<HTMLFormElement>("[data-auth-form-region] form");
    const title = card?.querySelector<HTMLElement>("h1");
    const inputs = form
      ? [...form.querySelectorAll<HTMLInputElement>("input:not([type='hidden']):not([type='checkbox']):not([type='radio'])")]
      : [];
    const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!card || !form || !title || inputs.length === 0 || !submit) return null;

    const cardRect = card.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    const inputRects = inputs.map((input) => input.getBoundingClientRect());
    const submitRect = submit.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const titleStyle = getComputedStyle(title);
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;

    return {
      viewportWidth,
      viewportHeight,
      card: {
        left: cardRect.left,
        width: cardRect.width,
        centerOffset: (cardRect.left + cardRect.right) / 2 - viewportWidth / 2,
        borderWidth: Number.parseFloat(cardStyle.borderTopWidth),
        boxShadow: cardStyle.boxShadow,
      },
      formWidth: formRect.width,
      inputs: inputRects.map((rect) => ({ left: rect.left, width: rect.width, height: rect.height })),
      submit: { width: submitRect.width, height: submitRect.height, bottom: submitRect.bottom },
      title: {
        fontSize: Number.parseFloat(titleStyle.fontSize),
        letterSpacing: Number.parseFloat(titleStyle.letterSpacing),
      },
    };
  });

  expect(geometry, "认证页必须渲染单一任务卡片、表单与主 CTA").not.toBeNull();
  if (!geometry) return;

  expect(Math.abs(geometry.card.centerOffset), "认证任务应在视口中水平居中").toBeLessThanOrEqual(1);
  expect(geometry.card.width, "认证任务宽度不应超过 440px").toBeLessThanOrEqual(440.5);
  expect(geometry.formWidth, "认证表单需要保留可用宽度").toBeGreaterThanOrEqual(279);

  for (const input of geometry.inputs) {
    expect(Math.abs(input.left - geometry.inputs[0].left), "认证字段始终保持单列对齐").toBeLessThanOrEqual(1);
    expect(Math.abs(input.width - geometry.formWidth), "认证字段应填满表单宽度").toBeLessThanOrEqual(1);
    expect(input.height, "认证输入框使用 52px 控件高度").toBeGreaterThanOrEqual(51.5);
  }
  expect(Math.abs(geometry.submit.width - geometry.formWidth), "主 CTA 应填满表单宽度").toBeLessThanOrEqual(1);
  expect(geometry.submit.height, "主 CTA 使用 52px 控件高度").toBeGreaterThanOrEqual(51.5);
  expect(geometry.title.fontSize, "中文认证标题不得小于 30px").toBeGreaterThanOrEqual(30);
  expect(geometry.title.fontSize, "中文认证标题不得大于 40px").toBeLessThanOrEqual(40);
  expect(geometry.title.letterSpacing, "中文标题不可使用展示型紧缩字距").toBeGreaterThan(-1.1);

  if (geometry.viewportWidth === 320) {
    expect(geometry.card.left, "320px 视口使用 20px 页边距").toBeCloseTo(20, 0);
  }
  if (geometry.viewportWidth === 390) {
    expect(geometry.card.left, "390px 视口使用 24px 页边距").toBeCloseTo(24, 0);
  }
  if (geometry.viewportWidth < 640) {
    expect(geometry.card.borderWidth, "移动端不绘制卡片边框").toBe(0);
    expect(geometry.card.boxShadow, "移动端不使用重卡片阴影").toBe("none");
  } else {
    expect(geometry.card.width, "桌面端认证卡片维持 420–440px").toBeGreaterThanOrEqual(420);
  }

  const firstFoldHeight = geometry.inputs.length <= 2 ? 568 : 800;
  if (geometry.viewportHeight >= firstFoldHeight) {
    expect(geometry.submit.bottom, "主 CTA 应在常规首屏内可见").toBeLessThanOrEqual(geometry.viewportHeight + 1);
  }
}

export async function authenticate(page: Page) {
  const state = JSON.parse(await readFile(authStatePath, "utf8")) as {
    cookies: Parameters<BrowserContext["addCookies"]>[0];
  };
  await page.context().addCookies(state.cookies);
  const response = await page.request.get("/api/auth/get-session");
  const body = await response.text();
  expect(response.status(), body).toBe(200);
  const session = JSON.parse(body);
  expect(session?.user?.email).toBe("responsive-browser@example.com");
  expect(session?.user?.twoFactorEnabled).toBe(true);
  expect(session?.session?.mfaVerifiedAt).toBeTruthy();
}
