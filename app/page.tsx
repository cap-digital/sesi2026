import Link from "next/link";
import { SesiLogo } from "@/components/Logo";
import { QuadrantBar, QuadrantCircle, Waves } from "@/components/SesiArt";
import { JEQUIE, ROBOTICA, type CampaignDef } from "@/lib/campaigns";
import { fmtDate } from "@/lib/format";

const CARDS: {
  campaign: CampaignDef;
  href: string;
  banner: string;
  pattern: string;
  chip: string;
  eyebrow: string;
  headline: string;
  description: string;
}[] = [
  {
    campaign: ROBOTICA,
    href: "/robotica",
    banner: "linear-gradient(135deg,#5e2116 0%,#8f2f1a 45%,#e09a3c 100%)",
    pattern: "circuit",
    chip: "#fbe8c4",
    eyebrow: "OBR 2026",
    headline: "Olimpíada Brasileira de Robótica",
    description:
      "Meta Ads, Rede Display, YouTube e TikTok. Campanha em veiculação com dados diários.",
  },
  {
    campaign: JEQUIE,
    href: "/jequie",
    banner: "linear-gradient(135deg,#101a5c 0%,#1b2a8c 50%,#3446bd 100%)",
    pattern: "dots",
    chip: "#8dc63f",
    eyebrow: "Nova Escola",
    headline: "Inauguração Escola SESI Jequié",
    description:
      "Meta Ads e Google PMAX. Dois meses de campanha, com metas mensais de agosto e setembro.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-page">
      {/* ondas institucionais no rodapé da página */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46vh] min-h-[280px]"
      >
        <Waves tone="dark" />
      </div>

      {/* hero institucional */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(155deg,#0b2a63 0%,#1c3f8f 55%,#2b4a9b 100%)",
        }}
      >
        <QuadrantBar />
        <Waves />
        {/* centro do círculo na borda direita: só o arco aparece */}
        <QuadrantCircle
          size={380}
          opacity={0.17}
          className="pointer-events-none absolute right-[-190px] top-1/2 hidden -translate-y-1/2 sm:block"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pb-28 sm:pt-14">
          <div className="max-w-2xl">
            <SesiLogo height={30} priority className="mb-6" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8dc63f]">
              Performance de mídia
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-[42px]">
              Escolha uma campanha
            </h1>
            <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-white/75 sm:text-[15px]">
              Dois painéis independentes, cada um com a identidade da sua
              campanha. Acompanhe investimento, entrega, custos por objetivo e o
              progresso das metas.
            </p>
          </div>
        </div>
      </section>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pb-20 sm:px-6">
        <div className="-mt-14 grid gap-4 sm:gap-5 lg:grid-cols-2">
          {CARDS.map((c) => (
            <Link
              key={c.campaign.id}
              href={c.href}
              className="group relative flex flex-col overflow-hidden rounded-[22px] border border-hairline bg-surface shadow-float transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div
                className={`relative h-[152px] overflow-hidden ${c.pattern}`}
                style={{ background: c.banner }}
              >
                <div className="absolute inset-0 flex flex-col justify-between p-5">
                  <div className="flex items-start justify-between gap-3">
                    <SesiLogo height={22} priority />
                    <span
                      className="rounded-pill px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                      style={{ background: `${c.chip}26`, color: c.chip }}
                    >
                      {c.eyebrow}
                    </span>
                  </div>
                  <p className="max-w-[86%] text-[21px] font-bold uppercase leading-[1.1] tracking-tight text-white">
                    {c.headline}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.campaign.platforms.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface2 px-2 py-0.5 text-[11px] font-medium text-ink2"
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: p.color }}
                      />
                      {p.label}
                    </span>
                  ))}
                </div>

                <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink2">
                  {c.description}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3.5">
                  <span className="tnum text-[11.5px] text-muted">
                    {fmtDate(c.campaign.window.start)} –{" "}
                    {fmtDate(c.campaign.window.end)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand px-3.5 py-2 text-xs font-semibold text-white transition group-hover:gap-2.5">
                    Abrir painel
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M5 12h13M12 5.5L18.5 12 12 18.5" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
