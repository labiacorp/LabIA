// Port of the user-supplied Claude Design reference. Example data lives only in this catalogue.
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { icons } from "lucide-react";
import data from "./reference-data.json";
import "./reference.css";

function css(input: string): CSSProperties {
  input = input.replaceAll("'Space Grotesk'", "var(--font-space-grotesk)").replaceAll("'JetBrains Mono'", "var(--font-jetbrains-mono)").replaceAll("Inter", "var(--font-inter)");
  return Object.fromEntries(input.split(";").filter(Boolean).map(rule => {
    const colon = rule.indexOf(":");
    const name = rule.slice(0, colon).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    return [name, rule.slice(colon + 1).trim()];
  })) as CSSProperties;
}
function ReferenceIcon({ name, style }: { name: string; style?: CSSProperties }) {
  const key = name.replace(/^icon-/, "").split("-").map(s => s[0].toUpperCase() + s.slice(1)).join("");
  const Icon = icons[key as keyof typeof icons] ?? icons.Circle;
  return <Icon aria-hidden style={{ width: "1em", height: "1em", flexShrink: 0, ...style }} />;
}
export function DesignSystemReference() {
  const { tokenGroups, zLayers, spaces, greenYes, greenNo, typeScale, statuses, nodeStates, menuGroups, modalItems, alerts } = data;
  return <main className="lab-design-reference"><div style={css(`display:flex;flex-direction:column;gap:96px;padding:var(--catalog-padding,72px);max-width:1600px;box-sizing:border-box`)}>
<header style={css(`display:flex;flex-direction:column;gap:16px;max-width:960px`)}>
<div style={css(`display:flex;gap:12px;align-items:center`)}>
<span style={css(`font-family:'Space Grotesk';font-weight:700;font-size:28px;letter-spacing:-0.02em`)}>{`Lab`}<span style={css(`color:#3DDFA6`)}>{`IA`}</span></span>
<span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9AA3B5;border:1px dashed #343947;border-radius:999px;padding:4px 10px`)}>{`proposta · v2 · 2026-10-02`}</span>
</div>
<h1 style={css(`margin:0;font-family:'Space Grotesk';font-weight:700;font-size:56px;line-height:60px;letter-spacing:-0.03em`)}>{`Design System · laboratório noturno`}</h1>
<p style={css(`margin:0;font-size:16px;line-height:24px;color:#9AA3B5;max-width:720px;text-wrap:pretty`)}>{`Tokens, regra do verde, escala tipográfica e inventário de componentes. Nada aqui vira código sem ok do Felipe. Código correspondente em `}<a href="#implementation">{`handoff/globals.css`}</a>{`, `}<a href="#implementation">{`tailwind.config.ts`}</a>{` e `}<a href="#implementation">{`MAPA-DE-APLICACAO.md`}</a>{`. Telas em `}<Link href="/">{`LabIA Telas`}</Link>{`.`}</p>
<div style={css(`display:flex;gap:16px;flex-wrap:wrap;font-family:'JetBrains Mono';font-size:12px;color:#9AA3B5`)}>
<span style={css(`display:flex;gap:8px;align-items:center`)}><i style={css(`width:8px;height:8px;border-radius:2px;background:#343947;display:inline-block`)}></i>{`MANTIDO`}</span>
<span style={css(`display:flex;gap:8px;align-items:center`)}><i style={css(`width:8px;height:8px;border-radius:2px;background:#FBBF24;display:inline-block`)}></i>{`ALTERADO`}</span>
<span style={css(`display:flex;gap:8px;align-items:center`)}><i style={css(`width:8px;height:8px;border-radius:2px;background:#38BDF8;display:inline-block`)}></i>{`NOVO`}</span>
</div>
</header>

<section id="implementation" style={css(`display:flex;flex-direction:column;gap:32px`)}>
<div style={css(`display:flex;align-items:baseline;gap:16px;border-bottom:1px solid #262A35;padding-bottom:16px`)}>
<span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#7D869A`)}>{`01`}</span>
<h2 style={css(`margin:0;font-family:'Space Grotesk';font-weight:500;font-size:32px;letter-spacing:-0.02em`)}>{`Tokens de cor`}</h2>
</div>
{tokenGroups.map((g, index) => <Fragment key={index}>
<div style={css(`display:flex;flex-direction:column;gap:12px`)}>
<div style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`${g.name}`}</div>
<div style={css(`display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px`)}>
{g.items.map((t, index) => <Fragment key={index}>
<div style={css(`display:flex;flex-direction:column;background:#12141A;border:1px solid #262A35;border-radius:12px;overflow:hidden`)}>
<div style={css(`height:64px;background:${t.hex};border-bottom:1px solid #262A35`)}></div>
<div style={css(`display:flex;flex-direction:column;gap:6px;padding:12px`)}>
<div style={css(`display:flex;justify-content:space-between;gap:8px;align-items:center`)}>
<span style={css(`font-family:'JetBrains Mono';font-size:12px;color:#E9ECF2`)}>{`${t.name}`}</span>
<span style={css(`font-family:'JetBrains Mono';font-size:10px;letter-spacing:.06em;color:${t.statusColor}`)}>{`${t.status}`}</span>
</div>
<span style={css(`font-family:'JetBrains Mono';font-size:12px;color:#9AA3B5`)}>{`${t.value}`}</span>
<span style={css(`font-size:12px;line-height:16px;color:#7D869A;text-wrap:pretty`)}>{`${t.note}`}</span>
</div>
</div>
</Fragment>)}
</div>
</div>
</Fragment>)}
<div style={css(`display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px`)}>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px`)}>
<div style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Contraste do muted · ALTERADO`}</div>
<div style={css(`display:grid;grid-template-columns:1fr 1fr;gap:8px`)}>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px`)}><span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#5D6577`)}>{`ANTES #5D6577`}</span><span style={css(`font-size:12px;color:#5D6577`)}>{`Dica sobre surface-1`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#9AA3B5`)}>{`~3,1:1 ✕`}</span></div>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px`)}><span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#7D869A`)}>{`DEPOIS #7D869A`}</span><span style={css(`font-size:12px;color:#7D869A`)}>{`Dica sobre surface-1`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#9AA3B5`)}>{`~5,0:1 ✓`}</span></div>
<div style={css(`background:#1A1D26;border:1px solid #262A35;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px`)}><span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#5D6577`)}>{`ANTES`}</span><span style={css(`font-size:12px;color:#5D6577`)}>{`Dica sobre surface-2`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#9AA3B5`)}>{`~2,9:1 ✕`}</span></div>
<div style={css(`background:#1A1D26;border:1px solid #262A35;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px`)}><span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#7D869A`)}>{`DEPOIS`}</span><span style={css(`font-size:12px;color:#7D869A`)}>{`Dica sobre surface-2`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#9AA3B5`)}>{`~4,6:1 ✓`}</span></div>
</div>
<p style={css(`margin:0;font-size:12px;line-height:18px;color:#9AA3B5`)}>{`O antigo valor vira `}<span style={css(`font-family:'JetBrains Mono'`)}>{`--lab-text-disabled`}</span>{`: só para controles desabilitados, nunca informação.`}</p>
</div>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px`)}>
<div style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Camadas · NOVO`}</div>
{zLayers.map((z, index) => <Fragment key={index}>
<div style={css(`display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #262A35;padding-bottom:8px`)}>
<span style={css(`font-size:14px;color:#E9ECF2`)}>{`${z.label}`}</span>
<span style={css(`font-family:'JetBrains Mono';font-size:12px;color:#9AA3B5`)}>{`${z.value}`}</span>
</div>
</Fragment>)}
</div>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px`)}>
<div style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Espaço, larguras, movimento · NOVO`}</div>
<div style={css(`display:flex;align-items:flex-end;gap:10px;height:72px`)}>
{spaces.map((s, index) => <Fragment key={index}>
<div style={css(`display:flex;flex-direction:column;align-items:center;gap:6px`)}><div style={css(`width:${s.px};height:${s.px};background:#343947;border-radius:2px`)}></div><span style={css(`font-family:'JetBrains Mono';font-size:10px;color:#9AA3B5`)}>{`${s.n}`}</span></div>
</Fragment>)}
</div>
<div style={css(`display:flex;flex-direction:column;gap:6px;font-family:'JetBrains Mono';font-size:12px;color:#9AA3B5`)}>
<span >{`max-w-form 640 · max-w-content 1152 · max-w-wide 1440`}</span>
<span >{`header 56 · toolbar 48 · página px-5 (celular) / px-8 (≥1024)`}</span>
<span >{`micro 120ms · painel 200ms · pulso 1600ms · ease (.2,0,0,1)`}</span>
<span >{`prefers-reduced-motion: pulso e shimmer desligados`}</span>
</div>
</div>
</div>
</section>

