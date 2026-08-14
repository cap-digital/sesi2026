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

O objetivo sai do nome da campanha. TikTok e Rede Display são compra por
impressão: quando o nome não traz palavra-chave, valem como Alcance.

**Colunas por plataforma** — cada origem nomeia as coisas do seu jeito;
`lib/normalize.ts` converte tudo para um formato único.

| | Meta | Rede Display | YouTube | TikTok |
|---|---|---|---|---|
| criativo | `thumbnail_url` | `ad_image_ad_image_url` | derivado da URL do vídeo | `video_thumbnail_url` |
| visualizações | thruplay | — | `video_trueview_views` | `play_duration_2s` |
| quartis | `video_p25…p100` | — | taxas × impressões | `play_first_quartile`, `play_midpoint`, `play_third_quartile`, `play_over` |
| idade | `18-24` | — | — | `AGE_18_24` |
| gênero | `male` | — | — | `MALE` |

Idade e gênero são normalizados para o formato do Meta, e URLs de criativo em
`http` sobem para `https` (o TikTok entrega em `http`, que a página bloquearia
por conteúdo misto).

**Retenção de vídeo** — o funil começa em "25% assistido", porque thruplay e
trueview são contados por outra régua e podem ficar abaixo do primeiro quartil.

**Rótulos de dados** — os gráficos rotulam o total acima da barra e o valor
dentro de cada segmento, sempre em formato curto. O rótulo só é desenhado
quando cabe: o componente mede a largura real do container, calcula o espaço
por barra e rareia ou omite quando dois rótulos se tocariam. Dentro da barra a
cor do texto é escolhida por contraste sobre a cor da série.

**Origem instável** — as funções Supabase respondem entre 3 s e mais de 70 s e às
vezes devolvem HTTP 500. O proxy em `app/api/[campaign]/route.ts` mantém a última
resposta boa em memória, serve na hora e revalida em background; se a origem
falhar, o painel mostra o último dado conhecido com um aviso em vez de quebrar.

**Investimento não informado** — a origem às vezes devolve `#N/A` na coluna
Investimento. Nesse caso o painel mostra "—", nunca R$ 0,00, e avisa na
campanha afetada: a entrega segue contabilizada, mas o custo fica indisponível
até o valor ser corrigido na origem.

**PMAX** — a peça vem como link de compartilhamento do Drive, que devolve HTML.
`driveImage()` converte para o endpoint de imagem direta (`lh3` com fallback
para `drive.google.com/thumbnail`).

**TikTok** — a compra é por impressão e a peça é vídeo, então a visão geral
destaca CPM e VTR no lugar de cliques e CTR, a tabela de campanhas troca
cliques/CTR por visualizações/CPM, e o cartão de taxas da plataforma não
aparece.

**Metas de meses futuros** — ficam com status "não iniciada" e saem da conta de
"metas no ritmo", em vez de contarem como atrasadas.

## O que o painel absorve sozinho

A base cresce, e o painel foi feito para acompanhar sem alteração de código:

| aparece na base | painel |
|---|---|
| dia novo | entra no gráfico, no filtro e nas metas |
| dia fora do período contratado | a janela navegável estica, nada fica invisível |
| campanha nova | ganha linha na tabela, série no gráfico e cartão de eficiência |
| objetivo novo reconhecido | vira cartão próprio com a métrica-alvo e o custo dele |
| objetivo não reconhecido | isolado por campanha — dois tipos novos nunca dividem o mesmo custo |
| criativo novo | entra na grade com preview, e no resumo do topo |
| coluna renomeada | os aliases por plataforma cobrem os nomes conhecidos |
| plataforma nova na resposta | a tela avisa, com nome e contagem de linhas, para o mapeamento ser incluído |

O que **precisa** de mão são as metas contratadas (`lib/campaigns.ts`), porque
são valores de contrato, e o mapeamento de uma plataforma inédita.

```bash
node --experimental-strip-types scripts/test-dynamic.ts
```

verifica todos os casos da tabela acima.

## Layout

Baseline 1366×768. `scripts/audit-layout.mjs` percorre as 16 rotas em dez
viewports (equivalentes a zoom de 67% a 250% e mobile) verificando estouro
horizontal, colisão entre blocos, barras flutuantes cortadas e texto abaixo de
10 px:

```bash
npm run start          # em outro terminal
node scripts/audit-layout.mjs
```
