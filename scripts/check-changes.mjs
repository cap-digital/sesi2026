import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 1366, height: 768 });

const load = async (route) => {
  await p.goto("http://localhost:3000" + route, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));
};

/* 1. banner de resumo + previews nas páginas de criativos */
for (const route of [
  "/robotica/youtube/criativos",
  "/robotica/meta/criativos",
  "/robotica/display/criativos",
  "/jequie/criativos",
]) {
  await load(route);
  const info = await p.evaluate(() => {
    const banner = [...document.querySelectorAll("main div")].find((d) =>
      /Resumo dos criativos/.test(d.textContent || "")
    );
    const stats = banner
      ? [...banner.querySelectorAll("p")].map((x) => x.textContent.trim())
      : [];
    const imgs = [...document.querySelectorAll("main img")].map((i) => ({
      src: i.currentSrc || i.src,
      loaded: i.complete && i.naturalWidth > 0,
      nat: `${i.naturalWidth}x${i.naturalHeight}`,
      shown: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(
        i.getBoundingClientRect().height
      )}`,
    }));
    const cards = document.querySelectorAll("main article, main .group").length;
    return { stats, imgs, cards };
  });
  console.log(`\n=== ${route}`);
  console.log("  banner:", info.stats.join(" | ") || "AUSENTE");
  console.log("  previews:", info.imgs.length);
  for (const i of info.imgs.slice(0, 4)) {
    console.log(
      `    ${i.loaded ? "✓" : "✗"} ${i.nat} exibida ${i.shown}  ${i.src.slice(0, 92)}`
    );
  }
  const broken = info.imgs.filter((i) => !i.loaded).length;
  if (broken) console.log(`    ⚠ ${broken} preview(s) sem carregar`);
}

/* 2. topbar do Jequié centralizada */
await load("/jequie");
const pill = await p.evaluate(() => {
  const el = [...document.querySelectorAll("div")].find(
    (d) =>
      d.className.includes("rounded-pill") &&
      d.className.includes("shadow-float") &&
      /Visão geral/.test(d.textContent || "")
  );
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    left: Math.round(r.left),
    right: Math.round(r.right),
    width: Math.round(r.width),
    vw: window.innerWidth,
    gapEsq: Math.round(r.left),
    gapDir: Math.round(window.innerWidth - r.right),
  };
});
console.log("\n=== topbar Jequié");
if (!pill) console.log("  pílula não encontrada");
else {
  const diff = Math.abs(pill.gapEsq - pill.gapDir);
  console.log(
    `  largura ${pill.width}px · margem esq ${pill.gapEsq} · dir ${pill.gapDir} · ${
      diff <= 2 ? "✓ centralizada" : `✗ fora de centro (${diff}px)`
    }`
  );
}

await b.close();
