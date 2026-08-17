import { NextResponse } from "next/server";
import { fetchGa4Report, type Ga4Report } from "@/lib/ga4";

/**
 * Proxy do GA4. A chave da conta de serviço fica só no servidor — o navegador
 * chama esta rota e nunca a API do Google. Mantém em memória o último relatório
 * bom por intervalo, para navegação entre abas não repetir a consulta.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FRESH_MS = 3 * 60 * 1000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const cache = new Map<string, { report: Ga4Report; at: number }>();
const inflight = new Map<string, Promise<Ga4Report>>();

function load(key: string, start: string, end: string) {
  const running = inflight.get(key);
  if (running) return running;

  const job = fetchGa4Report({ start, end })
    .then((report) => {
      cache.set(key, { report, at: Date.now() });
      return report;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, job);
  return job;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? "";
  const end = url.searchParams.get("end") ?? "";
  const force = url.searchParams.get("force") === "1";

  if (!ISO.test(start) || !ISO.test(end) || start > end) {
    return NextResponse.json(
      { error: "informe start e end no formato AAAA-MM-DD" },
      { status: 400 }
    );
  }

  const key = `${start}..${end}`;
  const hit = cache.get(key);

  if (hit && !force && Date.now() - hit.at < FRESH_MS) {
    return NextResponse.json(hit.report, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  }

  try {
    const report = await load(key, start, end);
    return NextResponse.json(report, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (err) {
    // origem fora do ar: melhor servir o último relatório bom do que quebrar
    if (hit) {
      return NextResponse.json(
        { ...hit.report, _stale: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "falha ao consultar o GA4",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