<section style={css(`display:flex;flex-direction:column;gap:32px`)}>
<div style={css(`display:flex;align-items:baseline;gap:16px;border-bottom:1px solid #262A35;padding-bottom:16px`)}>
<span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#7D869A`)}>{`02`}</span>
<h2 style={css(`margin:0;font-family:'Space Grotesk';font-weight:500;font-size:32px;letter-spacing:-0.02em`)}>{`O que pode ser verde`}</h2>
<span style={css(`font-size:14px;color:#9AA3B5`)}>{`Se a tela está verde demais, está errada.`}</span>
</div>
<div style={css(`display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px`)}>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;overflow:hidden`)}>
<div style={css(`padding:14px 20px;border-bottom:1px solid #262A35;font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#3DDFA6`)}>{`SIM · reagente`}</div>
{greenYes.map((r, index) => <Fragment key={index}>
<div style={css(`display:grid;grid-template-columns:1fr 160px 150px;gap:12px;align-items:center;padding:12px 20px;border-bottom:1px solid #262A35`)}>
<span style={css(`font-size:14px`)}>{`${r.what}`}</span>
<span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#9AA3B5`)}>{`${r.token}`}</span>
<span style={css(`font-size:12px;color:#7D869A`)}>{`${r.how}`}</span>
</div>
</Fragment>)}
</div>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;overflow:hidden`)}>
<div style={css(`padding:14px 20px;border-bottom:1px solid #262A35;font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#9AA3B5`)}>{`NÃO · usar neutro`}</div>
{greenNo.map((r, index) => <Fragment key={index}>
<div style={css(`display:grid;grid-template-columns:1fr 200px;gap:12px;align-items:center;padding:12px 20px;border-bottom:1px solid #262A35`)}>
<span style={css(`font-size:14px`)}>{`${r.what}`}</span>
<span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#9AA3B5`)}>{`${r.use}`}</span>
</div>
</Fragment>)}
</div>
</div>
</section>

<section style={css(`display:flex;flex-direction:column;gap:32px`)}>
<div style={css(`display:flex;align-items:baseline;gap:16px;border-bottom:1px solid #262A35;padding-bottom:16px`)}>
<span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#7D869A`)}>{`03`}</span>
<h2 style={css(`margin:0;font-family:'Space Grotesk';font-weight:500;font-size:32px;letter-spacing:-0.02em`)}>{`Escala tipográfica · NOVO`}</h2>
<span style={css(`font-size:14px;color:#9AA3B5`)}>{`Substitui text-[10px], text-[11px] e trackings soltos.`}</span>
</div>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;overflow:hidden`)}>
{typeScale.map((ty, index) => <Fragment key={index}>
<div style={css(`display:grid;grid-template-columns:140px 260px 1fr;gap:24px;align-items:center;padding:16px 24px;border-bottom:1px solid #262A35`)}>
<span style={css(`font-family:'JetBrains Mono';font-size:12px;color:#E9ECF2`)}>{`${ty.name}`}</span>
<span style={css(`font-family:'JetBrains Mono';font-size:11px;line-height:16px;color:#9AA3B5`)}>{`${ty.spec}`}</span>
<span style={css(`font-family:${ty.family};font-size:${ty.size};line-height:${ty.lh};font-weight:${ty.weight};letter-spacing:${ty.track};text-transform:${ty.tt};color:${ty.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`)}>{`${ty.sample}`}</span>
</div>
</Fragment>)}
</div>
</section>

<section style={css(`display:flex;flex-direction:column;gap:32px`)}>
<div style={css(`display:flex;align-items:baseline;gap:16px;border-bottom:1px solid #262A35;padding-bottom:16px`)}>
<span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;color:#7D869A`)}>{`04`}</span>
<h2 style={css(`margin:0;font-family:'Space Grotesk';font-weight:500;font-size:32px;letter-spacing:-0.02em`)}>{`Componentes`}</h2>
</div>
<div style={css(`display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:16px`)}>

