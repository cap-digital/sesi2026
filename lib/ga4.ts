/**
 * Acesso ao GA4 — SOMENTE SERVIDOR.
 *
 * A chave da conta de serviço nunca sai daqui: este módulo é importado apenas
 * pela route handler em app/api/ga4, e o navegador conversa só com ela.
 * Autenticação por JWT + REST no endpoint analyticsdata.googleapis.com, que é
 * mais leve em serverless do que o cliente gRPC.
 */
import { JWT } from "google-auth-library";

const BASE = "https://analyticsdata.googleapis.com/v1beta";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export interface Ga4Range {
  start: string;
  end: string;
}

export interface Ga4Totals {
  users: number;
  newUsers: number;
  sessions: number;
  engagedSessions: number;
  engagementRate: number;
  avgSessionDuration: number;
  pageViews: number;
  keyEvents: number;
  eventCount: number;
}

export interface Ga4DailyPoint {
  date: string;
  users: number;
  sessions: number;
  keyEvents: number;
  primaryEvent: number;
}

export interface Ga4Event {
  name: string;
  count: number;
  users: number;
  isKeyEvent: boolean;
}

export interface Ga4Page {
  path: string;
  views: number;
  users: number;
}

export interface Ga4Report {
  range: Ga4Range;
  totals: Ga4Totals;
  daily: Ga4DailyPoint[];
  events: Ga4Event[];
  pages: Ga4Page[];
  /** evento de conversão em destaque, escolhido pelos dados (não fixado) */
  primaryEvent: { name: string; count: number; users: number } | null;
  /** primeiro e último dia com sessão no período pedido */
  dataFrom: string | null;
  dataTo: string | null;
  fetchedAt: string;
}

/* ------------------------------------------------------------------ */
/* credenciais e token                                                 */
/* ------------------------------------------------------------------ */

function credentials() {
  const email = process.env.GA4_CLIENT_EMAIL;
  const rawKey = process.env.GA4_PRIVATE_KEY;
  const propertyId = process.env.GA4_PROPERTY_ID;

  const missing = [
    !email && "GA4_CLIENT_EMAIL",
    !rawKey && "GA4_PRIVATE_KEY",
    !propertyId && "GA4_PROPERTY_ID",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`credenciais do GA4 ausentes: ${missing.join(", ")}`);
  }

  return {
    email: email!,
    // a chave chega numa linha com \n literal, tanto em .env.local como na Vercel
    key: rawKey!.replace(/\\n/g, "\n").replace(/^"|"$/g, ""),
    propertyId: propertyId!,
  };
}

let cachedClient: JWT | null = null;
function jwtClient() {
  if (cachedClient) return cachedClient;
  const { email, key } = credentials();
  cachedClient = new JWT({ email, key, scopes: [SCOPE] });
  return cachedClient;
}

/* ------------------------------------------------------------------ */
/* chamada crua                                                        */
/* ------------------------------------------------------------------ */

interface RunReportRow {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}
interface RunReportResponse {
  rows?: RunReportRow[];
  error?: { message?: string };
}

