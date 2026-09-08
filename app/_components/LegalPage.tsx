import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

/**
 * Shared shell for legal pages (/privacy, /terms): marketing chrome plus a
 * readable single-column prose layout. Sections are h2 + paragraphs/lists
 * passed as children via the Section/P/LI helpers below.
 */
export default function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="relative overflow-x-clip bg-white">
        <section className="mx-auto max-w-3xl px-6 pt-32 pb-20 lg:pt-40 lg:pb-28">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#5F58F4] font-sans">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tighter text-[#14132B] sm:text-4xl lg:text-5xl font-sans">
            {title}
          </h1>
          <p className="mt-3 text-sm text-[#9A99A8] font-sans">Last updated: {updated}</p>
          <p className="mt-6 text-base leading-relaxed text-[#33323F] font-sans">{intro}</p>

          <div className="mt-10 flex flex-col gap-10">{children}</div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl font-bold tracking-tight text-[#14132B] font-sans">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-[#33323F] font-sans">
        {children}
      </div>
    </section>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}
