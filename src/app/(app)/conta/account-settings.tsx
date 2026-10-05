"use client";

import Link from "next/link";
import { useRef, type ReactNode, type RefObject } from "react";
import { ChevronRight, Wallet, ShieldCheck, Download, Gift, X, LogOut, Camera } from "lucide-react";
import { AccountAvatar } from "@/components/app/account-avatar";
import { AccountForm } from "./account-form";
import { AvatarForm } from "./avatar-form";
import { SessionControls } from "./session-controls";
import { ReferralLink } from "./referral-link";
import { logout } from "../actions";

function SettingsDialog({ dialog, title, children }: { dialog: RefObject<HTMLDialogElement | null>; title: string; children: ReactNode }) {
  return <dialog ref={dialog} className="account-settings-dialog" aria-label={title} onClick={(event) => { if(event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className="account-dialog-heading"><h2>{title}</h2><button type="button" aria-label={`Fechar ${title.toLowerCase()}`} onClick={() => dialog.current?.close()}><X className="size-5" /></button></div>
    <div className="account-dialog-body">{children}</div>
  </dialog>;
}

export function AccountSettings({ name, email, avatarVersion, referralCode, referralCount }: { name: string; email: string; avatarVersion?: number; referralCode: string; referralCount: number }) {
  const profile = useRef<HTMLDialogElement>(null);
  const security = useRef<HTMLDialogElement>(null);
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
        <Link href="/saldo" className="account-settings-row"><span className="account-row-icon"><Wallet className="size-5" /></span><span className="account-row-label">Saldo e extrato</span><ChevronRight className="account-chevron" /></Link>
        <button type="button" className="account-settings-row" onClick={() => security.current?.showModal()}><span className="account-row-icon"><ShieldCheck className="size-5" /></span><span className="account-row-label">Acesso e segurança</span><ChevronRight className="account-chevron" /></button>
        <a href="/api/account/export" className="account-settings-row"><span className="account-row-icon"><Download className="size-5" /></span><span className="account-row-label">Exportar meus dados</span><span className="account-row-value">JSON</span><ChevronRight className="account-chevron" /></a>
      </div>
      <p className="account-group-caption">Seus arquivos de imagem e vídeo ficam na biblioteca.</p>
    </section>
    <section className="account-settings-section" aria-labelledby="account-invite-title" id="indicacoes">
      <h2 id="account-invite-title">Compartilhe a LabIA</h2>
      <div className="account-settings-group"><button type="button" className="account-settings-row" onClick={() => referral.current?.showModal()}><span className="account-row-icon"><Gift className="size-5" /></span><span className="account-row-label">Convidar alguém</span>{referralCount > 0 && <span className="account-row-value">{referralCount} {referralCount === 1 ? "indicação" : "indicações"}</span>}<ChevronRight className="account-chevron" /></button></div>
    </section>
    <form action={logout} className="account-signout"><button type="submit"><LogOut className="size-4" aria-hidden />Sair da conta</button></form>
    <SettingsDialog dialog={profile} title="Editar perfil"><AvatarForm name={name} version={avatarVersion} /><AccountForm name={name} /><div className="account-readonly-email"><span>E-mail de acesso</span><p>{email}</p></div></SettingsDialog>
    <SettingsDialog dialog={security} title="Acesso e segurança"><p className="text-body-sm leading-6 text-lab-text-dim">Encerre o acesso em todos os navegadores. Você precisará entrar novamente, inclusive neste dispositivo.</p><SessionControls /></SettingsDialog>
    <SettingsDialog dialog={referral} title="Convide alguém"><p className="text-body-sm leading-6 text-lab-text-dim">Compartilhe seu link com quem também cria.</p><ReferralLink code={referralCode} /><p className="mt-5 text-caption text-lab-text-muted">{referralCount} {referralCount === 1 ? "nova conta pela sua indicação" : "novas contas pela sua indicação"}</p><details className="mt-3 text-body-sm text-lab-text-dim"><summary className="cursor-pointer py-2">Como funciona</summary><p className="mt-2 leading-6">A indicação conta no primeiro cadastro em até 30 dias neste navegador. O acesso à beta depende da liberação da equipe. Indicações não concedem créditos.</p></details></SettingsDialog>
  </div>;
}
