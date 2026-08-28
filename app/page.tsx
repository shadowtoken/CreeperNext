import { FoundationPreview, SiteFooter, SiteHeader } from "@/features/marketing";
import { ButtonLink } from "@/components/ui/button-link";
import { Kicker } from "@/components/ui/kicker";
import { siteConfig } from "@/config/site";
import { AUTH_PATHS } from "@/core/auth/paths";
import { cn } from "@/lib/cn";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "可靠的产品起点",
  description: "一个轻量、现代、可扩展的 Next.js 产品脚手架。",
};

const principles = [
  {
    number: "01",
    title: "轻量，但不简陋",
    copy: "只保留每个产品都会用到的地基。没有预装的后台、计费和复杂状态管理。",
  },
  {
    number: "02",
    title: "约定，而不锁死",
    copy: "固定 Token、目录与组件边界，视觉、认证提供方和业务能力都可以替换。",
  },
  {
    number: "03",
    title: "从手机开始",
    copy: "每个页面都以窄屏、触摸和键盘为一等场景，而不是桌面页面的事后压缩。",
  },
];

export default function Home() {
  return (
    <div className={styles.shell}>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} id="top">
        <div className={cn(styles.heroCopy, "@container/hero-copy")}>
          <div className={styles.eyebrow}><span />Next.js 产品脚手架</div>
          <h1><span>从一个好地基，</span><span>开始下一款产品。</span></h1>
          <p className={styles.heroLead}>
            Landing、认证、响应式与设计系统已经就位。保持轻量，按需扩展，
            让团队把时间用在真正独特的产品上。
          </p>
          <div className={styles.heroActions}>
            <ButtonLink className={styles.heroPrimary} href={AUTH_PATHS.register}>免费开始 <span aria-hidden="true">→</span></ButtonLink>
            <a className={styles.textLink} href="#structure">查看结构 <span aria-hidden="true">↘</span></a>
          </div>
          <div className={styles.heroNote}>
            <span className={styles.statusDot} aria-hidden="true" />
            清晰边界 · 本地组件 · 移动优先
          </div>
        </div>
        <FoundationPreview />
        </section>

        <ul className={styles.proofStrip} aria-label="核心能力">
          <li>Next.js</li>
          <li>TypeScript</li>
          <li>Tailwind CSS</li>
          <li>Accessible</li>
          <li>Mobile-first</li>
        </ul>

      <section className={cn(styles.contentSection, styles.principles)} id="principles">
        <SectionHeading
          kicker="BUILDING PRINCIPLES"
          title="足够坚固，也足够留白。"
          copy="好的脚手架提供清晰边界，而不是替你决定产品。"
        />
        <div className={styles.principleGrid}>
          {principles.map((item) => (
            <article className={styles.principleCard} key={item.number}>
              <span className={styles.principleNumber}>{item.number}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={cn(styles.contentSection, styles.structure)} id="structure">
        <div>
          <SectionHeading
            kicker="THE STRUCTURE"
            title="四层结构，顺序生长。"
            copy="每一层都有单一职责。新增业务只向上生长，不需要拆掉已经稳定的部分。"
          />
          <ButtonLink className={styles.structureButton} href={AUTH_PATHS.account} variant="secondary">查看受保护页面 <span aria-hidden="true">→</span></ButtonLink>
        </div>
        <ol className={cn(styles.layerStack, "@container/layers")} aria-label="脚手架分层结构">
          <Layer index="04" title="Your product" detail="Admin、SaaS、Blog…" accent />
          <Layer index="03" title="Pages & Patterns" detail="Landing、Auth、Account" />
          <Layer index="02" title="Design System" detail="Tokens、UI、Motion" />
          <Layer index="01" title="Core" detail="Next、TypeScript、Security" foundation />
        </ol>
      </section>

      <section className={cn(styles.authShowcase, "@container/auth-showcase")} aria-labelledby="auth-showcase-title">
        <div className={styles.authShowcaseCopy}>
          <Kicker inverse>AUTHENTICATION INCLUDED</Kicker>
          <h2 id="auth-showcase-title">认证不是一张登录表单。</h2>
          <p>
            登录、首次注册、退出、会话读取和路由保护形成完整闭环。
            提供方被隔离在适配层，产品页面只关心“用户是谁”。
          </p>
          <ul className={styles.checkList}>
            <li><span>✓</span> 服务端验证会话</li>
            <li><span>✓</span> 安全的登录后跳转</li>
            <li><span>✓</span> 可替换认证提供方</li>
          </ul>
        </div>
        <div className={styles.authMiniCard}>
          <div className={styles.miniBrand}><span>C</span></div>
          <div>
            <span className={styles.miniLabel}>WELCOME</span>
            <h3>继续构建你的产品</h3>
            <p>登录后进入一个最小、真实受保护的 Account 页面。</p>
          </div>
          <ButtonLink href={AUTH_PATHS.login}>登录 {siteConfig.name} <span aria-hidden="true">→</span></ButtonLink>
          <small>账户创建后，通过登录在服务端安全建立会话。</small>
        </div>
      </section>

      <section className={cn(styles.finalCta, "@container/final-cta")}>
        <Kicker>READY WHEN YOU ARE</Kicker>
        <h2>地基已经打好。<br />下一层，由产品决定。</h2>
        <div className={styles.ctaActions}>
          <ButtonLink className={styles.ctaPrimary} href={AUTH_PATHS.register}>开始搭建 <span aria-hidden="true">→</span></ButtonLink>
          <Link href={AUTH_PATHS.login}>我已有账户</Link>
        </div>
      </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  copy,
}: {
  kicker: string;
  title: string;
  copy: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <Kicker>{kicker}</Kicker>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function Layer({
  index,
  title,
  detail,
  accent = false,
  foundation = false,
}: {
  index: string;
  title: string;
  detail: string;
  accent?: boolean;
  foundation?: boolean;
}) {
  return (
    <li className={cn(styles.layer, accent && styles.layerAccent, foundation && styles.layerFoundation)}>
      <span>{index}</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </li>
  );
}
