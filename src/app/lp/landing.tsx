"use client";

import { AudioLines, Check, ChevronLeft, CircleCheck, CircleDashed, Clapperboard, FileText, Image as ImageIcon, Mic, Minus, Plus, Scissors, X, ArrowDown, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

// Port of design/reference "LabIA Landing" (Claude Design). Colors map to the --lab-* tokens.
const T = {
  bg: "var(--lab-bg)", surface: "var(--lab-surface-1)", s2: "var(--lab-surface-2)", s3: "#26262A",
  line: "var(--lab-border)", lineStrong: "var(--lab-border-strong)", ink: "var(--lab-text)", ink2: "var(--lab-text-dim)",
  cost: "var(--lab-reagent)", onCost: "var(--lab-on-reagent)", warn: "var(--lab-warning)", info: "var(--lab-info)", danger: "var(--lab-danger)",
};
// The landing is dark-only: pin the dark tokens so the app's light theme (html[data-theme=light]) cannot recolor it.
const DARK = {
  "--lab-bg": "#0B0B0C", "--lab-surface-1": "#161618", "--lab-surface-2": "#202023", "--lab-border": "#2C2C30", "--lab-border-strong": "#3A3A3F",
  "--lab-text": "#F4F3EF", "--lab-text-dim": "#A3A29C", "--lab-reagent": "#C8FF2E", "--lab-on-reagent": "#0B0B0C",
  "--lab-warning": "#FFC247", "--lab-info": "#7CC4FF", "--lab-danger": "#FF5A4E",
} as CSSProperties;
const display = "var(--font-display), 'Big Shoulders Display', sans-serif";
const mono = "var(--font-mono), ui-monospace, monospace";
const trim = { textBox: "trim-both cap alphabetic" } as CSSProperties;
const h2: CSSProperties = { margin: 0, fontFamily: display, fontWeight: 900, fontSize: "clamp(44px,6vw,80px)", lineHeight: 0.9, textTransform: "uppercase" };
const lead: CSSProperties = { margin: 0, fontSize: 17, lineHeight: 1.55, color: T.ink2 };
const section: CSSProperties = { maxWidth: 1280, margin: "0 auto", padding: "clamp(80px,10vw,140px) clamp(16px,4vw,40px)" };
const pill = (extra: CSSProperties): CSSProperties => ({ display: "flex", alignItems: "center", borderRadius: 999, ...extra });
const ctaLight: CSSProperties = { ...pill({ height: 44, padding: "0 18px", background: T.ink, color: T.bg, fontSize: 15, fontWeight: 600 }), textDecoration: "none" };

const brl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cl = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => 1 - Math.pow(1 - x, 3);

const STEPS: [string, string, LucideIcon, string, string, number][] = [
  ["01", "Roteiro", FileText, "O texto do take, no tom da sua influencer.", "R$ 0,12", 0.12],
  ["02", "Voz", Mic, "A voz dela lendo o roteiro, pronta pro lip sync.", "R$ 0,20", 0.2],
  ["03", "Imagem", ImageIcon, "A cena parada, com o rosto dela. Você revisa antes de seguir.", "R$ 0,41", 0.41],
  ["04", "Vídeo", Clapperboard, "Três clipes de 5s encadeados. A etapa mais cara, sempre confirmada.", "~R$ 5,67", 5.67],
  ["05", "Lip sync", AudioLines, "A boca acompanha a voz. Se falhar, o valor volta.", "~R$ 0,62", 0.62],
  ["06", "Montagem", Scissors, "Corte final em 9:16, pronto pra postar.", "R$ 0,00", 0],
];
const FAQS: [string, string][] = [
  ["Como funciona o saldo?", "Você recarrega via Pix a partir de R$ 20. Cada etapa mostra o custo previsto, reserva esse valor quando você confirma e cobra só o real quando termina. A diferença volta na hora."],
  ["E se a geração falhar?", "O valor reservado volta inteiro para o seu saldo e aparece no extrato como estorno. Você pode tentar de novo sem perder o que já foi feito nas etapas anteriores."],
  ["Por que o preço é \"previsto\"?", "Os modelos de IA cobram pelo que realmente processam. A gente mostra a melhor estimativa antes e o valor exato depois. Quase sempre o real sai igual ou abaixo."],
  ["Preciso de convite?", "Por enquanto, sim. O LabIA está em beta fechado: quem já usa pode te passar um código de acesso."],
  ["Posso usar a imagem da influencer em qualquer rede?", "Sim, o conteúdo gerado é seu. Você só precisa seguir as regras de cada rede para conteúdo feito com IA, como a sinalização de mídia sintética."],
];

function Wordmark({ size, style }: { size: number | string; style?: CSSProperties }) {
  return <span style={{ fontFamily: display, fontWeight: 900, fontSize: size, lineHeight: 1, ...trim, ...style }}>LAB<span style={{ color: T.cost }}>I</span>A</span>;
}

export function Landing() {
  const [lp, setLp] = useState(0);
  const [p, setP] = useState(0);
  const [m, setM] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [vw, setVw] = useState(1280);
  const [vh, setVh] = useState(800);
  const [step, setStep] = useState(3);
  const [n, setN] = useState(12);
  const [faq, setFaq] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const iRef = useRef<HTMLSpanElement>(null);
  const paused = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const h = heroRef.current, s = stickyRef.current, i = iRef.current;
      if (!h || !s || !i) return;
      const r = h.getBoundingClientRect(), sr = s.getBoundingClientRect(), ir = i.getBoundingClientRect();
      setP(cl(-r.top / Math.max(1, r.height - sr.height)));
      setM({ x: ir.left - sr.left, y: ir.top - sr.top, w: ir.width, h: ir.height });
      setVw(sr.width); setVh(sr.height);
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = reduce ? [] : [setTimeout(() => setLp(1), 700), setTimeout(() => setLp(2), 1500)];
    if (reduce) setLp(2);
    timers.push(setTimeout(onScroll, 50), setTimeout(onScroll, 1700));
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.fonts?.ready.then(onScroll);
    const tick = setInterval(() => { if (!paused.current && !reduce) setStep((s) => (s + 1) % 6); }, 1600);
    return () => { window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onScroll); timers.forEach(clearTimeout); clearInterval(tick); };
  }, []);

  const mob = vw < 860;
  const t = ease(cl(p / 0.42));
  const eh = mob ? Math.min(vh * 0.56, 540) : Math.min(vh * 0.78, 660);
  const ew = (eh * 9) / 16;
  const ex = vw / 2 - ew / 2, ey = mob ? vh * 0.62 - eh / 2 : vh / 2 - eh / 2 + 20;
  const s0 = m ? { x: m.x + m.w * 0.17, y: m.y, w: m.w * 0.66, h: m.h } : { x: vw / 2 - 20, y: vh / 2 - 60, w: 40, h: 120 };
  const L = (a: number, b: number) => a + (b - a) * t;
  const fw = L(s0.w, ew), fh = L(s0.h, eh);
  const q = cl((p - 0.52) / 0.4);
  const stg = q < 0.34 ? 0 : q < 0.67 ? 1 : 2;
  const g = cl((q - 0.34) / 0.33);
  let acc = 0;
  const cum = STEPS.map((s) => (acc += s[5]));
  const monthly = n * 7.02;
  const pack = [20, 50, 100, 200, 500].find((v) => v >= monthly) ?? 500;
  const sideTop = mob ? "84px" : vh / 2 - 90 + "px";
  const sideW = mob ? "50%" : Math.max(0, ex - 24) + "px";
  const sideSize = mob ? "40px" : "clamp(48px,6.4vw,112px)";
  const chipOn: CSSProperties = { background: T.cost, color: T.onCost, fontWeight: 600 };
  const costChip = (extra: CSSProperties): CSSProperties => pill({ height: 26, padding: "0 9px", fontFamily: mono, fontSize: 12, ...extra });
  const doneRow = (label: string, cost: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, borderBottom: `1px solid ${T.line}` }}>
      <CircleCheck size={18} /><span style={{ flex: 1, fontSize: 15 }}>{label}</span><span style={costChip(chipOn)}>{cost}</span>
    </div>
  );

  return (
    <div id="topo" style={{ ...DARK, fontFamily: "var(--font-ui), system-ui, sans-serif", color: T.ink, background: T.bg, minHeight: "100vh", scrollBehavior: "smooth" }}>
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 20, height: 64, display: "flex", alignItems: "center", gap: 16, padding: "0 clamp(16px,3vw,40px)", background: "rgba(11,11,12,.72)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(44,44,48,.6)" }}>
        <a href="#topo" aria-label="LabIA, início" style={{ textDecoration: "none", color: T.ink, opacity: cl((p - 0.15) / 0.15), display: "flex", alignItems: "center", minHeight: 44 }}><Wordmark size={26} /></a>
        {!mob && (
          <nav style={{ display: "flex", gap: 4, marginLeft: 16, fontSize: 15 }}>
            {[["#como", "Como funciona"], ["#preco", "Preço"], ["#telas", "Produto"], ["#duvidas", "Dúvidas"]].map(([h, l]) => (
              <a key={h} href={h} className="lp-nav" style={{ height: 44, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 999, color: T.ink2, textDecoration: "none" }}>{l}</a>
            ))}
          </nav>
        )}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" className="lp-nav" style={{ ...pill({ height: 44, padding: "0 14px", fontSize: 15, fontWeight: 500 }), color: T.ink, textDecoration: "none" }}>Entrar</Link>
          <Link href="/acesso" style={ctaLight}>Tenho um código</Link>
        </span>
      </header>

      <section ref={heroRef} style={{ position: "relative", height: "260vh" }}>
        <div ref={stickyRef} style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "flex-end", fontFamily: display, fontWeight: 900, fontSize: "clamp(110px,23vw,320px)", lineHeight: 1, letterSpacing: "-.01em" }}>
              <span style={{ display: "block", overflow: "hidden", maxWidth: lp >= 1 ? "2em" : "0em", transition: "max-width 700ms cubic-bezier(.2,.8,.2,1)", ...trim, transform: `translateX(${-t * vw * 0.6}px)`, opacity: 1 - cl(p / 0.22) }}>LAB</span>
              <span ref={iRef} style={{ display: "block", color: T.cost, ...trim, opacity: p > 0.004 ? 0 : 1 }}>I</span>
              <span style={{ display: "block", overflow: "hidden", maxWidth: lp >= 2 ? "1em" : "0em", transition: "max-width 700ms cubic-bezier(.2,.8,.2,1)", ...trim, transform: `translateX(${t * vw * 0.6}px)`, opacity: 1 - cl(p / 0.22) }}>A</span>
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "clamp(64px,14vh,140px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "0 24px", textAlign: "center", opacity: lp >= 2 ? 1 - cl(p / 0.1) : 0, transition: "opacity 400ms" }}>
            <p style={{ margin: 0, fontSize: "clamp(17px,2vw,22px)", lineHeight: 1.4, maxWidth: 560, textWrap: "pretty" }}>Conteúdo para influencers de IA, etapa por etapa. Você vê o preço em reais antes de cada take e confere o valor real depois.</p>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: T.ink2 }}><ArrowDown size={14} />Role pra ver um take</span>
          </div>

          <div style={{ position: "absolute", left: L(s0.x, ex), top: L(s0.y, ey), width: fw, height: fh, borderRadius: L(2, 30), background: T.cost, opacity: p > 0.004 ? 1 : 0, overflow: "hidden", boxShadow: `0 40px 120px rgba(200,255,46,${(0.22 * t).toFixed(3)})` }}>
            <div style={{ position: "absolute", left: 5, top: 5, width: 390, height: 693, transform: `scale(${((fw - 10) / 390).toFixed(4)})`, transformOrigin: "0 0", borderRadius: 24, overflow: "hidden", background: T.bg, opacity: cl((p - 0.3) / 0.14), display: "flex", flexDirection: "column" }}>
              <div style={{ height: 60, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderBottom: `1px solid ${T.line}` }}>
                <Wordmark size={24} />
                <span style={{ ...pill({ height: 40, gap: 8, padding: "0 12px", border: `1.5px solid ${T.cost}`, fontFamily: mono, fontSize: 15, color: T.cost }), marginLeft: "auto" }}><span style={{ fontSize: 11, color: T.ink2 }}>saldo</span>{["R$ 42,10", "R$ 36,43", "R$ 36,69"][stg]}</span>
                <span style={{ width: 40, height: 40, borderRadius: "50%", background: T.s2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>DP</span>
              </div>
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1, position: "relative" }}>
                <span style={{ fontSize: 13, color: T.ink2, display: "flex", alignItems: "center", gap: 4 }}><ChevronLeft size={15} />Lia Moraes</span>
                <span style={{ fontFamily: display, fontWeight: 900, fontSize: 38, lineHeight: 0.92, textTransform: "uppercase" }}>3 hábitos de quem acorda às 5h</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }}>
                  <div style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontFamily: mono, fontSize: 11, color: T.ink2 }}>gasto ✓</span><span style={{ fontFamily: mono, fontSize: 19 }}>{stg === 2 ? "R$ 6,14" : "R$ 0,73"}</span></div>
                  <div style={{ padding: "10px 0 10px 14px", borderLeft: `1px solid ${T.line}`, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontFamily: mono, fontSize: 11, color: T.ink2 }}>total previsto</span><span style={{ fontFamily: mono, fontSize: 19, color: T.cost }}>~R$ 7,02</span></div>
                </div>
                {doneRow("Roteiro e voz", "R$ 0,32 ✓")}
                {doneRow("Imagem", "R$ 0,41 ✓")}
                <div style={{ borderRadius: 20, background: T.surface, boxShadow: `inset 0 0 0 1.5px ${stg === 2 ? T.lineStrong : T.cost}`, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontFamily: display, fontWeight: 900, fontSize: 24, lineHeight: 1, textTransform: "uppercase" }}>04 · Vídeo</span><span style={{ marginLeft: "auto", fontSize: 12, color: [T.warn, T.info, T.ink][stg] }}>{["Aprovar custo", "Gerando", "Pronto"][stg]}</span></div>
                  <div style={{ display: "flex", gap: 6 }}>{["Seedance 2.5", "3 × 5s"].map((c) => <span key={c} style={pill({ height: 28, padding: "0 10px", background: T.s2, fontSize: 12 })}>{c}</span>)}</div>
                  {stg === 0 && <div style={{ ...pill({ height: 52, padding: "0 6px 0 20px", background: T.cost, color: T.onCost, fontWeight: 600, fontSize: 16, justifyContent: "space-between" }) }}>Gerar take<span style={pill({ height: 40, padding: "0 12px", background: T.onCost, color: T.cost, fontFamily: mono, fontSize: 14 })}>~R$ 5,67</span></div>}
                  {stg === 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 4 }}>{[0.05, 0.4, 0.8].map((k, i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: g > k ? T.cost : T.s3 }} />)}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: mono, fontSize: 13 }}><span style={{ color: T.ink2 }}>clipe {Math.min(3, 1 + Math.floor(g * 3))} de 3</span><span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="lp-blink" style={{ width: 7, height: 7, borderRadius: "50%", background: T.cost }} />R$ 5,67 reservado</span></div>
                    </div>
                  )}
                  {stg === 2 && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 13, color: T.ink2 }}>previsto ~R$ 5,67</span><span style={pill({ height: 36, padding: "0 14px", background: T.cost, color: T.onCost, fontFamily: mono, fontSize: 15, fontWeight: 600 })}>R$ 5,41 ✓</span></div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, borderBottom: `1px solid ${T.line}`, color: T.ink2 }}><CircleDashed size={18} /><span style={{ flex: 1, fontSize: 15 }}>Lip sync</span><span style={costChip({ border: `1.5px solid ${T.cost}`, color: T.cost })}>~R$ 0,62</span></div>
                {stg === 2 && (
                  <div style={{ position: "absolute", left: 10, right: 10, top: 8, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 20, background: T.s2, boxShadow: `0 20px 40px rgba(0,0,0,.6), inset 0 0 0 1px ${T.lineStrong}` }}>
                    <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: T.cost, color: T.onCost, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={16} /></span>
                    <span style={{ fontSize: 13, lineHeight: 1.35 }}>Take pronto. Saiu por <span style={{ fontFamily: mono, color: T.cost }}>R$ 5,41</span>, R$ 0,26 abaixo do previsto.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ position: "absolute", top: sideTop, left: 0, width: sideW, padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14, textAlign: "right", opacity: cl((p - 0.4) / 0.1) }}>
            <span style={{ fontFamily: display, fontWeight: 900, fontSize: sideSize, lineHeight: 0.86, textTransform: "uppercase" }}>O preço<br />antes</span>
            <span style={pill({ height: 36, padding: "0 14px", border: `1.5px solid ${T.cost}`, color: T.cost, fontFamily: mono, fontSize: 15 })}>~R$ 5,67 previsto</span>
          </div>
          <div style={{ position: "absolute", top: sideTop, right: 0, width: sideW, padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, opacity: cl((p - 0.5) / 0.1) }}>
            <span style={{ fontFamily: display, fontWeight: 900, fontSize: sideSize, lineHeight: 0.86, textTransform: "uppercase" }}>E o real<br />depois.</span>
            <span style={pill({ height: 36, padding: "0 14px", background: stg === 2 ? T.cost : T.s2, color: stg === 2 ? T.onCost : T.ink2, fontFamily: mono, fontSize: 15, fontWeight: 600 })}>{stg === 2 ? "R$ 5,41 ✓ real" : "aguardando…"}</span>
          </div>
          <div style={{ position: "absolute", left: "clamp(16px,3vw,40px)", right: "clamp(16px,3vw,40px)", bottom: 20, display: "flex", alignItems: "center", gap: 12, fontFamily: mono, fontSize: 12, color: T.ink2 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="lp-blink" style={{ width: 7, height: 7, borderRadius: "50%", background: T.cost }} />REC</span>
            <span>00:{String(Math.round(p * 15)).padStart(2, "0")} / 00:15</span>
            <span style={{ flex: 1, height: 2, borderRadius: 1, background: T.line, position: "relative" }}><span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(p * 100).toFixed(1)}%`, background: T.ink }} /></span>
            <span>9:16 · 15s</span>
          </div>
        </div>
      </section>

      <section style={{ ...section, paddingTop: "clamp(80px,12vw,160px)", paddingBottom: "clamp(80px,12vw,160px)" }}>
        <p style={{ margin: 0, fontFamily: display, fontWeight: 900, fontSize: "clamp(44px,7vw,104px)", lineHeight: 0.9, textTransform: "uppercase", textWrap: "balance" }}>Crie a influencer. Grave o conteúdo. <span style={{ color: T.ink2 }}>Pague só o take que você gerou,</span> em reais, sem assinatura.</p>
      </section>

      <section id="como" style={{ ...section, paddingTop: 0, display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640 }}>
            <h2 style={h2}>Seis etapas. Cada uma com preço.</h2>
            <p style={lead}>Influencer, conteúdo, etapas. Você aprova uma etapa de cada vez e vê quanto ela custa antes de apertar.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontFamily: mono, fontSize: 12, color: T.ink2 }}>acumulado neste vídeo</span>
            <span style={{ fontFamily: display, fontWeight: 900, fontSize: "clamp(56px,7vw,96px)", lineHeight: 0.85, color: T.cost }}>R$ {brl(cum[step])}</span>
            <span style={{ fontFamily: mono, fontSize: 13, color: T.ink2 }}>de ~R$ 7,02 previstos</span>
          </div>
        </div>
        <div style={{ position: "relative", height: 4, borderRadius: 2, background: T.line }}>
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${((step + 1) / 6) * 100}%`, borderRadius: 2, background: T.cost, transition: "width 600ms cubic-bezier(.2,.8,.2,1)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
          {STEPS.map(([num, name, Icon, desc, cost], i) => (
            <button key={num} type="button" className="lp-btn" aria-pressed={i === step} onClick={() => { paused.current = true; setStep(i); }}
              style={{ textAlign: "left", border: 0, color: T.ink, minHeight: 200, padding: 18, borderRadius: 20, background: T.surface, boxShadow: i === step ? `inset 0 0 0 2px ${T.cost}` : `inset 0 0 0 1px ${T.line}`, display: "flex", flexDirection: "column", gap: 14, transition: "box-shadow 200ms" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}><span style={{ fontFamily: mono, fontSize: 12, color: T.ink2 }}>{num}</span><Icon size={22} /></span>
              <span style={{ fontFamily: display, fontWeight: 900, fontSize: 30, lineHeight: 0.95, textTransform: "uppercase" }}>{name}</span>
              <span style={{ fontSize: 14, lineHeight: 1.45, color: T.ink2 }}>{desc}</span>
              <span style={{ marginTop: "auto", ...pill({ height: 30, padding: "0 11px", fontFamily: mono, fontSize: 13 }), ...(i < step ? chipOn : i === step ? { border: `1.5px solid ${T.cost}`, color: T.cost } : { border: `1.5px solid ${T.lineStrong}`, color: T.ink2 }) }}>{i < step ? cost.replace("~", "") + " ✓" : cost}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="preco" style={{ background: T.surface, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ ...section, display: "flex", flexDirection: "column", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
            <h2 style={h2}>Você vê o preço duas vezes.</h2>
            <p style={lead}>Uma antes de gerar, outra quando termina. Se sair mais barato, a diferença volta na hora. Se falhar, volta tudo.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 20, alignItems: "stretch" }}>
            <div style={{ borderRadius: 28, background: T.bg, boxShadow: `inset 0 0 0 1px ${T.line}`, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
              <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: ".08em", color: T.ink2 }}>ANTES · CONFIRMAR TAKE 04</span>
              <span style={{ fontFamily: display, fontWeight: 900, fontSize: "clamp(72px,9vw,120px)", lineHeight: 0.85, color: T.cost }}>~R$ 5,67</span>
              <div style={{ display: "flex", flexDirection: "column", fontFamily: mono, fontSize: 14 }}>
                {[["saldo agora", "R$ 42,10"], ["reserva", "−R$ 5,67"]].map(([a, b]) => <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.line}` }}><span style={{ color: T.ink2 }}>{a}</span><span>{b}</span></div>)}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontWeight: 600 }}><span>saldo depois</span><span>~R$ 36,43</span></div>
              </div>
              <div style={{ marginTop: "auto", ...pill({ height: 56, padding: "0 6px 0 22px", background: T.cost, color: T.onCost, fontWeight: 600, fontSize: 16, justifyContent: "space-between" }) }}>Gerar take<span style={pill({ height: 44, padding: "0 14px", background: T.onCost, color: T.cost, fontFamily: mono, fontSize: 15 })}>~R$ 5,67</span></div>
            </div>
            <div style={{ borderRadius: 28, background: T.bg, boxShadow: `inset 0 0 0 1px ${T.line}`, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
              <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: ".08em", color: T.ink2 }}>DEPOIS · EXTRATO</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}><span style={{ fontFamily: display, fontWeight: 900, fontSize: "clamp(72px,9vw,120px)", lineHeight: 0.85 }}>R$ 5,41</span><span style={pill({ height: 32, padding: "0 12px", background: T.cost, color: T.onCost, fontFamily: mono, fontSize: 14, fontWeight: 600 })}>−R$ 0,26 de volta</span></div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[["Vídeo · Lia · 3 hábitos", "~5,67", "−R$ 5,41"], ["Imagem · Lia · 3 hábitos", "~0,44", "−R$ 0,41"], ["Lip sync · falhou", "estorno", "R$ 0,00"]].map(([a, b, c]) => (
                  <div key={a} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 14, alignItems: "center", minHeight: 48, borderBottom: `1px solid ${T.line}`, fontSize: 14 }}><span>{a}</span><span style={{ fontFamily: mono, color: T.ink2, textDecoration: b.startsWith("~") ? "line-through" : "none" }}>{b}</span><span style={{ fontFamily: mono }}>{c}</span></div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 14, alignItems: "center", minHeight: 48, fontSize: 14 }}><span>Recarga via Pix</span><span style={{ fontFamily: mono, color: T.cost }}>+R$ 50,00</span></div>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 24, borderTop: `1px solid ${T.line}`, paddingTop: 32 }}>
            {[["Sem assinatura", "Você recarrega quando quiser. Saldo não expira."], ["Sem créditos", "Tudo em reais, com centavos. Nada de conversão de moeda inventada."], ["Falhou, voltou", "Se a geração falhar, o valor reservado volta ao saldo na hora."]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontFamily: display, fontWeight: 900, fontSize: 28, lineHeight: 1, textTransform: "uppercase" }}>{a}</span><span style={{ fontSize: 15, lineHeight: 1.5, color: T.ink2 }}>{b}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...section, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 48, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={h2}>Quanto custa um mês de reels?</h2>
          <p style={lead}>Estimativa com o fluxo padrão: vídeo 9:16 de 15s com lip sync. O valor real depende do modelo e aparece em cada etapa.</p>
        </div>
        <div style={{ borderRadius: 28, background: T.surface, boxShadow: `inset 0 0 0 1px ${T.line}`, padding: "clamp(20px,3vw,32px)", display: "flex", flexDirection: "column", gap: 24 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}><span style={{ fontSize: 15, fontWeight: 500 }}>Vídeos por mês</span><span style={{ fontFamily: display, fontWeight: 900, fontSize: 48, lineHeight: 0.9 }}>{n}</span></span>
            <input type="range" min={1} max={60} step={1} value={n} onChange={(e) => setN(+e.target.value)} aria-label="Vídeos por mês" style={{ width: "100%", height: 44, margin: 0, accentColor: "#C8FF2E" }} />
            <span style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 12, color: T.ink2 }}><span>1</span><span>1 por dia · 30</span><span>60</span></span>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 20, borderTop: `1px solid ${T.line}` }}>
            <span style={{ fontFamily: mono, fontSize: 12, color: T.ink2 }}>por mês, aproximado</span>
            <span style={{ fontFamily: display, fontWeight: 900, fontSize: "clamp(64px,8vw,104px)", lineHeight: 0.85, color: T.cost }}>~R$ {brl(monthly)}</span>
            <span style={{ fontFamily: mono, fontSize: 13, color: T.ink2 }}>{n} × ~R$ 7,02 · recarga sugerida R$ {pack} via Pix</span>
          </div>
          <Link href="/acesso" style={{ ...pill({ height: 56, justifyContent: "center", background: T.ink, color: T.bg, fontWeight: 600, fontSize: 16 }), textDecoration: "none" }}>Tenho um código</Link>
        </div>
      </section>

      <section id="telas" style={{ borderTop: `1px solid ${T.line}`, padding: "clamp(80px,10vw,140px) 0", overflow: "hidden" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", display: "flex", flexDirection: "column", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
            <h2 style={h2}>Feito pro celular. Igual ao seu feed.</h2>
          </div>
          <div style={{ display: "flex", gap: 24, overflowX: "auto", padding: "8px 4px 24px", scrollSnapType: "x mandatory" }}>
            <Phone caption="Influencers · quanto cada uma já custou" bar={<><Wordmark size={22} /><span style={{ ...pill({ height: 36, padding: "0 10px", border: `1.5px solid ${T.cost}`, fontFamily: mono, fontSize: 13, color: T.cost }), marginLeft: "auto" }}>R$ 42,10</span></>}>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontFamily: display, fontWeight: 900, fontSize: 34, lineHeight: 0.9, textTransform: "uppercase" }}>Suas influencers</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[["Lia Moraes", "14 · R$ 86,40"], ["Theo Reis", "6 · R$ 38,15"], ["Nina Sol", "2 · R$ 12,90"]].map(([a, b]) => (
                    <div key={a} style={{ borderRadius: 12, background: T.surface, overflow: "hidden" }}><div style={{ aspectRatio: "4/5", background: `repeating-linear-gradient(135deg,${T.s2} 0 8px,${T.s3} 8px 16px)` }} /><div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 3 }}><span style={{ fontFamily: display, fontWeight: 900, fontSize: 19, lineHeight: 1, textTransform: "uppercase" }}>{a}</span><span style={{ fontFamily: mono, fontSize: 12, color: T.ink2 }}>{b}</span></div></div>
                  ))}
                  <div style={{ borderRadius: 12, border: `1.5px dashed ${T.lineStrong}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: T.ink2, fontSize: 13 }}><Plus size={22} />Nova</div>
                </div>
              </div>
            </Phone>
            <Phone caption="Confirmação · o preço é o herói" bar={<><X size={20} /><span style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".08em", color: T.ink2 }}>CONFIRMAR TAKE 04</span></>}>
              <div style={{ flex: 1, padding: "18px 18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".06em", color: T.ink2 }}>VÍDEO · SEEDANCE 2.5 · 3 × 5S</span>
                <span style={{ fontFamily: display, fontWeight: 900, fontSize: 76, lineHeight: 0.85, color: T.cost }}>~R$ 5,67</span>
                <span style={{ fontSize: 13, color: T.ink2 }}>previstos para 15 segundos de vídeo</span>
                <div style={{ display: "flex", flexDirection: "column", fontFamily: mono, fontSize: 13 }}>
                  {[["agora", "R$ 42,10"], ["reserva", "−R$ 5,67"]].map(([a, b]) => <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${T.line}` }}><span style={{ color: T.ink2 }}>{a}</span><span>{b}</span></div>)}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", fontWeight: 600 }}><span>depois</span><span>~R$ 36,43</span></div>
                </div>
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ position: "relative", overflow: "hidden", ...pill({ height: 56, background: T.cost, color: T.onCost, justifyContent: "center", fontWeight: 700, fontSize: 15 }) }}>Segure para gerar<span style={{ position: "absolute", left: 0, bottom: 0, height: 5, width: "62%", background: T.onCost, opacity: 0.55 }} /></div>
                  <div style={pill({ height: 44, border: `1.5px solid ${T.lineStrong}`, justifyContent: "center", fontWeight: 600, fontSize: 14 })}>Agora não</div>
                </div>
              </div>
            </Phone>
            <Phone caption="Saldo e extrato · centavo por centavo" bar={<Wordmark size={22} />}>
              <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".08em", color: T.ink2 }}>SALDO</span>
                <span style={{ fontFamily: display, fontWeight: 900, fontSize: 68, lineHeight: 0.85, color: T.cost }}>R$ 36,69</span>
                <div style={pill({ height: 44, background: T.ink, color: T.bg, justifyContent: "center", fontWeight: 600, fontSize: 14 })}>Recarregar via Pix</div>
                <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".08em", color: T.ink2, marginTop: 6 }}>EXTRATO · HOJE</span>
                <div style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>
                  {[["Vídeo · Lia", "−5,41 ✓", T.ink], ["Imagem · Lia", "−0,41 ✓", T.ink], ["Roteiro e voz · Lia", "−0,32 ✓", T.ink], ["Lip sync · estorno", "0,00", T.ink2], ["Recarga Pix", "+50,00", T.cost]].map(([a, b, c], i, arr) => (
                    <div key={a} style={{ display: "flex", justifyContent: "space-between", gap: 10, minHeight: 44, alignItems: "center", borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 0 }}><span style={{ color: i === 3 ? T.ink2 : T.ink }}>{a}</span><span style={{ fontFamily: mono, color: c }}>{b}</span></div>
                  ))}
                </div>
              </div>
            </Phone>
          </div>
        </div>
      </section>

      <section id="duvidas" style={{ ...section, maxWidth: 960, display: "flex", flexDirection: "column", gap: 32 }}>
        <h2 style={h2}>Dúvidas</h2>
        <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${T.line}` }}>
          {FAQS.map(([qu, a], i) => (
            <div key={qu} style={{ borderBottom: `1px solid ${T.line}` }}>
              <button type="button" className="lp-btn" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)} style={{ width: "100%", minHeight: 72, padding: "16px 0", border: 0, background: "transparent", color: T.ink, display: "flex", alignItems: "center", gap: 16, textAlign: "left" }}>
                <span style={{ flex: 1, fontSize: "clamp(18px,2vw,22px)", fontWeight: 600, letterSpacing: "-.01em" }}>{qu}</span>
                <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", background: T.s2, display: "flex", alignItems: "center", justifyContent: "center" }}>{faq === i ? <Minus size={20} /> : <Plus size={20} />}</span>
              </button>
              {faq === i && <p style={{ margin: 0, padding: "0 60px 24px 0", fontSize: 16, lineHeight: 1.6, color: T.ink2, textWrap: "pretty" }}>{a}</p>}
            </div>
          ))}
        </div>
      </section>

      <section id="convite" style={{ borderTop: `1px solid ${T.line}`, padding: "clamp(80px,12vw,160px) clamp(16px,4vw,40px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 32, textAlign: "center" }}>
        <Wordmark size="clamp(96px,20vw,280px)" />
        <p style={{ margin: 0, fontSize: "clamp(17px,2vw,20px)", lineHeight: 1.5, color: T.ink2, maxWidth: 520 }}>Acesso por convite enquanto a gente cresce com calma. Recebeu um código? Entre agora.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          <Link href="/acesso" style={{ ...pill({ height: 56, padding: "0 26px", background: T.ink, color: T.bg, fontWeight: 600, fontSize: 16 }), textDecoration: "none" }}>Entrar com código</Link>
          <Link href="/login" style={{ ...pill({ height: 56, padding: "0 26px", border: `1.5px solid ${T.lineStrong}`, color: T.ink, fontWeight: 600, fontSize: 16 }), textDecoration: "none" }}>Já tenho conta</Link>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${T.line}`, padding: "28px clamp(16px,4vw,40px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 20px", fontSize: 14, color: T.ink2 }}>
        <Wordmark size={20} style={{ color: T.ink }} />
        <span>© 2026 LabIA</span>
        <span style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 4 }}>
          <Link href="/termos" style={{ minHeight: 44, display: "flex", alignItems: "center", padding: "0 10px", color: T.ink2 }}>Termos de uso</Link>
          <Link href="/privacidade" style={{ minHeight: 44, display: "flex", alignItems: "center", padding: "0 10px", color: T.ink2 }}>Privacidade</Link>
        </span>
      </footer>

      <style>{`
        .lp-blink{animation:lp-blink 1s steps(1) infinite}
        @keyframes lp-blink{0%,49%{opacity:1}50%,100%{opacity:.25}}
        .lp-nav:hover{color:var(--lab-text)!important;background:var(--lab-surface-2)}
        .lp-btn:focus-visible,a:focus-visible{outline:none;box-shadow:0 0 0 2px var(--lab-bg),0 0 0 4px var(--lab-reagent)}
        .lp-btn{cursor:pointer;font:inherit}
        html{scroll-behavior:smooth}
        @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
      `}</style>
    </div>
  );
}

function Phone({ bar, caption, children }: { bar: React.ReactNode; caption: string; children: React.ReactNode }) {
  return (
    <div style={{ flexShrink: 0, scrollSnapAlign: "start", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 300, height: 620, borderRadius: 40, background: T.bg, boxShadow: `0 0 0 7px ${T.s3}, 0 30px 60px rgba(0,0,0,.5)`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", borderBottom: `1px solid ${T.line}` }}>{bar}</div>
        {children}
      </div>
      <span style={{ fontFamily: mono, fontSize: 12, color: T.ink2 }}>{caption}</span>
    </div>
  );
}
