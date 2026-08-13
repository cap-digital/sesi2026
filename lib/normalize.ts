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

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/** Primeiro alias presente na linha (as bases de TikTok/PMAX ainda não estão populadas). */
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
  if (/PMAX|PERFORMANCE ?MAX/.test(c)) return "Performance Max";
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
      pickStr(row, ["adset_name", "ad_group_name", "adgroup_name"]) ?? "—",
    ad: pickStr(row, ["ad_name", "creative_name", "video_title"]) ?? "—",
    creative: null,
    permalink: null,
    videoUrl: null,
    videoTitle: null,
    age: null,
    gender: null,
    investment: pickNum(row, ["Investimento"]),
    impressions: pickNum(row, ["impressions", "impression"]),
    clicks: pickNum(row, ["clicks", "click"]),
    ...EMPTY,
  };
}

function fromMeta(row: Raw): Row {
  const r = base(row, "meta");
  r.creative = pickStr(row, ["thumbnail_url", "image_url"]);
  r.permalink = pickStr(row, [
    "instagram_permalink_url",
    "permalink_url",
    "preview_url",
  ]);
  r.age = pickStr(row, ["age"]);
  r.gender = pickStr(row, ["gender"]);
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
  r.creative = pickStr(row, ["ad_image_ad_image_url", "image_url"]);
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

/** Base do TikTok ainda vazia — mapeamento por aliases prováveis. */
function fromTiktok(row: Raw): Row {
  const r = base(row, "tiktok");
  r.creative = pickStr(row, [
    "thumbnail_url",
    "image_url",
    "video_thumbnail_url",
    "creative_thumbnail_url",
  ]);
  r.videoUrl = pickStr(row, ["video_url", "preview_url", "URL Video"]);
  if (!r.creative) r.creative = youtubeThumb(r.videoUrl);
  r.views = pickNum(row, ["video_views", "video_play_actions", "views"]);
  r.engagement = pickNum(row, [
    "engagements",
    "total_engagement",
    "interactions",
  ]);
  r.reactions = pickNum(row, ["likes", "reactions"]);
  r.comments = pickNum(row, ["comments"]);
  r.shares = pickNum(row, ["shares"]);
  r.linkClicks = pickNum(row, ["actions_link_click", "clicks"]);
  r.p25 = pickNum(row, ["video_views_p25", "video_watched_p25"]);
  r.p50 = pickNum(row, ["video_views_p50", "video_watched_p50"]);
  r.p75 = pickNum(row, ["video_views_p75", "video_watched_p75"]);
  r.p100 = pickNum(row, ["video_views_p100", "video_watched_p100"]);
  return r;
}

/** Base do PMAX (Jequié) ainda vazia — mapeamento por aliases prováveis. */
function fromPmax(row: Raw): Row {
  const r = base(row, "pmax");
  r.creative = pickStr(row, [
    "ad_image_ad_image_url",
    "image_url",
    "asset_image_url",
    "thumbnail_url",
  ]);
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

export function normalize(
  payload: Record<string, unknown>,
  expected: Platform[]
): Dataset {
  const rows: Row[] = [];
  const seen = new Set<Platform>();

  for (const [key, value] of Object.entries(payload)) {
    const mapper = MAPPERS[key];
    if (!mapper || !Array.isArray(value)) continue;
    seen.add(mapper.platform);
    for (const raw of value as Raw[]) {
      if (!raw || typeof raw !== "object") continue;
      const row = mapper.fn(raw);
      if (!row.date) continue;
      rows.push(row);
    }
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const withData = new Set(rows.map((r) => r.platform));
  const emptyPlatforms = expected.filter((p) => !withData.has(p));

  const ts = typeof payload.timestamp === "string" ? payload.timestamp : "";
  const today = toDay(ts) || rows[rows.length - 1]?.date || "";

  return {
    rows,
    today,
    fetchedAt: ts,
    emptyPlatforms,
  };
}
