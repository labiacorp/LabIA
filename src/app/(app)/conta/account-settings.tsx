"use client";

import Link from "next/link";
import { useRef, type ReactNode, type RefObject } from "react";
import { ChevronRight, Wallet, ShieldCheck, Share2, Gift, X, LogOut, Camera } from "lucide-react";
import { AccountAvatar } from "@/components/app/account-avatar";
import { Modal } from "@/components/ui/modal";
import { AccountForm } from "./account-form";
import { AvatarForm } from "./avatar-form";
import { ReferralLink } from "./referral-link";
import { balanceCredits, creditsText } from "@/lib/plan";
import { REFERRAL_BONUS_BRL, REFERRAL_CAP_BRL } from "@/lib/referral-rules";
const brl = (v: number) => creditsText(balanceCredits(v));
import { logout } from "../actions";

export function SettingsDialog({ dialog, title, children }: { dialog: RefObject<HTMLDialogElement | null>; title: string; children: ReactNode }) {
  return <Modal dialog={dialog} label={title}>
    <div className="flex items-center justify-between gap-4"><h2 className="font-display text-[36px] font-black uppercase leading-[.95]">{title}</h2><button type="button" aria-label={`Fechar ${title.toLowerCase()}`} onClick={() => dialog.current?.close()} className="flex size-11 shrink-0 items-center justify-center rounded-full text-lab-text-dim hover:bg-lab-surface-2"><X className="size-5" /></button></div>
    <div>{children}</div>
  </Modal>;
}

export function AccountSettings({ name, email, avatarVersion, referralCode, referral: stats }: { name: string; email: string; avatarVersion?: number; referralCode: string; referral: { accounts: number; confirmed: number; earnedBrl: number; invites: number } }) {
  const profile = useRef<HTMLDialogElement>(null);
  const referral = useRef<HTMLDialogElement>(null);
  return <div className="account-settings">
    <h1 className="account-page-title">Conta</h1>
    <section className="account-identity" aria-label="Seu perfil">
      <button type="button" className="account-photo-button" aria-label="Editar foto e perfil" onClick={() => profile.current?.showModal()}><AccountAvatar name={name} version={avatarVersion} large /><span className="account-photo-badge"><Camera className="size-3.5" aria-hidden /></span></button>
      <h2>{name}</h2><p>{email}</p>
      <button type="button" className="account-edit-link" onClick={() => profile.current?.showModal()}>Editar perfil</button>
    </section>
    <section className="account-settings-section" aria-labelledby="account-settings-title">
      <h2 id="account-settings-title">Sua conta</h2>
      <div className="account-settings-group">
        <Link href="/saldo" className="account-settings-row"><span className="account-row-icon"><Wallet className="size-5" /></span><span className="account-row-label">Plano e créditos</span><ChevronRight className="account-chevron" /></Link>
        <Link href="/conta/seguranca" className="account-settings-row"><span className="account-row-icon"><ShieldCheck className="size-5" /></span><span className="account-row-label">Acesso e segurança</span><ChevronRight className="account-chevron" /></Link>
        <Link href="/integracoes" className="account-settings-row"><span className="account-row-icon"><Share2 className="size-5" /></span><span className="account-row-label">Integrations</span><ChevronRight className="account-chevron" /></Link>
      </div>
      <p className="account-group-caption">Seus arquivos de imagem e vídeo ficam na biblioteca.</p>
    </section>
    <section className="account-settings-section" aria-labelledby="account-invite-title" id="indicacoes">
      <h2 id="account-invite-title">Compartilhe a LabIA</h2>
      <div className="account-settings-group"><button type="button" className="account-settings-row" onClick={() => referral.current?.showModal()}><span className="account-row-icon"><Gift className="size-5" /></span><span className="account-row-label">Convidar alguém</span><span className="account-row-value">{stats.earnedBrl > 0 ? `${brl(stats.earnedBrl)} ganhos` : `Ganhe ${brl(REFERRAL_BONUS_BRL)}`}</span><ChevronRight className="account-chevron" /></button></div>
    </section>
    <form action={logout} className="account-signout"><button type="submit"><LogOut className="size-4" aria-hidden />Sair da conta</button></form>
    <SettingsDialog dialog={profile} title="Editar perfil"><AvatarForm name={name} version={avatarVersion} /><AccountForm name={name} /><div className="account-readonly-email"><span>E-mail de acesso</span><p>{email}</p></div></SettingsDialog>
    <SettingsDialog dialog={referral} title="Convide alguém"><p className="text-body-sm leading-6 text-lab-text-dim">No primeiro mês pago de quem você convidar, vocês dois ganham {brl(REFERRAL_BONUS_BRL)}.</p><ReferralLink code={referralCode} />
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">{([["Convites livres", String(stats.invites)], ["Contas criadas", String(stats.accounts)], ["Você ganhou", brl(stats.earnedBrl)]] as const).map(([label, value]) => <div key={label} className="rounded-lg bg-lab-bg p-3"><dt className="text-caption text-lab-text-muted">{label}</dt><dd className="font-display text-xl">{value}</dd></div>)}</dl>
      {stats.accounts > stats.confirmed && <p className="mt-3 text-caption text-lab-text-muted">{stats.accounts - stats.confirmed} {stats.accounts - stats.confirmed === 1 ? "conta ainda não assinou" : "contas ainda não assinaram"}.</p>}
      <details className="mt-3 text-body-sm text-lab-text-dim"><summary className="cursor-pointer py-2">Como funciona</summary><ul className="mt-2 grid list-disc gap-1 pl-5 leading-6"><li>Seu link deixa a pessoa entrar na beta sem código. Você tem 3 convites e ganha mais 3 a cada {brl(50)} usados em gerações.</li><li>A indicação conta na primeira conta criada em até 30 dias neste navegador.</li><li>O bônus entra quando a pessoa paga o primeiro mês: {brl(REFERRAL_BONUS_BRL)} para ela e {brl(REFERRAL_BONUS_BRL)} para você, até {brl(REFERRAL_CAP_BRL)} por pessoa que indica.</li><li>Os créditos de bônus servem para gerar e não viram dinheiro.</li></ul></details></SettingsDialog>
  </div>;
}
