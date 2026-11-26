import type { ReactNode } from "react";

type Children = { children?: ReactNode };

export const FileCard = ({ children }: Children) => (
  <>
    <a className="skip-link" href="#main-content">
      Skip to content / सामग्री पर जाएँ
    </a>
    <main className="page" id="main-content" tabIndex={-1}>
      {children}
    </main>
  </>
);
export const Header = ({
  title,
  fact,
  intro,
}: {
  title: ReactNode;
  fact: ReactNode;
  intro: ReactNode;
}) => (
  <header>
    <h1>{title}</h1>
    <p className="fact">{fact}</p>
    <p>{intro}</p>
  </header>
);
export const Group = ({ label, children }: Children & { label: ReactNode }) => (
  <section className="group">
    <h2>{label}</h2>
    {children}
  </section>
);
export const Paragraph = ({ children }: Children) => <p>{children}</p>;
export const Callout = ({
  title,
  children,
  tone,
  id,
}: Children & { title: ReactNode; tone?: string; id?: string }) => (
  <aside id={id} className={"callout " + (tone || "")}>
    <strong>{title}</strong>
    <div>{children}</div>
  </aside>
);
export const Closing = ({ children }: Children) => <footer>{children}</footer>;
export const TextLink = ({ href, children }: Children & { href: string }) => (
  <a href={href} target="_blank" rel="noreferrer">
    {children}
  </a>
);
