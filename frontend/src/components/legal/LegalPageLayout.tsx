import Footer from "@/components/Footer";
import TopBar from "@/components/TopBar";

interface LegalPageLayoutProps {
  eyebrow: string;
  title: string;
  summary: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({
  eyebrow,
  title,
  summary,
  updatedAt,
  children,
}: LegalPageLayoutProps) {
  return (
    <>
      <TopBar showBackButton />
      <main className="min-h-screen bg-bg-secondary">
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-10 lg:px-16 lg:py-20">
          <div className="overflow-hidden rounded-[32px] border border-stroke-secondary bg-white shadow-[0px_24px_80px_rgba(1,12,57,0.08)]">
            <div className="border-b border-stroke-secondary bg-bg-accent-light px-6 py-10 md:px-10 lg:px-14">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-text-accent-primary">
                {eyebrow}
              </p>
              <h1 className="max-w-3xl text-3xl font-bold leading-tight text-text-primary md:text-4xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-text-secondary md:text-base">
                {summary}
              </p>
              <div className="mt-6 inline-flex items-center rounded-full border border-stroke-accent-secondary bg-white px-4 py-2 text-sm text-text-accent-primary">
                Última actualización: {updatedAt}
              </div>
            </div>

            <article className="px-6 py-10 md:px-10 lg:px-14 lg:py-14">
              <div className="prose prose-gray max-w-none prose-headings:font-semibold prose-headings:text-text-primary prose-p:text-text-secondary prose-li:text-text-secondary prose-strong:text-text-primary prose-a:text-text-accent-primary">
                {children}
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
