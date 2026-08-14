/**
 * Verifica que o painel absorve sozinho o que aparecer na base:
 * dias novos (inclusive fora do período contratado), campanhas novas,
 * objetivos novos e blocos de plataforma que ainda não têm mapeamento.
 *
 *   node --experimental-strip-types scripts/test-dynamic.ts
 */
import { normalize } from "../lib/normalize.ts";
import { byObjective, sumRows } from "../lib/metrics.ts";
import { ROBOTICA } from "../lib/campaigns.ts";
import { PRESETS } from "../lib/dates.ts";

let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`  ${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
};

const day = (d: string) => `${d}T03:00:00.000Z`;

/* ------------------------------------------------------------------ */
console.log("\n1. dia além do período contratado (campanha prorrogada)");
{
  const payload = {
    success: true,
    timestamp: day("2026-09-03"),
    meta: [
      {
        date: day("2026-08-12"),
        campaign: "[SESI] [ALCANCE]",
        Investimento: 100,
        impressions: 1000,
        clicks: 10,
      },
      {
        date: day("2026-09-03"), // fora do fim contratado (31/08)
        campaign: "[SESI] [ALCANCE]",
        Investimento: 50,
        impressions: 500,
        clicks: 5,
      },
    ],
  };
  const ds = normalize(payload, ["meta"]);
  check("as duas linhas foram lidas", ds.rows.length === 2);
  check("lastDate acompanha o dado novo", ds.lastDate === "2026-09-03", ds.lastDate);

  // a janela navegável é a contratada esticada pelos dados
  const window = {
    start:
      ds.firstDate < ROBOTICA.window.start ? ds.firstDate : ROBOTICA.window.start,
    end: ds.lastDate > ROBOTICA.window.end ? ds.lastDate : ROBOTICA.window.end,
  };
  check("janela estica até o dado novo", window.end === "2026-09-03", window.end);

  const all = PRESETS.find((p) => p.id === "all")!.build({
    today: ds.today,
    window,
  });
  const visible = ds.rows.filter(
    (r) => r.date >= all.start && r.date <= all.end
  );
  check(
    "\"todo o período\" inclui o dia de setembro",
    visible.length === 2,
    `${visible.length} de 2`
  );
  check(
    "investimento somado bate",
    sumRows(visible).investment === 150,
    String(sumRows(visible).investment)
  );
}

/* ------------------------------------------------------------------ */
console.log("\n2. linha anterior ao início contratado");
{
  const ds = normalize(
    {
      timestamp: day("2026-08-12"),
      meta: [
        {
          date: day("2026-08-05"), // antes de 11/08
          campaign: "[SESI] [ALCANCE]",
          Investimento: 20,
          impressions: 200,
        },
      ],
    },
    ["meta"]
  );
  const window = {
    start:
      ds.firstDate < ROBOTICA.window.start ? ds.firstDate : ROBOTICA.window.start,
    end: ds.lastDate > ROBOTICA.window.end ? ds.lastDate : ROBOTICA.window.end,
  };
  check("janela recua até o dado antigo", window.start === "2026-08-05", window.start);
}

/* ------------------------------------------------------------------ */
console.log("\n3. campanha e objetivo novos na mesma plataforma");
{
  const ds = normalize(
    {
      timestamp: day("2026-08-14"),
      meta: [
        {
          date: day("2026-08-14"),
          campaign: "[SESI] [ALCANCE]",
          Investimento: 10,
          impressions: 1000,
        },
        {
          date: day("2026-08-14"),
          campaign: "[SESI] [TRAFEGO] [NOVA]",
          Investimento: 30,
          impressions: 300,
          clicks: 60,
        },
        {
          date: day("2026-08-14"),
          campaign: "[SESI] [CONVERSAO] [NOVA]",
          Investimento: 40,
          impressions: 400,
          clicks: 8,
        },
      ],
    },
    ["meta"]
  );
  const slices = byObjective(ds.rows);
  const names = slices.map((s) => s.objective);
  check(
    "objetivo de conversão é reconhecido",
    names.includes("Conversão"),
    names.join(", ")
  );

  const trafego = slices.find((s) => s.objective === "Tráfego")!;
  check(
    "CPC do tráfego usa só o investimento dele",
    trafego.costValue === 0.5,
    `R$ ${trafego.costValue}`
  );
  const alcance = slices.find((s) => s.objective === "Alcance")!;
  check(
    "CPM do alcance usa só o investimento dele",
    alcance.costValue === 10,
    `R$ ${alcance.costValue}`
  );
}

/* ------------------------------------------------------------------ */
console.log("\n3b. dois objetivos desconhecidos não dividem cartão de custo");
{
  const ds = normalize(
    {
      timestamp: day("2026-08-14"),
      meta: [
        {
          date: day("2026-08-14"),
          campaign: "[SESI] [SEM PALAVRA CONHECIDA A]",
          Investimento: 100,
          impressions: 1000,
        },
        {
          date: day("2026-08-14"),
          campaign: "[SESI] [SEM PALAVRA CONHECIDA B]",
          Investimento: 300,
          impressions: 1000,
        },
      ],
    },
    ["meta"]
  );
  const slices = byObjective(ds.rows);
  check("cada campanha desconhecida vira seu próprio cartão", slices.length === 2, `${slices.length} cartões`);
  const cpms = slices.map((s) => s.costValue).sort((a, b) => a - b);
  check(
    "os CPMs não se misturam",
    cpms[0] === 100 && cpms[1] === 300,
    cpms.join(" e ")
  );
}

/* ------------------------------------------------------------------ */
console.log("\n4. bloco de plataforma sem mapeamento");
{
  const ds = normalize(
    {
      timestamp: day("2026-08-14"),
      meta: [
        {
          date: day("2026-08-14"),
          campaign: "[SESI] [ALCANCE]",
          Investimento: 10,
          impressions: 100,
        },
      ],
      linkedin: [{ date: day("2026-08-14"), campaign: "[SESI] [X]", spend: 5 }],
    },
    ["meta"]
  );
  check("origem nova é registrada", ds.unknownSources.length === 1);
  check(
    "com nome e contagem",
    ds.unknownSources[0]?.key === "linkedin" && ds.unknownSources[0]?.rows === 1,
    JSON.stringify(ds.unknownSources)
  );
  check("não contamina os totais", ds.rows.length === 1);
}

/* ------------------------------------------------------------------ */
console.log("\n5. coluna de investimento quebrada não vira zero silencioso");
{
  const ds = normalize(
    {
      timestamp: day("2026-08-14"),
      meta: [
        {
          date: day("2026-08-14"),
          campaign: "[SESI] [TRAFEGO]",
          Investimento: "#N/A",
          impressions: 100,
          clicks: 10,
        },
      ],
    },
    ["meta"]
  );
  const t = sumRows(ds.rows);
  check("linha marcada como não informada", t.investmentMissing === 1);
  check("investimento fica em zero, não inventado", t.investment === 0);
}

console.log(
  `\n=== ${failures === 0 ? "OK: comportamento dinâmico confirmado" : failures + " verificação(ões) falharam"} ===`
);
process.exit(failures === 0 ? 0 : 1);
