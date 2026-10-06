import { LegalPage, type LegalSection } from "@/components/app/legal-page";

export const metadata = { title: "Política de Privacidade · LabIA" };

// DRAFT for a lawyer's review before launch (see PROJECT_STATUS.md). Material changes bump CURRENT_TERMS_VERSION.
const sections: LegalSection[] = [
  { heading: "1. Quais dados tratamos", paragraphs: ["Conta: nome, e-mail, foto de perfil (se você enviar) e senha, guardada apenas como hash, nunca em texto. Se você entrar com Google, recebemos o e-mail, o nome e o identificador da sua conta Google.", "Produção: os personagens, roteiros, referências, imagens e vídeos que você envia ou gera, e o histórico de créditos e custos.", "Uso e segurança: registros técnicos necessários para operar o serviço e limitar abusos, como tentativas de acesso."] },
  { heading: "2. Para que usamos", paragraphs: ["Para prestar o serviço (gerar e guardar suas produções, calcular custos), manter sua conta segura (confirmação de e-mail, redefinição de senha, encerramento de sessões) e enviar mensagens sobre a sua conta. Não vendemos seus dados.", "As bases legais são a execução do contrato com você, o cumprimento de obrigações legais e o legítimo interesse em manter o serviço seguro."] },
  { heading: "3. Rostos e referências", paragraphs: ["Fotos e vídeos de referência que você envia são usados apenas para gerar as suas produções. Eles podem conter dados biométricos de quem aparece neles: só envie imagens de pessoas que autorizaram esse uso.", "Esses arquivos ficam em armazenamento privado e são enviados aos provedores de IA apenas no momento da geração, por links temporários."] },
  { heading: "4. Com quem compartilhamos", paragraphs: ["Com provedores que operam o serviço por nós: geração de imagens e vídeos por IA, hospedagem e armazenamento em nuvem, banco de dados, envio de e-mail, login com Google e cobrança da assinatura (Stripe, que recebe seu e-mail e os dados do cartão; a LabIA não vê nem guarda o número do cartão). Eles tratam os dados conforme nossas instruções e as próprias políticas.", "Alguns desses provedores processam dados fora do Brasil, com as salvaguardas previstas na LGPD."] },
  { heading: "5. Por quanto tempo", paragraphs: ["Enquanto sua conta existir. Ao excluir a conta, apagamos seus dados e arquivos, exceto o que a lei nos obrigar a guardar."] },
  { heading: "6. Seus direitos", paragraphs: ["Pela LGPD (Lei nº 13.709/2018), você pode confirmar o tratamento, acessar, corrigir, exportar e apagar seus dados, e revogar consentimentos. Em Conta você exporta seus dados e, em Acesso e segurança, exclui a conta. Para os demais pedidos, escreva para contato@labia.studio."] },
  { heading: "7. Segurança", paragraphs: ["Usamos senhas com hash, links de uso único que expiram, confirmação de identidade antes de mudanças sensíveis e armazenamento privado para arquivos. Nenhum sistema é totalmente imune a incidentes; se algo acontecer, avisaremos conforme a lei."] },
  { heading: "8. Menores de idade", paragraphs: ["A LabIA não é destinada a menores de 18 anos."] },
  { heading: "9. Alterações", paragraphs: ["Podemos atualizar esta Política. Mudanças relevantes serão comunicadas e poderão exigir um novo aceite."] },
];

export default function PrivacyPage() {
  return <LegalPage title="Política de Privacidade" intro="Esta Política explica quais dados pessoais a LabIA trata, para quê, com quem compartilha e como você exerce seus direitos, em conformidade com a Lei Geral de Proteção de Dados. A controladora dos dados é LABIA, inscrita no CNPJ 49.192.199/0001-96; fale com ela em contato@labia.studio." sections={sections} />;
}
