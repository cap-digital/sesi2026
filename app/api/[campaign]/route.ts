import { NextResponse } from "next/server";
import { CAMPAIGNS } from "@/lib/campaigns";

const BASE = "https://cqrpbiepyeypbkizwacu.supabase.co/functions/v1";
const KEY = "sb_publishable_YN9YKLw6sludrgf9T2i_1g_Dcm8dIiK";

/**
 * A origem oscila muito (de 3s a mais de 70s) e às vezes devolve 500 com HTML.
 * Estratégia: cache em memória + stale-while-revalidate.
 *  - com cache fresco  -> resposta imediata
 *  - com cache velho   -> resposta imediata e revalidação em background
 *  - sem cache         -> aguarda a origem (tentativas com timeout generoso)
 *  - origem quebrada   -> devolve o último dado bom marcado como defasado
 */
const ATTEMPTS = 2;
const ATTEMPT_TIMEOUT_MS = 50_000;
const BACKOFF_MS = 800;
const FRESH_MS = 3 * 60 * 1000;
/** só avisa o usuário quando o dado realmente envelheceu */
const STALE_WARN_MS = 20 * 60 * 1000;

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Cached {
  payload: Record<string, unknown>;
  at: number;
}

const cache = new Map<string, Cached>();
const inflight = new Map<string, Promise<Cached | null>>();

type Attempt =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string };

async function callOrigin(endpoint: string): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        apikey: KEY,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: `origem devolveu HTML (HTTP ${res.status})` };
    }

    const obj = (parsed ?? {}) as Record<string, unknown>;
    if (!res.ok || obj.success === false) {
      return {
        ok: false,
        error: typeof obj.error === "string" ? obj.error : `HTTP ${res.status}`,
      };
    }
    return { ok: true, payload: obj };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "tempo limite da origem"
        : err instanceof Error
        ? err.message
        : "falha de rede",
    };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Uma revalidação por campanha de cada vez — chamadas concorrentes compartilham. */
function revalidate(key: string, endpoint: string): Promise<Cached | null> {
  const running = inflight.get(key);
  if (running) return running;

  const job = (async () => {
    try {
      for (let i = 0; i < ATTEMPTS; i++) {
        const attempt = await callOrigin(endpoint);
        if (attempt.ok) {
          const entry: Cached = { payload: attempt.payload, at: Date.now() };
          cache.set(key, entry);
          return entry;
        }
        lastErrors.set(key, attempt.error);
        if (i < ATTEMPTS - 1) await sleep(BACKOFF_MS * (i + 1));
      }
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

const lastErrors = new Map<string, string>();

function respond(entry: Cached) {
  const age = Date.now() - entry.at;
  const stale = age > STALE_WARN_MS;
  return NextResponse.json(
    {
      ...entry.payload,
      _stale: stale,
      _cachedAt: new Date(entry.at).toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=600",
      },
    }
  );
}

export async function GET(
  req: Request,
  { params }: { params: { campaign: string } }
) {
  const campaign = CAMPAIGNS[params.campaign as keyof typeof CAMPAIGNS];
  if (!campaign) {
    return NextResponse.json({ error: "campanha inválida" }, { status: 404 });
  }

  const key = campaign.id;
  const force = new URL(req.url).searchParams.get("force") === "1";
  const hit = cache.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;

  if (hit && !force && age < FRESH_MS) return respond(hit);

  // já temos algo em mãos: entrega na hora e atualiza por trás
  if (hit && !force) {
    void revalidate(key, campaign.endpoint).catch(() => null);
    return respond(hit);
  }

  const fresh = await revalidate(key, campaign.endpoint).catch(() => null);
  if (fresh) return respond(fresh);
  if (hit) return respond(hit);

  return NextResponse.json(
    {
      error: `não foi possível obter os dados (${
        lastErrors.get(key) ?? "origem indisponível"
      })`,
    },
    { status: 502, headers: { "Cache-Control": "no-store" } }
  );
}
