import type { Dataset, Objective, Platform, Row } from "./types";

type Raw = Record<string, unknown>;

/** Converte qualquer coisa vinda da planilha em número seguro. */
export function num(v: unknown): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  const s = v.trim();
  if (!s) return 0;
  // aceita "1.234,56" e "1234.56"
  const normalized =
    s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return isFinite(n) ? n : 0;
}

/** célula de erro de planilha: #N/A, #REF!, #DIV/0! ... */
function isErrorCell(v: unknown): boolean {
  return (
    typeof v === "string" &&
    /^#(N\/A|REF!|DIV\/0!|VALUE!|NAME\?|NULL!|NUM!)/i.test(v.trim())
  );
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/** URLs de criativo em http quebram por conteúdo misto numa página https */
function secureUrl(v: string | null): string | null {
  return v ? v.replace(/^http:\/\//i, "https://") : v;
}

/**
 * O PMAX entrega a peça como link de compartilhamento do Drive, que devolve
 * HTML e não serve para <img>. Converte para o endpoint de imagem direta.
 */
export function driveImage(url: string | null): string | null {
  if (!url) return null;
  const id = url.match(
    /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=|thumbnail\?(?:[^#]*&)?id=)|lh3\.googleusercontent\.com\/d\/)([\w-]{20,})/
  )?.[1];
  return id ? `https://lh3.googleusercontent.com/d/${id}=w600` : url;
}

/** fallback de imagem do Drive, quando o endpoint do lh3 falha */
export function driveImageFallback(url: string): string | null {
  const id = url.match(/lh3\.googleusercontent\.com\/d\/([\w-]{20,})/)?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w600` : null;
}

/**
 * Gênero: o Meta entrega "male"/"female", o TikTok "MALE"/"FEMALE".
 * Normaliza para uma chave só, para os gráficos somarem as duas bases.
 */
function normGender(v: unknown): string | null {
  const s = str(v)?.toLowerCase();
  if (!s) return null;
  if (s.startsWith("f")) return "female";
  if (s.startsWith("m")) return "male";
  return "unknown";
}

/**
 * Faixa etária: o Meta entrega "18-24"/"65+", o TikTok "AGE_18_24"/"AGE_55_100".
 * Normaliza para o formato do Meta.
 */
function normAge(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const m = s.match(/(\d+)\D+(\d+)/);
  if (m) {
    const [, from, to] = m;
    return Number(to) >= 65 ? `${from}+` : `${from}-${to}`;
  }
  if (/^\d+\+$/.test(s)) return s;
  if (/unknown|desconhec/i.test(s)) return "Não informado";
  return s;
}

/** Primeiro alias presente na linha — as bases variam de nome entre plataformas. */
function pick(row: Raw, aliases: string[]): unknown {
  for (const a of aliases) {
    if (a in row && row[a] !== "" && row[a] !== null && row[a] !== undefined) {
      return row[a];
    }
  }
  return undefined;
}

const pickNum = (row: Raw, aliases: string[]) => num(pick(row, aliases));
const pickStr = (row: Raw, aliases: string[]) => str(pick(row, aliases));

/** Datas chegam como 2026-08-11T03:00:00.000Z (meia-noite de Brasília). */
function toDay(v: unknown): string {
  const s = typeof v === "string" ? v : "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

/** A base tem nomes de campanha com prefixo sujo, ex. "2[SESI] [...]". */
function cleanCampaign(v: unknown): string {
  const s = (typeof v === "string" ? v : "").trim();
  const bracket = s.indexOf("[");
  const cleaned = bracket > 0 ? s.slice(bracket) : s;
  return cleaned.replace(/\s{2,}/g, " ").trim() || "—";
}

function detectObjective(campaign: string, platform: Platform): Objective {
  const c = campaign.toUpperCase();
  if (platform === "pmax") return "Performance Max";
  if (/ALCANCE|REACH/.test(c)) return "Alcance";
  if (/ENGAJAMENTO|ENGAGEMENT/.test(c)) return "Engajamento";
  if (/TR[ÁA]FEGO|TRAFFIC|LINK.?CLICK/.test(c)) return "Tráfego";
  if (/VIEW|VISUALIZA|VIDEO/.test(c)) return "Views";
  if (/CONVERS|LEAD|CADASTR|MATR[ÍI]CULA|INSCRI/.test(c)) return "Conversão";
  if (/PMAX|PERFORMANCE ?MAX/.test(c)) return "Performance Max";
  // TikTok e Display são comprados por impressão; sem palavra-chave, alcance
  if (platform === "tiktok" || platform === "display") return "Alcance";
  return "Outros";
}

const EMPTY = {
  linkClicks: 0,
  engagement: 0,
  views: 0,
  reactions: 0,
  comments: 0,
  saves: 0,
  shares: 0,
  p25: 0,
  p50: 0,
  p75: 0,
  p100: 0,
};

function base(row: Raw, platform: Platform): Row {
  const campaign = cleanCampaign(row.campaign);
  return {
    date: toDay(row.date),
    platform,
    campaign,
    objective: detectObjective(campaign, platform),
    adset:
      pickStr(row, [
        "adset_name",
        "ad_group_name",
        "asset_group_name",
        "adgroup_name",
      ]) ?? "—",
    ad:
      pickStr(row, ["ad_name", "asset_name", "creative_name", "video_title"]) ??
      "Sem peça identificada",
    creative: null,
    permalink: null,
    videoUrl: null,
    videoTitle: null,
    age: null,
    gender: null,
    investment: pickNum(row, ["Investimento"]),
    // a origem às vezes devolve #N/A: 0 aqui significa "não informado",
    // não "não houve investimento"
    investmentMissing: isErrorCell(row.Investimento),
    impressions: pickNum(row, ["impressions", "impression"]),
    clicks: pickNum(row, ["clicks", "click"]),
    ...EMPTY,
  };
}

function fromMeta(row: Raw): Row {
  const r = base(row, "meta");
  r.creative = secureUrl(pickStr(row, ["thumbnail_url", "image_url"]));
  r.permalink = pickStr(row, [
    "instagram_permalink_url",
    "permalink_url",
    "preview_url",
  ]);
  r.age = normAge(row.age);
  r.gender = normGender(row.gender);
  r.linkClicks = pickNum(row, ["actions_link_click"]);
  r.engagement = pickNum(row, ["actions_post_engagement"]);
  r.reactions = pickNum(row, ["actions_post_reaction"]);
  r.comments = pickNum(row, ["actions_comment"]);
  r.saves = pickNum(row, ["actions_onsite_conversion_post_save"]);
  r.shares = pickNum(row, ["actions_post"]);
  r.views = pickNum(row, ["video_thruplay_watched_actions_video_view"]);
  r.p25 = pickNum(row, ["video_p25_watched_actions_video_view"]);
  r.p50 = pickNum(row, ["video_p50_watched_actions_video_view"]);
  r.p75 = pickNum(row, ["video_p75_watched_actions_video_view"]);
  r.p100 = pickNum(row, ["video_p100_watched_actions_video_view"]);
  return r;
}

function fromDisplay(row: Raw): Row {
  const r = base(row, "display");
  r.creative = secureUrl(pickStr(row, ["ad_image_ad_image_url", "image_url"]));
  r.linkClicks = r.clicks;
  return r;
}

/** Extrai o ID do vídeo de qualquer formato de URL do YouTube. */
export function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/shorts\/([\w-]{6,})/i,
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/i,
    /youtube\.com\/embed\/([\w-]{6,})/i,
    /youtube\.com\/live\/([\w-]{6,})/i,
    /youtu\.be\/([\w-]{6,})/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Thumbnail do vídeo — serve de preview do criativo.
 * `oardefault` mantém a proporção original (bom para Shorts vertical);
 * `hqdefault` é o fallback garantido (ver Thumb em components/Creatives.tsx).
 */
export function youtubeThumb(url: string | null): string | null {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/oardefault.jpg` : null;
}

function fromYoutube(row: Raw): Row {
  const r = base(row, "youtube");
  r.videoUrl = pickStr(row, ["URL Video", "video_url"]);
  r.videoTitle = pickStr(row, ["video_title"]);
  r.creative = pickStr(row, ["thumbnail_url"]) ?? youtubeThumb(r.videoUrl);
  if (r.videoTitle) r.ad = `${r.ad} · ${r.videoTitle}`;
  r.engagement = pickNum(row, ["engagements"]);
  r.views = pickNum(row, ["video_trueview_views", "video_views", "views"]);
  r.linkClicks = r.clicks;
  // o Google entrega quartis como taxa sobre impressões
  const rate = (k: string) => pickNum(row, [k]) * r.impressions;
  r.p25 = rate("video_quartile25_rate");
  r.p50 = rate("video_quartile50_rate");
  r.p75 = rate("video_quartile75_rate");
  r.p100 = rate("video_quartile100_rate");
  return r;
}

function fromTiktok(row: Raw): Row {
  const r = base(row, "tiktok");
  r.creative = secureUrl(
    pickStr(row, [
      "video_thumbnail_url",
      "thumbnail_url",
      "image_url",
      "creative_thumbnail_url",
    ])
  );
  r.videoUrl = pickStr(row, ["video_url", "preview_url", "URL Video"]);
  r.age = normAge(row.age);
  r.gender = normGender(row.gender);
  // o TikTok não entrega "views": a reprodução de 2s é o proxy padrão
  r.views = pickNum(row, [
    "video_views",
    "video_play_actions",
    "views",
    "play_duration_2s",
  ]);
  r.engagement = pickNum(row, [
    "engagements",
    "total_engagement",
    "interactions",
  ]);
  r.reactions = pickNum(row, ["likes", "reactions"]);
  r.comments = pickNum(row, ["comments"]);
  r.shares = pickNum(row, ["shares"]);
  r.linkClicks = pickNum(row, ["actions_link_click", "clicks"]);
  r.p25 = pickNum(row, ["play_first_quartile", "video_views_p25"]);
  r.p50 = pickNum(row, ["play_midpoint", "video_views_p50"]);
  r.p75 = pickNum(row, ["play_third_quartile", "video_views_p75"]);
  r.p100 = pickNum(row, ["play_over", "video_views_p100"]);
  return r;
}

function fromPmax(row: Raw): Row {
  const r = base(row, "pmax");
  // a peça vem como link do Drive, que precisa virar imagem direta
  r.creative = driveImage(
    secureUrl(
      pickStr(row, [
        "thumbnail",
        "ad_image_ad_image_url",
        "image_url",
        "asset_image_url",
        "thumbnail_url",
      ])
    )
  );
  r.videoUrl = pickStr(row, ["URL Video", "video_url"]);
  if (!r.creative) r.creative = youtubeThumb(r.videoUrl);
  r.engagement = pickNum(row, ["engagements", "interactions"]);
  r.views = pickNum(row, ["video_trueview_views", "video_views", "views"]);
  r.linkClicks = r.clicks;
  return r;
}

const MAPPERS: Record<string, { platform: Platform; fn: (r: Raw) => Row }> = {
  meta: { platform: "meta", fn: fromMeta },
  rede_display: { platform: "display", fn: fromDisplay },
  display: { platform: "display", fn: fromDisplay },
  youtube: { platform: "youtube", fn: fromYoutube },
  tiktok: { platform: "tiktok", fn: fromTiktok },
  google: { platform: "pmax", fn: fromPmax },
  pmax: { platform: "pmax", fn: fromPmax },
};

/**
 * Peças em que o preview da plataforma vem errado, servidas do arquivo local.
 *
 * O casamento é por plataforma + objetivo + nome do anúncio, de propósito: o
 * mesmo anúncio roda em mais de um conjunto, e todos devem receber a troca.
 * Não entra o conjunto na chave justamente para não precisar repetir a regra.
 */
const CREATIVE_OVERRIDES: {
  platform: Platform;
  objective?: Objective;
  ad: string;
  src: string;
}[] = [
  {
    // o Meta devolve aqui um proxy de imagem do sympla.com.br
    platform: "meta",
    objective: "Alcance",
    ad: "[AD 01] NOVA ESCOLA - 13.08",
    src: "/criativos/meta-alcance-nova-escola-13-08.png",
  },
];

function applyCreativeOverride(row: Row): Row {
  const ad = row.ad.trim().toUpperCase();
  const hit = CREATIVE_OVERRIDES.find(
    (o) =>
      o.platform === row.platform &&
      (!o.objective || o.objective === row.objective) &&
      o.ad.toUpperCase() === ad
  );
  if (hit) row.creative = hit.src;
  return row;
}

export function normalize(
  payload: Record<string, unknown>,
  expected: Platform[]
): Dataset {
  const rows: Row[] = [];
  const seen = new Set<Platform>();
  const unknownSources: { key: string; rows: number }[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (!Array.isArray(value)) continue;
    const mapper = MAPPERS[key];
    if (!mapper) {
      // plataforma nova na origem: registra para a tela avisar
      if (value.length) unknownSources.push({ key, rows: value.length });
      continue;
    }
    seen.add(mapper.platform);
    for (const raw of value as Raw[]) {
      if (!raw || typeof raw !== "object") continue;
      const row = applyCreativeOverride(mapper.fn(raw));
      if (!row.date) continue;
      rows.push(row);
    }
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const withData = new Set(rows.map((r) => r.platform));
  const emptyPlatforms = expected.filter((p) => !withData.has(p));

  const ts = typeof payload.timestamp === "string" ? payload.timestamp : "";
  const firstDate = rows[0]?.date ?? "";
  const lastDate = rows[rows.length - 1]?.date ?? "";
  const today = toDay(ts) || lastDate;

  return {
    rows,
    today,
    fetchedAt: ts,
    emptyPlatforms,
    firstDate,
    lastDate,
    unknownSources,
  };
}
