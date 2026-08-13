import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const ROUTES = [
  "/",
  "/robotica",
  "/robotica/metas",
  "/robotica/meta",
  "/robotica/meta/criativos",
  "/robotica/display",
  "/robotica/display/criativos",
  "/robotica/youtube",
  "/robotica/youtube/criativos",
  "/robotica/tiktok",
  "/robotica/tiktok/criativos",
  "/jequie",
  "/jequie/meta",
  "/jequie/pmax",
  "/jequie/criativos",
  "/jequie/metas",
];

/** tela 1366x768 em vários zooms -> viewport CSS equivalente */
const VIEWPORTS = [
  { name: "z67 ", w: 2039, h: 1146 },
  { name: "z80 ", w: 1707, h: 960 },
  { name: "z100", w: 1366, h: 768 },
  { name: "z110", w: 1242, h: 698 },
  { name: "z125", w: 1093, h: 614 },
  { name: "z150", w: 911, h: 512 },
  { name: "z175", w: 781, h: 439 },
  { name: "z200", w: 683, h: 384 },
  { name: "z250", w: 546, h: 307 },
  { name: "mob ", w: 390, h: 844 },
];

const audit = () => {
  const vw = window.innerWidth;
  const out = {
    overflowX: document.documentElement.scrollWidth - vw,
    offenders: [],
    collisions: [],
    clippedSticky: [],
    tinyText: [],
  };

  const scrollableAncestor = (el) => {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const s = getComputedStyle(p);
      if (/auto|scroll|hidden/.test(s.overflowX)) return true;
      p = p.parentElement;
    }
    return false;
  };

  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    if ((r.right > vw + 1.5 || r.left < -1.5) && !scrollableAncestor(el)) {
      out.offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || "").slice(0, 64),
        box: `${Math.round(r.left)}..${Math.round(r.right)}`,
      });
    }

    // barra flutuante cortada pela borda de cima
    const pos = getComputedStyle(el).position;
    if ((pos === "sticky" || pos === "fixed") && r.top < -1 && r.height < 200) {
      out.clippedSticky.push({
        cls: String(el.className || "").slice(0, 64),
        top: Math.round(r.top),
      });
    }

    if (!el.childElementCount && String(el.textContent || "").trim()) {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs > 0 && fs < 10)
        out.tinyText.push(
          `${fs}px "${String(el.textContent).trim().slice(0, 24)}"`
        );
    }
  }

  // colisão entre irmãos no fluxo normal (sobreposição de verdade)
  const blocks = [
    ...document.querySelectorAll(
      "main h1, main h2, main h3, main table, main dl, main ul"
    ),
  ].filter((el) => {
    const p = getComputedStyle(el).position;
    return p === "static" || p === "relative";
  });
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (!ra.width || !rb.width) continue;
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 6 && oy > 6) {
        out.collisions.push({
          a: a.tagName + ":" + String(a.textContent || "").trim().slice(0, 20),
          b: b.tagName + ":" + String(b.textContent || "").trim().slice(0, 20),
          size: `${Math.round(ox)}x${Math.round(oy)}`,
        });
      }
    }
  }

  return out;
};

const newBrowser = () =>
  puppeteer.launch({
    executablePath: CHROME,
    headless: "shell",
    args: ["--no-sandbox", "--disable-gpu"],
  });

let failures = 0;
for (const vp of VIEWPORTS) {
  const browser = await newBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  const lines = [];
  for (const route of ROUTES) {
    let top, low;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto(`http://localhost:3000${route}`, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });
        await new Promise((r) => setTimeout(r, 400));
        top = await page.evaluate(audit);
        await page.evaluate(() => window.scrollTo(0, 700));
        await new Promise((r) => setTimeout(r, 250));
        low = await page.evaluate(audit);
        break;
      } catch (err) {
        if (attempt === 1) {
          console.log(`  ! ${route} — falha do navegador: ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    if (!top || !low) continue;

    const problems = [];
    if (top.overflowX > 1) problems.push(`overflowX=${top.overflowX}px`);
    if (top.offenders.length)
      problems.push(`estouram=${top.offenders.length}`);
    if (top.collisions.length || low.collisions.length)
      problems.push(
        `colisões=${top.collisions.length + low.collisions.length}`
      );
    if (low.clippedSticky.length)
      problems.push(`flutuante cortada=${low.clippedSticky.length}`);
    if (top.tinyText.length) problems.push(`texto<10px=${top.tinyText.length}`);

    if (problems.length) {
      failures++;
      lines.push(`  ✗ ${route} — ${problems.join(", ")}`);
      for (const o of top.offenders.slice(0, 2))
        lines.push(`      estoura <${o.tag}> ${o.cls} [${o.box}]`);
      for (const c of [...top.collisions, ...low.collisions].slice(0, 2))
        lines.push(`      colide ${c.a} × ${c.b} (${c.size})`);
      for (const s of low.clippedSticky.slice(0, 2))
        lines.push(`      cortada top=${s.top} ${s.cls}`);
      for (const t of top.tinyText.slice(0, 2)) lines.push(`      ${t}`);
    }
  }
  console.log(`[${vp.name}] ${vp.w}x${vp.h}${lines.length ? "" : "  ✓"}`);
  lines.forEach((l) => console.log(l));
  await browser.close();
}
console.log(
  `\n=== ${failures === 0 ? "OK: nenhuma quebra" : failures + " rota(s)/zoom com quebra"} ===`
);
