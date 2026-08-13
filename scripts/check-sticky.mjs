import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 1366, height: 768 });

const probe = () =>
  p.evaluate(() => {
    const find = (pred) => [...document.querySelectorAll("div")].find(pred);
    const pill = find(
      (d) =>
        d.className.includes("shadow-float") &&
        d.className.includes("rounded-pill") &&
        /Visão geral|Overview/.test(d.textContent || "")
    );
    const filters = find((d) => /Últimos 15 dias/.test(d.textContent || "") &&
      d.className.includes("rounded-card"));
    const box = (el) =>
      el
        ? {
            top: Math.round(el.getBoundingClientRect().top),
            visivel:
              el.getBoundingClientRect().bottom > 0 &&
              el.getBoundingClientRect().top < window.innerHeight,
          }
        : null;
    return { y: Math.round(window.scrollY), pill: box(pill), filtros: box(filters) };
  });

for (const route of ["/jequie", "/robotica"]) {
  await p.goto("http://localhost:3000" + route, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 900));
  console.log(`\n=== ${route}`);
  for (const y of [0, 400, 1200]) {
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await new Promise((r) => setTimeout(r, 300));
    const s = await probe();
    console.log(
      `  scroll ${String(s.y).padStart(4)} → topbar top=${s.pill?.top} visível=${s.pill?.visivel} | filtro top=${s.filtros?.top} visível=${s.filtros?.visivel}`
    );
  }
}

await b.close();