<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px`)}>
<div style={css(`display:flex;justify-content:space-between`)}><span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:18px`)}>{`Button`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#7D869A`)}>{`components/ui/button.tsx`}</span></div>
<div style={css(`display:flex;gap:8px;flex-wrap:wrap;align-items:center`)}>
<button style={css(`height:36px;padding:0 12px;border-radius:8px;border:0;background:#10B981;color:#0A0B0E;font:500 14px Inter;display:flex;gap:8px;align-items:center`)}><ReferenceIcon name={`icon-play`} style={css(`font-size:16px`)} />{`Executar`}</button>
<button style={css(`height:36px;padding:0 12px;border-radius:8px;border:1px solid #262A35;background:#1A1D26;color:#E9ECF2;font:500 14px Inter`)}>{`Salvar`}</button>
<button style={css(`height:36px;padding:0 12px;border-radius:8px;border:0;background:transparent;color:#9AA3B5;font:500 14px Inter`)}>{`Cancelar`}</button>
<button style={css(`height:36px;padding:0 12px;border-radius:8px;border:1px solid rgba(251,113,133,.4);background:rgba(251,113,133,.1);color:#FB7185;font:500 14px Inter`)}>{`Desconectar`}</button>
<button style={css(`height:36px;padding:0;border:0;background:transparent;color:#E9ECF2;font:500 14px Inter;text-decoration:underline;text-underline-offset:4px`)}>{`Abrir Projeto`}</button>
</div>
<div style={css(`display:flex;gap:8px;flex-wrap:wrap;align-items:center`)}>
<button style={css(`height:32px;padding:0 10px;border-radius:8px;border:0;background:#10B981;color:#0A0B0E;font:500 12px Inter`)}>{`sm 32`}</button>
<button style={css(`height:36px;padding:0 12px;border-radius:8px;border:0;background:#10B981;color:#0A0B0E;font:500 14px Inter`)}>{`md 36`}</button>
<button style={css(`height:44px;padding:0 16px;border-radius:8px;border:0;background:#10B981;color:#0A0B0E;font:500 14px Inter`)}>{`lg 44 · celular`}</button>
<button style={css(`width:36px;height:36px;border-radius:8px;border:1px solid #262A35;background:#1A1D26;color:#9AA3B5;display:grid;place-items:center`)}><ReferenceIcon name={`icon-ellipsis`} style={css(`font-size:16px`)} /></button>
</div>
<div style={css(`display:flex;gap:8px;flex-wrap:wrap;align-items:center`)}>
<button style={css(`height:36px;padding:0 12px;border-radius:8px;border:0;background:#10B981;color:#0A0B0E;font:500 14px Inter;box-shadow:0 0 0 1px #3DDFA6,0 0 24px rgba(16,185,129,.25)`)}>{`foco`}</button>
<button style={css(`height:36px;padding:0 12px;border-radius:8px;border:0;background:#10B981;color:#0A0B0E;font:500 14px Inter;opacity:.5`)}>{`desabilitado`}</button>
<button style={css(`height:36px;padding:0 12px;border-radius:8px;border:0;background:#10B981;color:#0A0B0E;font:500 14px Inter;display:flex;gap:8px;align-items:center;opacity:.85`)}><ReferenceIcon name={`icon-loader-circle`} style={css(`font-size:16px`)} />{`Executando…`}</button>
</div>
<p style={css(`margin:0;font-size:12px;line-height:18px;color:#7D869A`)}>{`Um único primário por área. `}<span style={css(`font-family:'JetBrains Mono'`)}>{`default`}</span>{` renomeado para `}<span style={css(`font-family:'JetBrains Mono'`)}>{`primary`}</span>{`; perigo agora é contorno (fundo vermelho sólido só no hover).`}</p>
</div>

<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px`)}>
<div style={css(`display:flex;justify-content:space-between`)}><span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:18px`)}>{`Chip de custo`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#7D869A`)}>{`ui/cost-chip.tsx · NOVO`}</span></div>
<div style={css(`display:grid;grid-template-columns:auto 1fr;gap:12px 20px;align-items:center`)}>
<span style={css(`height:24px;padding:0 8px;border-radius:999px;border:1px solid rgba(16,185,129,.28);background:rgba(16,185,129,.12);color:#3DDFA6;font:500 12px 'JetBrains Mono';display:inline-flex;align-items:center;justify-self:start`)}>{`~R$0,43`}</span><span style={css(`font-size:13px;color:#9AA3B5`)}>{`Estimado · antes de rodar`}</span>
<span style={css(`height:24px;padding:0 8px;border-radius:999px;border:1px solid rgba(16,185,129,.28);background:rgba(16,185,129,.12);color:#3DDFA6;font:500 12px 'JetBrains Mono';display:inline-flex;align-items:center;gap:4px;justify-self:start`)}>{`R$0,41 ✓`}</span><span style={css(`font-size:13px;color:#9AA3B5`)}>{`Real · depois de rodar`}</span>
<span style={css(`height:24px;padding:0 8px;border-radius:999px;border:1px solid rgba(16,185,129,.28);background:rgba(16,185,129,.12);color:#3DDFA6;font:500 12px 'JetBrains Mono';display:inline-flex;align-items:center;justify-self:start`)}>{`R$0,00`}</span><span style={css(`font-size:13px;color:#9AA3B5`)}>{`Importação / montagem local (custo conhecido)`}</span>
<span style={css(`height:24px;padding:0 8px;border-radius:999px;border:1px dashed #343947;color:#9AA3B5;font:500 12px 'JetBrains Mono';display:inline-flex;align-items:center;justify-self:start`)}>{`A calcular`}</span><span style={css(`font-size:13px;color:#9AA3B5`)}>{`Desconhecido · nunca R$0`}</span>
<span style={css(`height:24px;padding:0 8px;border-radius:999px;border:1px solid #262A35;background:#1A1D26;color:#7D869A;font:500 12px 'JetBrains Mono';display:inline-flex;align-items:center;gap:6px;justify-self:start`)}><ReferenceIcon name={`icon-cloud-off`} style={css(`font-size:12px`)} />{`indisponível`}</span><span style={css(`font-size:13px;color:#9AA3B5`)}>{`Falha ao ler · nunca R$0`}</span>
<span style={css(`height:28px;padding:0 10px;border-radius:999px;border:1px solid rgba(16,185,129,.28);background:rgba(16,185,129,.12);color:#3DDFA6;font:500 12px 'JetBrains Mono';display:inline-flex;align-items:center;gap:6px;justify-self:start`)}><span style={css(`color:#7D869A`)}>{`mês`}</span>{`R$42,18`}</span><span style={css(`font-size:13px;color:#9AA3B5`)}>{`Header · com prefixo`}</span>
</div>
</div>

<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px`)}>
<div style={css(`display:flex;justify-content:space-between`)}><span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:18px`)}>{`Badge / Status`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#7D869A`)}>{`ui/badge.tsx`}</span></div>
<div style={css(`display:flex;gap:8px;flex-wrap:wrap`)}>
{statuses.map((st, index) => <Fragment key={index}>
<span style={css(`height:24px;padding:0 8px;border-radius:999px;border:1px solid ${st.border};background:${st.bg};color:${st.fg};font:500 12px Inter;display:inline-flex;align-items:center;gap:6px`)}><i style={css(`width:6px;height:6px;border-radius:99px;background:${st.dot};display:inline-block`)}></i>{`${st.label}`}</span>
</Fragment>)}
</div>
<div style={css(`display:flex;gap:8px;flex-wrap:wrap`)}>
<span style={css(`height:22px;padding:0 8px;border-radius:999px;border:1px solid #262A35;background:#12141A;color:#9AA3B5;font:500 11px 'JetBrains Mono';letter-spacing:.08em;display:inline-flex;align-items:center`)}>{`FLUX`}</span>
<span style={css(`height:22px;padding:0 8px;border-radius:999px;border:1px solid #262A35;background:#12141A;color:#9AA3B5;font:500 11px 'JetBrains Mono';letter-spacing:.08em;display:inline-flex;align-items:center`)}>{`KLING 2.5`}</span>
<span style={css(`height:22px;padding:0 8px;border-radius:999px;border:1px solid #262A35;background:#12141A;color:#9AA3B5;font:500 11px 'JetBrains Mono';letter-spacing:.08em;display:inline-flex;align-items:center`)}>{`9:16`}</span>
<span style={css(`height:22px;padding:0 8px;border-radius:999px;border:1px dashed #343947;color:#9AA3B5;font:500 11px 'JetBrains Mono';letter-spacing:.08em;display:inline-flex;align-items:center`)}>{`PROPOSTA`}</span>
</div>
<p style={css(`margin:0;font-size:12px;line-height:18px;color:#7D869A`)}>{`Status usa ponto colorido + texto neutro. "Pronto" é success (#4ADE80), não reagente.`}</p>
</div>

<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px`)}>
<div style={css(`display:flex;justify-content:space-between`)}><span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:18px`)}>{`Input · Select · Textarea`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#7D869A`)}>{`ui/field.tsx · NOVO`}</span></div>
<div style={css(`display:grid;grid-template-columns:1fr 1fr;gap:12px`)}>
<label style={css(`display:flex;flex-direction:column;gap:6px`)}><span style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Nome do Projeto`}</span><span style={css(`height:36px;border:1px solid #262A35;background:#1A1D26;border-radius:8px;padding:0 12px;display:flex;align-items:center;font-size:14px;color:#7D869A`)}>{`Ex.: Bento · lançamento`}</span></label>
<label style={css(`display:flex;flex-direction:column;gap:6px`)}><span style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Foco`}</span><span style={css(`height:36px;border:1px solid #343947;background:#1A1D26;border-radius:8px;padding:0 12px;display:flex;align-items:center;font-size:14px;box-shadow:0 0 0 1px #10B981,0 0 24px rgba(16,185,129,.12)`)}>{`Bento · lançamento`}</span></label>
<label style={css(`display:flex;flex-direction:column;gap:6px`)}><span style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Erro`}</span><span style={css(`height:36px;border:1px solid #FB7185;background:#1A1D26;border-radius:8px;padding:0 12px;display:flex;align-items:center;font-size:14px`)}></span><span style={css(`font-size:12px;color:#FB7185`)}>{`Dê um nome ao Projeto.`}</span></label>
<label style={css(`display:flex;flex-direction:column;gap:6px`)}><span style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:#5D6577`)}>{`Desabilitado`}</span><span style={css(`height:36px;border:1px solid #262A35;background:#12141A;border-radius:8px;padding:0 12px;display:flex;align-items:center;font-size:14px;color:#5D6577`)}>{`9:16`}</span></label>
<label style={css(`display:flex;flex-direction:column;gap:6px`)}><span style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Modelo`}</span><span style={css(`height:36px;border:1px solid #262A35;background:#1A1D26;border-radius:8px;padding:0 10px 0 12px;display:flex;align-items:center;justify-content:space-between;font-size:14px`)}>{`Kling 2.5 Turbo`}<span style={css(`display:flex;gap:8px;align-items:center;font:500 12px 'JetBrains Mono';color:#9AA3B5`)}>{`~R$1,93/5s`}<ReferenceIcon name={`icon-chevron-down`} style={css(`font-size:14px`)} /></span></span></label>
<label style={css(`display:flex;flex-direction:column;gap:6px;grid-column:span 2`)}><span style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Movimento`}</span><span style={css(`min-height:72px;border:1px solid #262A35;background:#1A1D26;border-radius:8px;padding:10px 12px;font:400 12px/20px 'JetBrains Mono';color:#E9ECF2`)}>{`câmera desce devagar, luz lateral fria, produto gira 15°`}</span></label>
</div>
<p style={css(`margin:0;font-size:12px;line-height:18px;color:#7D869A`)}>{`Preço no select vem em R$ (mono, cinza). Verde só no chip do nó.`}</p>
</div>
</div>

<div style={css(`display:flex;flex-direction:column;gap:12px`)}>
<div style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Cards · fluxo · projeto · asset`}</div>
<div style={css(`display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px`)}>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;overflow:hidden;display:flex;flex-direction:column`)}>
<div style={css(`aspect-ratio:16/9;background:repeating-linear-gradient(135deg,#1A1D26 0 8px,#12141A 8px 16px);display:grid;place-items:center;font:11px 'JetBrains Mono';color:#7D869A;position:relative`)}>{`último resultado`}<span style={css(`position:absolute;top:10px;left:10px;height:22px;padding:0 8px;border-radius:999px;border:1px solid rgba(74,222,128,.3);background:rgba(10,11,14,.8);color:#E9ECF2;font:500 12px Inter;display:inline-flex;align-items:center;gap:6px`)}><i style={css(`width:6px;height:6px;border-radius:99px;background:#4ADE80;display:inline-block`)}></i>{`Pronto`}</span></div>
<div style={css(`padding:14px;display:flex;flex-direction:column;gap:8px`)}>
<span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:16px;line-height:22px`)}>{`Bento · Flow principal · reel produto 6s`}</span>
<div style={css(`display:flex;justify-content:space-between;align-items:center;gap:8px`)}><span style={css(`font-size:12px;color:#9AA3B5;display:flex;gap:6px;align-items:center`)}><i style={css(`width:6px;height:6px;border-radius:2px;background:#38BDF8;display:inline-block`)}></i>{`Bento · há 2 h`}</span><span style={css(`height:22px;padding:0 8px;border-radius:999px;border:1px solid rgba(16,185,129,.28);background:rgba(16,185,129,.12);color:#3DDFA6;font:500 11px 'JetBrains Mono';display:inline-flex;align-items:center`)}>{`R$1,62 ✓`}</span></div>
</div>
</div>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;overflow:hidden;display:grid;grid-template-columns:96px 1fr`)}>
<div style={css(`background:repeating-linear-gradient(135deg,#1A1D26 0 8px,#12141A 8px 16px);display:grid;place-items:center;font:10px 'JetBrains Mono';color:#7D869A`)}>{`9:16`}</div>
<div style={css(`padding:14px;display:flex;flex-direction:column;gap:10px`)}>
<div style={css(`display:flex;justify-content:space-between;gap:8px`)}><span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:16px`)}>{`Bento · lançamento`}</span><span style={css(`height:22px;padding:0 8px;border-radius:999px;border:1px solid rgba(251,191,36,.4);background:rgba(251,191,36,.1);font:500 12px Inter;display:inline-flex;align-items:center;gap:6px`)}><i style={css(`width:6px;height:6px;border-radius:99px;background:#FBBF24;display:inline-block`)}></i>{`Em revisão`}</span></div>
<span style={css(`font-size:13px;line-height:18px;color:#9AA3B5`)}>{`Reel do pote térmico girando no balcão.`}</span>
<div style={css(`display:flex;justify-content:space-between;align-items:center`)}><span style={css(`font:12px 'JetBrains Mono';color:#9AA3B5`)}>{`Vídeo · 9:16 · 5s`}</span><span style={css(`font:500 12px 'JetBrains Mono';color:#3DDFA6`)}>{`R$4,87 ✓`}</span></div>
</div>
</div>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;overflow:hidden;display:flex;flex-direction:column`)}>
<div style={css(`aspect-ratio:1;background:repeating-linear-gradient(135deg,#1A1D26 0 8px,#12141A 8px 16px);display:grid;place-items:center;font:11px 'JetBrains Mono';color:#7D869A;position:relative`)}>{`asset`}<span style={css(`position:absolute;bottom:10px;right:10px;font:11px 'JetBrains Mono';color:#9AA3B5;background:rgba(10,11,14,.8);padding:2px 6px;border-radius:4px`)}>{`1024×1024`}</span></div>
<div style={css(`padding:12px 14px;display:flex;flex-direction:column;gap:6px`)}>
<div style={css(`display:flex;justify-content:space-between`)}><span style={css(`font-size:14px;font-weight:500`)}>{`FLUX Dev · fal.ai`}</span><span style={css(`font:500 12px 'JetBrains Mono';color:#3DDFA6`)}>{`R$0,14 ✓`}</span></div>
<span style={css(`font-size:12px;color:#9AA3B5`)}>{`Bento · 28 set`}</span>
</div>
</div>
</div>
</div>

<div style={css(`display:flex;flex-direction:column;gap:12px`)}>
<div style={css(`display:flex;justify-content:space-between;align-items:baseline`)}><span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Nó do canvas · 6 estados`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#7D869A`)}>{`nodes/lab-node-shell.tsx · NOVO`}</span></div>
<div style={css(`display:grid;grid-template-columns:repeat(auto-fill,minmax(288px,1fr));gap:32px;padding:32px;border-radius:12px;border:1px solid #262A35;background-color:#0A0B0E;background-image:radial-gradient(#242833 1px,transparent 1px);background-size:16px 16px`)}>
{nodeStates.map((n, index) => <Fragment key={index}>
<div style={css(`display:flex;flex-direction:column;gap:10px`)}>
<span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9AA3B5`)}>{`${n.stateLabel}`}</span>
<div style={css(`position:relative;width:288px;border-radius:12px;border:1px ${n.borderStyle} ${n.border};background:#1A1D26;box-shadow:${n.shadow};animation:${n.anim}`)}>
<div style={css(`height:2px;background:${n.accent};border-radius:12px 12px 0 0`)}></div>
<div style={css(`display:flex;justify-content:space-between;gap:10px;padding:12px 12px 0;opacity:${n.bodyOpacity}`)}>
<div style={css(`display:flex;gap:8px;align-items:center;min-width:0`)}>
<span style={css(`width:32px;height:32px;border-radius:8px;border:1px solid #262A35;background:#12141A;display:grid;place-items:center;color:${n.accent}`)}><ReferenceIcon name={`${n.icon}`} style={css(`font-size:16px`)} /></span>
<span style={css(`display:flex;flex-direction:column;min-width:0`)}><span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:14px`)}>{`${n.title}`}</span><span style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`${n.kind}`}</span></span>
</div>
<span style={css(`height:20px;padding:0 7px;border-radius:999px;border:1px ${n.chipBorderStyle} ${n.chipBorder};background:${n.chipBg};color:${n.chipFg};font:500 11px 'JetBrains Mono';display:inline-flex;align-items:center;white-space:nowrap`)}>{`${n.cost}`}</span>
</div>
<div style={css(`padding:12px;display:flex;flex-direction:column;gap:10px`)}>
{n.running ? <>
<div style={css(`display:flex;gap:8px;align-items:center;font:12px 'JetBrains Mono';color:#9AA3B5`)}><span style={css(`flex:1;height:4px;border-radius:99px;background:#12141A;overflow:hidden`)}><span style={css(`display:block;height:100%;background:linear-gradient(90deg,transparent,#10B981,transparent);background-size:200% 100%;animation:labshimmer 1.6s linear infinite`)}></span></span>{`Gerando · 00:42`}</div>
</> : null}
{n.blocked ? <>
<div style={css(`display:flex;gap:8px;align-items:center;font-size:12px;color:#9AA3B5`)}><ReferenceIcon name={`icon-lock`} style={css(`font-size:13px`)} />{`Aguardando: conecte uma imagem-base`}</div>
</> : null}
<div style={css(`aspect-ratio:16/9;border-radius:8px;border:1px ${n.mediaBorder} #262A35;background:${n.media};display:grid;place-items:center;font:11px 'JetBrains Mono';color:#7D869A`)}>{`${n.mediaLabel}`}</div>
<div style={css(`display:flex;gap:6px;font:11px 'JetBrains Mono';color:#9AA3B5`)}><span style={css(`border:1px solid #262A35;border-radius:999px;padding:2px 7px`)}>{`KLING 2.5`}</span><span style={css(`border:1px solid #262A35;border-radius:999px;padding:2px 7px`)}>{`5s`}</span><span style={css(`border:1px solid #262A35;border-radius:999px;padding:2px 7px`)}>{`9:16`}</span></div>
{n.error ? <>
<div style={css(`display:flex;gap:8px;align-items:flex-start;border:1px solid rgba(251,113,133,.4);background:rgba(251,113,133,.1);border-radius:8px;padding:8px;font-size:12px;line-height:16px`)}>
<ReferenceIcon name={`icon-triangle-alert`} style={css(`font-size:14px;color:#FB7185`)} />
<span style={css(`flex:1`)}>{`O modelo recusou a imagem (rosto detectado). Nada foi cobrado.`}</span>
</div>
<button style={css(`align-self:flex-start;height:32px;padding:0 10px;border-radius:8px;border:1px solid #262A35;background:#12141A;color:#E9ECF2;font:500 12px Inter;display:flex;gap:6px;align-items:center`)}><ReferenceIcon name={`icon-rotate-ccw`} style={css(`font-size:13px`)} />{`Tentar de novo`}</button>
</> : null}
</div>
<span style={css(`position:absolute;left:-8px;top:50%;width:16px;height:16px;margin-top:-8px;border-radius:99px;border:3px solid #0A0B0E;background:${n.portIn};box-sizing:border-box`)}></span>
<span style={css(`position:absolute;right:-8px;top:50%;width:16px;height:16px;margin-top:-8px;border-radius:99px;border:3px solid #0A0B0E;background:${n.portOut};box-sizing:border-box`)}></span>
</div>
<span style={css(`font-size:12px;line-height:16px;color:#7D869A;max-width:288px`)}>{`${n.note}`}</span>
</div>
</Fragment>)}
</div>
</div>
<div style={css(`display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;align-items:start`)}>

