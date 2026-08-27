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
    for (let index = 0; index < targets.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < targets.length; compareIndex += 1) {
        const first = targets[index];
        const second = targets[compareIndex];
        if (first.element.contains(second.element) || second.element.contains(first.element)) continue;
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
}