async function runReport(body: unknown): Promise<RunReportRow[]> {
  const { propertyId } = credentials();
  const { token } = await jwtClient().getAccessToken();
  if (!token) throw new Error("não foi possível obter token do GA4");

  const res = await fetch(`${BASE}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await res.json()) as RunReportResponse;
  if (!res.ok) {
    throw new Error(
      json.error?.message ?? `GA4 respondeu HTTP ${res.status}`
    );
  }
  return json.rows ?? [];
}

const num = (v?: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dim = (row: RunReportRow, i: number) => row.dimensionValues?.[i]?.value ?? "";
const met = (row: RunReportRow, i: number) => num(row.metricValues?.[i]?.value);

/** GA4 devolve a data como 20260814 */
const toISO = (yyyymmdd: string) =>
  /^\d{8}$/.test(yyyymmdd)
    ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
    : yyyymmdd;

/* ------------------------------------------------------------------ */
/* relatório completo                                                  */
/* ------------------------------------------------------------------ */

export async function fetchGa4Report(range: Ga4Range): Promise<Ga4Report> {
  const dateRanges = [{ startDate: range.start, endDate: range.end }];

  /* eventos: também revela quais estão marcados como conversão */
  const [eventRows, keyEventRows] = await Promise.all([
    runReport({
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 100,
    }),
    runReport({
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "keyEvents" }],
      orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }],
      limit: 100,
    }),
  ]);

  const keyEventCounts = new Map<string, number>();
  for (const row of keyEventRows) {
    const v = met(row, 0);
    if (v > 0) keyEventCounts.set(dim(row, 0), v);
  }

  const events: Ga4Event[] = eventRows.map((row) => ({
    name: dim(row, 0),
    count: met(row, 0),
    users: met(row, 1),
    isKeyEvent: keyEventCounts.has(dim(row, 0)),
  }));

  /**
   * O evento em destaque sai dos dados, não de uma constante: a conversão
   * marcada no GA4 com mais volume. Se ninguém marcou conversão ainda, cai
   * para um evento de envio de formulário, que é o que a landing coleta.
   */
  const primaryName =
    events.filter((e) => e.isKeyEvent).sort((a, b) => b.count - a.count)[0]
      ?.name ??
    events.find((e) => /envio|form.?submit|submit/i.test(e.name))?.name ??
    null;

  const primary = primaryName
    ? events.find((e) => e.name === primaryName) ?? null
    : null;

  const primaryFilter = primaryName
    ? {
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            stringFilter: { matchType: "EXACT", value: primaryName },
          },
        },
      }
    : {};

  const [totalRows, dailyRows, primaryDailyRows, pageRows] = await Promise.all([
      runReport({
        dateRanges,
        metrics: [
          { name: "totalUsers" },
          { name: "newUsers" },
          { name: "sessions" },
          { name: "engagedSessions" },
          { name: "engagementRate" },
          { name: "averageSessionDuration" },
          { name: "screenPageViews" },
          { name: "keyEvents" },
          { name: "eventCount" },
        ],
      }),
      runReport({
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "totalUsers" },
          { name: "sessions" },
          { name: "keyEvents" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 400,
      }),
      primaryName
        ? runReport({
            dateRanges,
            dimensions: [{ name: "date" }],
            metrics: [{ name: "eventCount" }],
            ...primaryFilter,
            orderBys: [{ dimension: { dimensionName: "date" } }],
            limit: 400,
          })
        : Promise.resolve([]),
      runReport({
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 15,
      }),
  ]);

  const t = totalRows[0];
  const totals: Ga4Totals = {
    users: t ? met(t, 0) : 0,
    newUsers: t ? met(t, 1) : 0,
    sessions: t ? met(t, 2) : 0,
    engagedSessions: t ? met(t, 3) : 0,
    engagementRate: t ? met(t, 4) : 0,
    avgSessionDuration: t ? met(t, 5) : 0,
    pageViews: t ? met(t, 6) : 0,
    keyEvents: t ? met(t, 7) : 0,
    eventCount: t ? met(t, 8) : 0,
  };

  const primaryByDate = new Map<string, number>();
  for (const row of primaryDailyRows) {
    primaryByDate.set(toISO(dim(row, 0)), met(row, 0));
  }

  const daily: Ga4DailyPoint[] = dailyRows.map((row) => {
    const date = toISO(dim(row, 0));
    return {
      date,
      users: met(row, 0),
      sessions: met(row, 1),
      keyEvents: met(row, 2),
      primaryEvent: primaryByDate.get(date) ?? 0,
    };
  });

  const pages: Ga4Page[] = pageRows.map((row) => ({
    path: dim(row, 0),
    views: met(row, 0),
    users: met(row, 1),
  }));

  const withSessions = daily.filter((d) => d.sessions > 0);

  return {
    range,
    totals,
    daily,
    events,
    pages,
    primaryEvent: primary
      ? { name: primary.name, count: primary.count, users: primary.users }
      : null,
    dataFrom: withSessions[0]?.date ?? null,
    dataTo: withSessions[withSessions.length - 1]?.date ?? null,
    fetchedAt: new Date().toISOString(),
  };
}
