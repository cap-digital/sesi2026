import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const PAGES = [
  "/robotica",
  "/robotica/meta",
  "/robotica/display",
  "/robotica/youtube",
  "/jequie",
  "/jequie/ga4",
];
const VIEWPORTS = [
  { name: "z67 ", w: 2039, h: 1146 },
  { name: "z100", w: 1366, h: 768 },
  { name: "z125", w: 1093, h: 614 },
  { name: "z150", w: 911, h: 512 },
  { name: "z200", w: 683, h: 384 },
  { name: "mob ", w: 390, h: 844 },
];

/** coleta os rótulos de dados de cada gráfico e procura sobreposição */
const inspect = () => {
  const svgs = [...document.querySelectorAll("svg.recharts-surface")];
  const report = [];
  for (const svg of svgs) {
    const labels = [
      ...svg.querySelectorAll(
        ".recharts-label-list text, .recharts-pie-labels text"
      ),
    ].map((t) => {
      const r = t.getBoundingClientRect();
      return {
        text: t.textContent,
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
      };
    });

    const collisions = [];
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 0 && oy > 0) {
          collisions.push(
            `"${a.text}"×"${b.text}" ${Math.round(ox)}x${Math.round(oy)}`
          );
        }
      }
    }

    // rótulo escapando da área do gráfico
    const box = svg.getBoundingClientRect();
    const outside = labels.filter(
      (l) =>
        l.left < box.left - 1 ||
        l.right > box.right + 1 ||
        l.top < box.top - 1 ||
        l.bottom > box.bottom + 1
    );

    // rótulo colidindo com os números do eixo
    const ticks = [
      ...svg.querySelectorAll(".recharts-cartesian-axis-tick-value"),
    ].map((t) => t.getBoundingClientRect());
    const overAxis = labels.filter((l) =>
      ticks.some(
        (t) =>
          Math.min(l.right, t.right) - Math.max(l.left, t.left) > 0 &&
          Math.min(l.bottom, t.bottom) - Math.max(l.top, t.top) > 0
      )
    );

    if (labels.length || collisions.length)
      report.push({
        labels: labels.length,
        collisions,
        outside: outside.map((o) => o.text),
        overAxis: overAxis.map((o) => o.text),
      });
  }
  return report;
};

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox", "--disable-gpu"],
});

let bad = 0;
let totalLabels = 0;

for (const vp of VIEWPORTS) {
  const page = await b.newPage();
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  const lines = [];

  for (const route of PAGES) {
    await page.goto("http://localhost:3000" + route, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 800));

    // percorre cada métrica do seletor, pois muda a escala dos rótulos
    const metrics = await page.$$eval(
      '[role="tab"]',
      (els) => els.map((e) => e.textContent.trim()).filter(Boolean)
    );
    const toClick = ["(inicial)", ...metrics.slice(0, 5)];

    for (const m of toClick) {
      if (m !== "(inicial)") {
        const clicked = await page.evaluate((label) => {
          const el = [...document.querySelectorAll('[role="tab"]')].find(
            (e) => e.textContent.trim() === label
          );
          if (!el) return false;
          el.click();
          return true;
        }, m);
        if (!clicked) continue;
        await new Promise((r) => setTimeout(r, 350));
      }

      const report = await page.evaluate(inspect);
      for (const chart of report) {
        totalLabels += chart.labels;
        if (chart.collisions.length || chart.outside.length || chart.overAxis.length) {
          bad++;
          lines.push(
            `  ✗ ${route} [${m}] rótulos=${chart.labels} colisões=${chart.collisions.length} fora=${chart.outside.length} sobre-eixo=${chart.overAxis.length}`
          );
          chart.collisions
            .slice(0, 3)
            .forEach((c) => lines.push(`      colide ${c}`));
          chart.outside.slice(0, 3).forEach((c) => lines.push(`      fora "${c}"`));
          chart.overAxis
            .slice(0, 3)
            .forEach((c) => lines.push(`      sobre eixo "${c}"`));
        }
      }
    }
  }

  console.log(`[${vp.name}] ${vp.w}x${vp.h}${lines.length ? "" : "  ✓"}`);
  lines.forEach((l) => console.log(l));
  await page.close();
}

await b.close();
console.log(
  `\n=== ${bad === 0 ? "OK" : bad + " gráfico(s) com problema"} · ${totalLabels} rótulos medidos ===`
);