<div style={css(`display:flex;flex-direction:column;gap:12px`)}>
<div style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Menu Criar · contexto por grupo`}</div>
<div style={css(`width:340px;background:#12141A;border-radius:12px;box-shadow:0 0 0 1px #343947,0 16px 40px rgba(0,0,0,.55);overflow:hidden`)}>
<div style={css(`padding:10px;border-bottom:1px solid #262A35`)}><div style={css(`height:36px;border-radius:8px;border:1px solid #262A35;background:#1A1D26;display:flex;align-items:center;gap:8px;padding:0 10px;font-size:14px;color:#7D869A`)}><ReferenceIcon name={`icon-search`} style={css(`font-size:15px`)} />{`Buscar nó…`}</div></div>
{menuGroups.map((mg, index) => <Fragment key={index}>
<div style={css(`padding:8px 6px;border-bottom:1px solid #262A35`)}>
<div style={css(`display:flex;gap:8px;align-items:center;padding:4px 8px;font:500 11px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:#9AA3B5`)}><i style={css(`width:8px;height:8px;border-radius:2px;background:${mg.color};display:inline-block`)}></i>{`${mg.name}`}</div>
{mg.items.map((mi, index) => <Fragment key={index}>
<div style={css(`display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;background:${mi.bg}`)}>
<span style={css(`display:flex;gap:10px;align-items:center;font-size:14px;color:${mi.fg}`)}><ReferenceIcon name={`${mi.icon}`} style={css(`font-size:15px;color:${mg.color}`)} />{`${mi.name}`}</span>
<span style={css(`font:500 11px 'JetBrains Mono';color:${mi.costColor}`)}>{`${mi.cost}`}</span>
</div>
</Fragment>)}
</div>
</Fragment>)}
</div>
</div>

