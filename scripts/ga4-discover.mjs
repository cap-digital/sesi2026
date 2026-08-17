/**
 * Descobre o que a property do GA4 tem: eventos, conversões marcadas como
 * key event, canais e datas com dados. Roda só localmente, para calibrar a
 * aba antes de fixar métrica nenhuma.
 *
 *   node scripts/ga4-discover.mjs
 */
import { readFileSync } from "node:fs";
import { JWT } from "google-auth-library";

/* lê .env.local sem depender de dotenv */
function loadEnv(file = ".env.local") {
  const raw = readFileSync(file, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv();
const propertyId = env.GA4_PROPERTY_ID;
const client = new JWT({
  email: env.GA4_CLIENT_EMAIL,
  key: env.GA4_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
});

const BASE = "https://analyticsdata.googleapis.com/v1beta";

async function call(path, body) {
  const { token } = await client.getAccessToken();
  const res = await fetch(`${BASE}/properties/${propertyId}:${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`\n✗ ${path} → HTTP ${res.status}`);
    console.error(JSON.stringify(json, null, 2).slice(0, 900));
    process.exit(1);
  }
  return json;
}

const RANGE = [{ startDate: "2026-07-01", endDate: "today" }];

console.log(`property ${propertyId} · conta de serviço ${env.GA4_CLIENT_EMAIL}`);

/* 1. metadados: quais eventos são key events (conversões) */
{
  const { token } = await client.getAccessToken();
  const res = await fetch(`${BASE}/properties/${propertyId}/metadata`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = await res.json();
  if (!res.ok) {
    console.error("✗ metadata:", JSON.stringify(meta).slice(0, 400));
  } else {
    const custom = (meta.metrics ?? []).filter((m) => m.customDefinition);
    console.log(`\nmétricas customizadas: ${custom.length}`);
    custom.slice(0, 20).forEach((m) => console.log(`  ${m.apiName} — ${m.uiName}`));
  }
}

/* 2. eventos por nome */
{
  const r = await call("runReport", {
    dateRanges: RANGE,
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 50,
  });
  console.log("\n=== EVENTOS (01/07 até hoje)");
  for (const row of r.rows ?? []) {
    console.log(
      `  ${row.dimensionValues[0].value.padEnd(34)} ${String(
        row.metricValues[0].value
      ).padStart(8)} eventos · ${row.metricValues[1].value} usuários`
    );
  }
  if (!r.rows?.length) console.log("  (nenhum evento no período)");
}

/* 3. conversões (key events) */
{
  const r = await call("runReport", {
    dateRanges: RANGE,
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "keyEvents" }],
    orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }],
    limit: 30,
  });
  console.log("\n=== KEY EVENTS (conversões marcadas no GA4)");
  const rows = (r.rows ?? []).filter((x) => Number(x.metricValues[0].value) > 0);
  rows.forEach((row) =>
    console.log(
      `  ${row.dimensionValues[0].value.padEnd(34)} ${row.metricValues[0].value}`
    )
  );
  if (!rows.length) console.log("  (nenhum evento marcado como conversão)");
}

/* 4. sessões por canal e por origem/mídia */
{
  const r = await call("runReport", {
    dateRanges: RANGE,
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "keyEvents" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 20,
  });
  console.log("\n=== SESSÕES POR CANAL");
  for (const row of r.rows ?? []) {
    console.log(
      `  ${row.dimensionValues[0].value.padEnd(22)} ${String(
        row.metricValues[0].value
      ).padStart(7)} sessões · ${row.metricValues[1].value} usuários · ${
        row.metricValues[2].value
      } conversões`
    );
  }
}

/* 5. primeiro e último dia com dados */
{
  const r = await call("runReport", {
    dateRanges: [{ startDate: "2026-01-01", endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
    limit: 400,
  });
  const dias = (r.rows ?? []).map((x) => x.dimensionValues[0].value);
  console.log(
    `\n=== DIAS COM DADOS: ${dias.length}` +
      (dias.length ? ` — de ${dias[0]} a ${dias[dias.length - 1]}` : "")
  );
}

/* 6. páginas mais vistas, para saber o que a landing entrega */
{
  const r = await call("runReport", {
    dateRanges: RANGE,
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  });
  console.log("\n=== PÁGINAS MAIS VISTAS");
  for (const row of r.rows ?? []) {
    console.log(
      `  ${row.dimensionValues[0].value.slice(0, 50).padEnd(52)} ${
        row.metricValues[0].value
      }`
    );
  }
}
