"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CampaignDef } from "@/lib/campaigns";
import { PRESETS, daysBetween, matchPreset, type Range } from "@/lib/dates";
import { sumRows } from "@/lib/metrics";
import { normalize } from "@/lib/normalize";
import type { Dataset, Platform, Row, Totals } from "@/lib/types";

interface Ctx {
  campaign: CampaignDef;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  today: string;
  fetchedAt: string;
  emptyPlatforms: Platform[];
  /** blocos da resposta sem mapeamento (plataforma nova na origem) */
  unknownSources: { key: string; rows: number }[];
  /**
   * Janela navegável: o período contratado esticado pelos dados que existem.
   * Se a campanha for prorrogada ou vier linha antes do início, nada fica
   * invisível — o filtro passa a cobrir sozinho.
   */
  window: Range;
  /** origem falhou e estamos servindo o último dado conhecido */
  stale: boolean;
  range: Range;
  presetId: string | null;
  setRange: (r: Range) => void;
  applyPreset: (id: string) => void;
  /** linhas dentro do período selecionado */
  rows: Row[];
  /** todas as linhas da campanha (usado nas metas acumuladas) */
  allRows: Row[];
  days: string[];
  totals: Totals;
  refresh: () => void;
}

const DashContext = createContext<Ctx | null>(null);

export function useDash() {
  const ctx = useContext(DashContext);
  if (!ctx) throw new Error("useDash precisa estar dentro de <DataProvider>");
  return ctx;
}

export function DataProvider({
  campaign,
  children,
}: {
  campaign: CampaignDef;
  children: React.ReactNode;
}) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [range, setRange] = useState<Range | null>(null);
  /** preset escolhido explicitamente — vence o casamento por datas, já que
   *  intervalos diferentes podem coincidir (7 dias × todo o período) */
  const [chosenPreset, setChosenPreset] = useState<string | null>("all");

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      try {
        const res = await fetch(
          `/api/${campaign.id}${isRefresh ? "?force=1" : ""}`,
          { cache: isRefresh ? "no-store" : "default" }
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          throw new Error(json?.error ?? `HTTP ${res.status}`);
        }
        setDataset(normalize(json, campaign.platforms.map((p) => p.id)));
        setStale(json?._stale === true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "falha ao carregar");
      } finally {
        setRefreshing(false);
      }
    },
    [campaign]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const today = dataset?.today || campaign.window.end;

  /** janela contratada esticada pelo que a base realmente tem */
  const window = useMemo<Range>(() => {
    const start =
      dataset?.firstDate && dataset.firstDate < campaign.window.start
        ? dataset.firstDate
        : campaign.window.start;
    const end =
      dataset?.lastDate && dataset.lastDate > campaign.window.end
        ? dataset.lastDate
        : campaign.window.end;
    return { start, end };
  }, [dataset?.firstDate, dataset?.lastDate, campaign.window]);

  // período inicial: todo o período disponível
  useEffect(() => {
    if (dataset && !range) {
      setRange(PRESETS[3].build({ today: dataset.today, window }));
    }
  }, [dataset, range, window]);

  const effectiveRange: Range = useMemo(
    () => range ?? { start: window.start, end: today },
    [range, window.start, today]
  );

  const allRows = useMemo(() => dataset?.rows ?? [], [dataset]);

  const rows = useMemo(
    () =>
      allRows.filter(
        (r) => r.date >= effectiveRange.start && r.date <= effectiveRange.end
      ),
    [allRows, effectiveRange]
  );

  const days = useMemo(
    () => daysBetween(effectiveRange.start, effectiveRange.end),
    [effectiveRange]
  );

  const totals = useMemo(() => sumRows(rows), [rows]);

  const matched = useMemo(
    () => matchPreset(effectiveRange, { today, window }),
    [effectiveRange, today, window]
  );
  const presetId = chosenPreset ?? matched;

  const applyPreset = useCallback(
    (id: string) => {
      const preset = PRESETS.find((p) => p.id === id);
      if (!preset) return;
      setChosenPreset(id);
      setRange(preset.build({ today, window }));
    },
    [today, window]
  );

  /** datas escolhidas à mão limpam o preset ativo */
  const setRangeManual = useCallback((r: Range) => {
    setChosenPreset(null);
    setRange(r);
  }, []);

  const value: Ctx = {
    campaign,
    loading: !dataset && !error,
    refreshing,
    error,
    today,
    fetchedAt: dataset?.fetchedAt ?? "",
    emptyPlatforms: dataset?.emptyPlatforms ?? [],
    unknownSources: dataset?.unknownSources ?? [],
    window,
    stale,
    range: effectiveRange,
    presetId,
    setRange: setRangeManual,
    applyPreset,
    rows,
    allRows,
    days,
    totals,
    refresh: () => load(true),
  };

  return <DashContext.Provider value={value}>{children}</DashContext.Provider>;
}

/** Atalho: linhas do período já filtradas por plataforma. */
export function usePlatformRows(platform: Platform) {
  const { rows, allRows } = useDash();
  return useMemo(
    () => ({
      rows: rows.filter((r) => r.platform === platform),
      allRows: allRows.filter((r) => r.platform === platform),
    }),
    [rows, allRows, platform]
  );
}