<div style={css(`display:flex;flex-direction:column;gap:12px`)}>
<div style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Modal de custo · base mantida, lista por nó`}</div>
<div style={css(`padding:32px;background:rgba(10,11,14,.8);border-radius:12px;border:1px solid #262A35`)}>
<div style={css(`max-width:480px;background:#12141A;border-radius:12px;box-shadow:0 0 0 1px #343947,0 24px 64px rgba(0,0,0,.65);padding:20px;display:flex;flex-direction:column;gap:16px`)}>
<div style={css(`display:flex;gap:12px`)}>
<span style={css(`width:40px;height:40px;border-radius:8px;border:1px solid #262A35;background:#1A1D26;display:grid;place-items:center;color:#9AA3B5;flex-shrink:0`)}><ReferenceIcon name={`icon-receipt`} style={css(`font-size:18px`)} /></span>
<div ><div style={css(`font-family:'Space Grotesk';font-weight:500;font-size:18px`)}>{`Confirmar custo do fluxo`}</div><div style={css(`font-size:14px;line-height:20px;color:#9AA3B5;margin-top:4px`)}>{`Estimativa antes de rodar. Confirmar gera gasto real na fal.ai.`}</div></div>
</div>
<div style={css(`border:1px solid rgba(16,185,129,.28);background:rgba(16,185,129,.12);border-radius:8px;padding:12px 16px`)}><div style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;color:#9AA3B5`)}>{`CUSTO ESTIMADO TOTAL`}</div><div style={css(`font:600 28px/32px 'JetBrains Mono';color:#3DDFA6;margin-top:4px`)}>{`~R$2,07`}</div></div>
<div style={css(`border:1px solid #262A35;border-radius:8px;background:#1A1D26`)}>
{modalItems.map((m, index) => <Fragment key={index}>
<div style={css(`display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #262A35`)}>
<div style={css(`display:flex;gap:10px;align-items:center`)}><i style={css(`width:3px;height:28px;border-radius:2px;background:${m.color};display:inline-block`)}></i><span style={css(`display:flex;flex-direction:column`)}><span style={css(`font-size:14px;font-weight:500`)}>{`${m.label}`}</span><span style={css(`font:11px 'JetBrains Mono';color:#7D869A`)}>{`${m.kind}`}</span></span></div>
<span style={css(`font:500 14px 'JetBrains Mono';color:${m.costColor}`)}>{`${m.cost}`}</span>
</div>
</Fragment>)}
</div>
<div style={css(`display:flex;justify-content:flex-end;gap:8px`)}><button style={css(`height:36px;padding:0 12px;border-radius:8px;border:1px solid #262A35;background:#1A1D26;color:#E9ECF2;font:500 14px Inter`)}>{`Cancelar`}</button><button style={css(`height:36px;padding:0 12px;border-radius:8px;border:0;background:#10B981;color:#0A0B0E;font:500 14px Inter`)}>{`Confirmar e executar`}</button></div>
</div>
</div>
<span style={css(`font-size:12px;color:#7D869A`)}>{`Tipo do nó em PT-BR (não `}<span style={css(`font-family:'JetBrains Mono'`)}>{`video-generation`}</span>{`). Todos os nós pagos entram, não só vídeo.`}</span>
</div>
</div>
<div style={css(`display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;align-items:start`)}>

