"use client";

import Link from "next/link";
import { useActionState, useRef, type ReactNode, type RefObject } from "react";
import { ChevronLeft, ChevronRight, KeyRound, Lock, LogOut, Mail, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password-rules";
import { logout } from "../../actions";
import { SettingsDialog } from "../account-settings";
import { SessionControls } from "../session-controls";
import { connectGoogle, deleteAccount, reauthWithGoogle, requestEmailChange, setPassword, type SecurityState } from "./actions";

const initial: SecurityState = { error: "" };

// One gate for the whole page, revealed only when a locked row is tapped, never one per control.
// The inline copy covers a session that aged out between opening a form and submitting it.
function Reauth({ googleReady }: { googleReady: boolean }) {
  return googleReady
    ? <form action={reauthWithGoogle}><Button type="submit" variant="secondary" size="lg" className="w-full">Continuar com Google</Button></form>
    : <form action={logout}><Button type="submit" variant="secondary" size="lg" className="w-full">Sair e entrar de novo</Button></form>;
}

function Result({ state, googleReady }: { state: SecurityState; googleReady: boolean }) {
  if (state.needsReauth) return <div className="grid gap-3"><p role="alert" className="text-body-sm text-lab-danger">{state.error}</p><Reauth googleReady={googleReady} /></div>;
  if (state.error) return <p role="alert" className="text-body-sm text-lab-danger">{state.error}</p>;
  return state.message ? <p role="status" className="text-body-sm text-lab-success">{state.message}</p> : null;
}

const CurrentPassword = () => <label className="grid gap-2 text-caption">Senha atual<Input name="currentPassword" type="password" required autoComplete="current-password" maxLength={PASSWORD_MAX} /></label>;

function Row({ icon, label, value, locked, onOpen }: { icon: ReactNode; label: string; value?: string; locked: boolean; onOpen: () => void }) {
  return <button type="button" className="account-settings-row" onClick={onOpen}><span className="account-row-icon">{icon}</span><span className="account-row-label" style={value ? { flex: "none" } : undefined}>{label}</span>{value ? <span className="account-row-value account-row-value-wide" title={value}>{value}</span> : null}{locked ? <Lock className="account-chevron" aria-label="Pede confirmação" /> : <ChevronRight className="account-chevron" />}</button>;
}

export function SecurityPanel({ email, hasPassword, googleBound, googleReady, emailChange, locked, notice }: { email: string; hasPassword: boolean; googleBound: boolean; googleReady: boolean; emailChange: boolean; locked: boolean; notice?: string }) {
  const gate = useRef<HTMLDialogElement>(null);
  const emailDialog = useRef<HTMLDialogElement>(null);
  const passwordDialog = useRef<HTMLDialogElement>(null);
  const sessionsDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const open = (dialog: RefObject<HTMLDialogElement | null>, sensitive = true) => (sensitive && locked ? gate : dialog).current?.showModal();
  const [emailState, emailAction, emailPending] = useActionState(requestEmailChange, initial);
  const [passwordState, passwordAction, passwordPending] = useActionState(setPassword, initial);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccount, initial);

  return <div className="account-settings">
    <Link href="/conta" className="mb-4 inline-flex min-h-11 items-center gap-1 text-body-sm text-lab-text-dim"><ChevronLeft className="size-4" aria-hidden />Conta</Link>
    <h1 className="account-page-title mb-6">Acesso e segurança</h1>
    {notice ? <div className="mb-6"><Alert variant="success" title={notice} /></div> : null}
    <section className="account-settings-section" aria-labelledby="security-access">
      <h2 id="security-access">Como você entra</h2>
      <div className="account-settings-group">
        {emailChange
          ? <Row icon={<Mail className="size-5" />} label="E-mail" value={email} locked={locked} onOpen={() => open(emailDialog)} />
          : <div className="account-settings-row" data-static><span className="account-row-icon"><Mail className="size-5" /></span><span className="account-row-label" style={{ flex: "none" }}>E-mail</span><span className="account-row-value account-row-value-wide" title={email}>{email}</span></div>}
        <Row icon={<KeyRound className="size-5" />} label="Senha" value={hasPassword ? "Definida" : "Não definida"} locked={locked} onOpen={() => open(passwordDialog)} />
        <div className="account-settings-row" data-static><span className="account-row-icon"><span aria-hidden className="text-caption font-bold">G</span></span><span className="account-row-label">Google</span><span className="account-row-value">{googleBound ? "Conectado" : "Não conectado"}</span>{!googleBound && googleReady ? <form action={connectGoogle}><Button type="submit" variant="secondary" size="sm">Conectar</Button></form> : null}</div>
      </div>
      <p className="account-group-caption">{googleBound ? "Você pode entrar com o Google ou com e-mail e senha, se tiver uma." : "Entre com o Google usando este mesmo e-mail para conectar a conta."}</p>
    </section>
    <section className="account-settings-section" aria-labelledby="security-sessions">
      <h2 id="security-sessions">Sessões</h2>
      <div className="account-settings-group"><Row icon={<LogOut className="size-5" />} label="Sair de todos os navegadores" locked={false} onOpen={() => open(sessionsDialog, false)} /></div>
    </section>
    <section className="account-settings-section" aria-labelledby="security-danger">
      <h2 id="security-danger">Zona de risco</h2>
      <div className="account-settings-group"><Row icon={<Trash2 className="size-5 text-lab-danger" />} label="Excluir conta" locked={locked} onOpen={() => open(deleteDialog)} /></div>
      <p className="account-group-caption">Apaga personagens, produções, arquivos e o histórico de créditos. Não pode ser desfeito.</p>
    </section>

    <SettingsDialog dialog={gate} title="Confirme que é você"><p className="mb-5 text-body-sm leading-6 text-lab-text-dim">Para mudar e-mail, senha ou excluir a conta, entre de novo com o Google. A confirmação vale por 5 minutos.</p><Reauth googleReady={googleReady} /></SettingsDialog>
    <SettingsDialog dialog={emailDialog} title="Alterar e-mail">
      <form action={emailAction} className="grid gap-3"><p className="text-body-sm leading-6 text-lab-text-dim">Enviaremos um link para o novo endereço. Até você confirmar, o e-mail atual continua valendo.</p><label className="grid gap-2 text-caption">Novo e-mail<Input name="newEmail" type="email" required autoComplete="email" /></label>{hasPassword ? <CurrentPassword /> : null}<Button size="lg" loading={emailPending}>Enviar link</Button><Result state={emailState} googleReady={googleReady} /></form>
    </SettingsDialog>
    <SettingsDialog dialog={passwordDialog} title={hasPassword ? "Alterar senha" : "Criar senha"}>
      <form action={passwordAction} className="grid gap-3">{hasPassword ? <><p className="text-body-sm leading-6 text-lab-text-dim">Ao salvar, os outros navegadores saem da conta.</p><CurrentPassword /></> : <p className="text-body-sm leading-6 text-lab-text-dim">Com uma senha, você também pode entrar com e-mail e senha.</p>}<label className="grid gap-2 text-caption">Nova senha<Input name="newPassword" type="password" required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} autoComplete="new-password" placeholder={`Mínimo de ${PASSWORD_MIN} caracteres`} /></label><Button size="lg" loading={passwordPending}>Salvar senha</Button><Result state={passwordState} googleReady={googleReady} /></form>
    </SettingsDialog>
    <SettingsDialog dialog={sessionsDialog} title="Sair de todos os navegadores"><p className="text-body-sm leading-6 text-lab-text-dim">Encerre o acesso em todos os navegadores. Você precisará entrar novamente, inclusive neste dispositivo.</p><SessionControls /></SettingsDialog>
    <SettingsDialog dialog={deleteDialog} title="Excluir conta">
      <form action={deleteAction} className="grid gap-3"><p className="text-body-sm leading-6 text-lab-text-dim">Seus personagens, produções, arquivos e histórico de saldo serão apagados. Saldo restante não é devolvido. Isso não pode ser desfeito.</p><label className="grid gap-2 text-caption">Digite EXCLUIR para confirmar<Input name="confirmation" required autoComplete="off" /></label>{hasPassword ? <CurrentPassword /> : null}<Button size="lg" variant="danger" loading={deletePending}>Excluir minha conta</Button><Result state={deleteState} googleReady={googleReady} /></form>
    </SettingsDialog>
  </div>;
}
