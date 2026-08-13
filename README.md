# Painéis de Mídia — SESI Bahia

Dois dashboards de performance de mídia, com identidade visual própria, sobre uma
home institucional SESI.

| Rota | Campanha | Plataformas | Período |
|---|---|---|---|
| `/robotica` | Olimpíada Brasileira de Robótica 2026 | Meta Ads, Rede Display, YouTube, TikTok | 11/08 – 31/08/2026 |
| `/jequie` | Inauguração Escola SESI Jequié | Meta Ads, Google PMAX | 01/08 – 30/09/2026 |

## Rodando

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start
```

## Estrutura

```
app/
  page.tsx                 home institucional (identidade SESI)
  api/[campaign]/route.ts  proxy das funções Supabase, com cache e retry
  robotica/                sidebar flutuante · overview, metas, 4 plataformas × (visão geral | criativos)
  jequie/                  topbar em pílula · visão geral, plataformas, criativos, metas
lib/
  campaigns.ts             definição das campanhas, plataformas e metas contratadas
  normalize.ts             normaliza as respostas das duas APIs num formato único
  metrics.ts               somas, taxas e custos por objetivo
  goals.ts                 progresso, ritmo esperado e projeção de cada meta
components/                shell, filtros, gráficos, criativos e blocos reutilizáveis
scripts/audit-layout.mjs   auditoria de layout em 10 níveis de zoom
```

## Decisões que valem saber

**Investimento** — todos os valores monetários usam a coluna `Investimento`. A
coluna `spend` não é usada em nenhum cálculo.

**Custos por objetivo** — CPM, CPC, CPE e CPV são sempre calculados dentro do
próprio objetivo: o CPE usa o engajamento e o investimento apenas das campanhas
de engajamento, o CPM apenas das de alcance, e assim por diante. Onde uma taxa
mistura objetivos (o bloco "Taxas da plataforma"), isso está indicado no cartão.

**Métrica de cada objetivo**

| Objetivo | Métrica-alvo | Custo |
|---|---|---|
| Alcance | Impressões | CPM |
| Engajamento | `actions_post_engagement` | CPE |
| Tráfego | Cliques | CPC |
| Views | `video_trueview_views` (YouTube) / thruplay (Meta) | CPV |
| Performance Max | Cliques | CPC |

**Retenção de vídeo** — o funil começa em "25% assistido", porque thruplay e
trueview são contados por outra régua e podem ficar abaixo do primeiro quartil.

**Origem instável** — as funções Supabase respondem entre 3 s e mais de 70 s e às
vezes devolvem HTTP 500. O proxy em `app/api/[campaign]/route.ts` mantém a última
resposta boa em memória, serve na hora e revalida em background; se a origem
falhar, o painel mostra o último dado conhecido com um aviso em vez de quebrar.

**TikTok e Jequié** — as bases ainda não retornam linhas. As metas estão
configuradas e o mapeamento cobre os nomes de coluna prováveis; as telas exibem
estado de espera e populam sozinhas quando a veiculação começar.

## Layout

Baseline 1366×768. `scripts/audit-layout.mjs` percorre as 16 rotas em dez
viewports (equivalentes a zoom de 67% a 250% e mobile) verificando estouro
horizontal, colisão entre blocos, barras flutuantes cortadas e texto abaixo de
10 px:

```bash
npm run start          # em outro terminal
node scripts/audit-layout.mjs
```