<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:10px`)}>
<span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:18px`)}>{`Toast · Alerta`}</span>
{alerts.map((al, index) => <Fragment key={index}>
<div style={css(`display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:8px;border:1px solid ${al.border};background:${al.bg}`)}>
<ReferenceIcon name={`${al.icon}`} style={css(`font-size:16px;color:${al.color};margin-top:1px`)} />
<div style={css(`flex:1;display:flex;flex-direction:column;gap:2px`)}><span style={css(`font-size:14px;font-weight:500`)}>{`${al.title}`}</span><span style={css(`font-size:13px;line-height:18px;color:#9AA3B5`)}>{`${al.body}`}</span></div>
<span style={css(`font:500 12px 'JetBrains Mono';color:${al.metaColor}`)}>{`${al.meta}`}</span>
</div>
</Fragment>)}
<span style={css(`font-size:12px;color:#7D869A`)}>{`Toast: canto inferior direito (celular: topo), z-60, 5s, Esc fecha.`}</span>
</div>

<div style={css(`display:flex;flex-direction:column;gap:16px`)}>
<div style={css(`background:#12141A;border:1px dashed #343947;border-radius:12px;padding:28px;display:flex;flex-direction:column;gap:14px;align-items:flex-start`)}>
<span style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;color:#7D869A`)}>{`ESTADO VAZIO · sempre com receita concreta`}</span>
<span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:20px`)}>{`Nenhum fluxo ainda`}</span>
<span style={css(`font-size:14px;line-height:20px;color:#9AA3B5;max-width:380px`)}>{`Comece pela receita mais usada: uma imagem do produto vira um vídeo curto de 5s.`}</span>
<div style={css(`display:flex;gap:8px;align-items:center`)}><button style={css(`height:36px;padding:0 12px;border-radius:8px;border:0;background:#10B981;color:#0A0B0E;font:500 14px Inter`)}>{`Imagem-base → Vídeo curto`}</button><span style={css(`height:24px;padding:0 8px;border-radius:999px;border:1px solid rgba(16,185,129,.28);background:rgba(16,185,129,.12);color:#3DDFA6;font:500 12px 'JetBrains Mono';display:inline-flex;align-items:center`)}>{`~R$1,93`}</span></div>
</div>
<div style={css(`background:#12141A;border:1px solid #262A35;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:10px`)}>
<span style={css(`font:500 11px 'JetBrains Mono';letter-spacing:.08em;color:#7D869A`)}>{`SKELETON · shimmer 1,6s`}</span>
<div style={css(`display:grid;grid-template-columns:96px 1fr;gap:12px`)}>
<div style={css(`height:96px;border-radius:8px;background:linear-gradient(90deg,#1A1D26 0%,#232733 50%,#1A1D26 100%);background-size:200% 100%;animation:labshimmer 1.6s linear infinite`)}></div>
<div style={css(`display:flex;flex-direction:column;gap:8px;padding-top:4px`)}><div style={css(`height:14px;width:70%;border-radius:4px;background:#1A1D26`)}></div><div style={css(`height:12px;width:45%;border-radius:4px;background:#1A1D26`)}></div><div style={css(`height:20px;width:64px;border-radius:99px;background:#1A1D26;margin-top:auto`)}></div></div>
</div>
</div>
<div style={css(`background:#12141A;border:1px solid rgba(251,113,133,.4);border-radius:12px;padding:20px;display:flex;gap:14px;align-items:flex-start`)}>
<ReferenceIcon name={`icon-database-zap`} style={css(`font-size:20px;color:#FB7185`)} />
<div style={css(`flex:1;display:flex;flex-direction:column;gap:6px`)}><span style={css(`font-family:'Space Grotesk';font-weight:500;font-size:16px`)}>{`Não foi possível carregar seus fluxos`}</span><span style={css(`font-size:13px;line-height:18px;color:#9AA3B5`)}>{`O banco não respondeu. Seus dados estão salvos · isto não é uma lista vazia.`}</span></div>
<button style={css(`height:32px;padding:0 10px;border-radius:8px;border:1px solid #262A35;background:#1A1D26;color:#E9ECF2;font:500 12px Inter;display:flex;gap:6px;align-items:center`)}><ReferenceIcon name={`icon-rotate-ccw`} style={css(`font-size:13px`)} />{`Tentar de novo`}</button>
</div>
</div>
</div>

