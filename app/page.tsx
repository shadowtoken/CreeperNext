import { FoundationPreview, SiteFooter, SiteHeader } from "@/features/marketing";
import { ButtonLink } from "@/components/ui/button-link";
import { AUTH_PATHS } from "@/core/auth/paths";
import { siteConfig } from "@/config/site";
import styles from "./page.module.css";

export const metadata = {
  title: "Next.js 脚手架",
  description: "包含官网、账户认证与响应式组件的轻量 Next.js 脚手架。",
};

const capabilities = [
  { title: "页面与组件", copy: "官网、登录与注册页面，共享样式和响应式规范。" },
  { title: "账户认证", copy: "邮箱密码登录、身份验证器与服务端会话校验。" },
  { title: "全栈开发", copy: "TypeScript、PostgreSQL 与 Drizzle，按功能组织代码。" },
];

export default function Home() {
  return (
    <div className={styles.shell}>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} id="top">
          <div className={styles.heroCopy}>
            <h1>{siteConfig.name}</h1>
            <p className={styles.heroLead}>一个轻量的 Next.js 脚手架。</p>
            <p className={styles.heroDescription}>官网、账户认证与基础组件，按你的项目需要扩展。</p>
            <div className={styles.heroActions}>
              <ButtonLink href={AUTH_PATHS.register}>创建账户</ButtonLink>
              <ButtonLink href={AUTH_PATHS.login} variant="secondary">登录</ButtonLink>
            </div>
          </div>
        </section>
        <section className={styles.capabilities} id="principles" aria-label="基础能力">
          {capabilities.map((item) => (
            <article key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.copy}</p>
            </article>
          ))}
        </section>
        <section className={styles.structure} id="structure" aria-labelledby="structure-title">
          <div>
            <h2 id="structure-title">项目结构</h2>
            <p>页面、功能和服务端分开管理。</p>
          </div>
          <FoundationPreview />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