<div style={css(`display:flex;flex-direction:column;gap:12px`)}>
<div style={css(`display:flex;justify-content:space-between;align-items:baseline`)}><span style={css(`font-family:'JetBrains Mono';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7D869A`)}>{`Header · desktop · menu de perfil (proposta 10-contas)`}</span><span style={css(`font-family:'JetBrains Mono';font-size:11px;color:#7D869A`)}>{`app/app-shell.tsx · app/profile-menu.tsx`}</span></div>
<div style={css(`border:1px solid #262A35;border-radius:12px;overflow:hidden;background:#0A0B0E;padding-bottom:300px;position:relative`)}>
<div style={css(`height:56px;background:#12141A;border-bottom:1px solid #262A35;display:flex;align-items:center;gap:32px;padding:0 24px`)}>
<span style={css(`font-family:'Space Grotesk';font-weight:700;font-size:20px;letter-spacing:-0.02em`)}>{`Lab`}<span style={css(`color:#3DDFA6`)}>{`IA`}</span></span>
<nav style={css(`display:flex;gap:4px`)}>
<span style={css(`height:32px;padding:0 12px;border-radius:8px;background:#1A1D26;display:flex;align-items:center;font-size:14px;font-weight:500`)}>{`Projetos`}</span>
<span style={css(`height:32px;padding:0 12px;border-radius:8px;display:flex;align-items:center;font-size:14px;color:#9AA3B5`)}>{`Fluxos`}</span>
<span style={css(`height:32px;padding:0 12px;border-radius:8px;display:flex;align-items:center;font-size:14px;color:#9AA3B5`)}>{`Biblioteca`}</span>
</nav>
<div style={css(`flex:1`)}></div>
<span style={css(`height:28px;padding:0 10px;border-radius:999px;border:1px solid rgba(16,185,129,.28);background:rgba(16,185,129,.12);color:#3DDFA6;font:500 12px 'JetBrains Mono';display:inline-flex;align-items:center;gap:6px`)}><span style={css(`color:#7D869A`)}>{`mês`}</span>{`R$42,18`}</span>
<button style={css(`height:36px;padding:0 12px;border-radius:8px;border:1px solid #343947;background:#1A1D26;color:#E9ECF2;font:500 14px Inter;display:flex;gap:6px;align-items:center`)}><ReferenceIcon name={`icon-plus`} style={css(`font-size:15px`)} />{`Criar`}</button>
<span style={css(`width:32px;height:32px;border-radius:99px;background:#262A35;display:grid;place-items:center;font:600 12px 'Space Grotesk';box-shadow:0 0 0 2px #12141A,0 0 0 3px #343947`)}>{`FZ`}</span>
</div>
<div style={css(`position:absolute;right:16px;top:64px;width:280px;background:#12141A;border-radius:12px;box-shadow:0 0 0 1px #343947,0 16px 40px rgba(0,0,0,.55);overflow:hidden`)}>
<div style={css(`padding:14px;border-bottom:1px solid #262A35;display:flex;flex-direction:column;gap:2px`)}><span style={css(`font-size:14px;font-weight:500`)}>{`Felipe Zilli`}</span><span style={css(`font-size:12px;color:#9AA3B5`)}>{`felipe@labia.app`}</span></div>
<div style={css(`padding:6px;border-bottom:1px solid #262A35`)}>
<div style={css(`padding:6px 8px;font:500 11px 'JetBrains Mono';letter-spacing:.08em;color:#7D869A`)}>{`WORKSPACE`}</div>
<div style={css(`display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:8px;background:#1A1D26;font-size:14px`)}>{`felipe-labia`}<ReferenceIcon name={`icon-check`} style={css(`font-size:14px;color:#9AA3B5`)} /></div>
<div style={css(`padding:8px;font-size:14px;color:#9AA3B5`)}>{`diego-studio`}</div>
</div>
<div style={css(`padding:6px;display:flex;flex-direction:column`)}>
<span style={css(`display:flex;gap:10px;align-items:center;padding:8px;font-size:14px;color:#E9ECF2`)}><ReferenceIcon name={`icon-user`} style={css(`font-size:15px;color:#9AA3B5`)} />{`Conta`}</span>
<span style={css(`display:flex;gap:10px;align-items:center;padding:8px;font-size:14px;color:#E9ECF2`)}><ReferenceIcon name={`icon-plug`} style={css(`font-size:15px;color:#9AA3B5`)} />{`Conexões`}<span style={css(`margin-left:auto;font:10px 'JetBrains Mono';letter-spacing:.06em;color:#9AA3B5;border:1px dashed #343947;border-radius:99px;padding:1px 6px`)}>{`PROPOSTA`}</span></span>
<span style={css(`display:flex;gap:10px;align-items:center;padding:8px;font-size:14px;color:#9AA3B5`)}><ReferenceIcon name={`icon-flask-conical`} style={css(`font-size:15px`)} />{`Em breve: Copy, Calendário`}</span>
<span style={css(`display:flex;gap:10px;align-items:center;padding:8px;font-size:14px;color:#E9ECF2;border-top:1px solid #262A35;margin-top:4px`)}><ReferenceIcon name={`icon-log-out`} style={css(`font-size:15px;color:#9AA3B5`)} />{`Sair`}</span>
</div>
</div>
<div style={css(`position:absolute;left:24px;top:84px;display:flex;flex-direction:column;gap:12px;max-width:520px`)}>
<span style={css(`font-size:13px;line-height:20px;color:#9AA3B5`)}>{`Criar sai do conteúdo e entra no header (secundário com borda forte · o verde fica para Executar). "Em breve" e Conexões vão para o menu de perfil. Custo com falha:`}</span>
<span style={css(`align-self:flex-start;height:28px;padding:0 10px;border-radius:999px;border:1px solid #262A35;background:#1A1D26;color:#7D869A;font:500 12px 'JetBrains Mono';display:inline-flex;align-items:center;gap:6px`)}><span >{`mês`}</span><ReferenceIcon name={`icon-cloud-off`} style={css(`font-size:12px`)} />{`indisponível`}</span>
<span style={css(`font-size:13px;color:#9AA3B5`)}>{`Deslogado: avatar vira botão `}<span style={css(`font-family:'JetBrains Mono'`)}>{`Entrar`}</span>{` (ghost) → /entrar.`}</span>
</div>
</div>
</div>
</section>
</div></main>;
}
