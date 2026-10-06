import { LegalPage, type LegalSection } from "@/components/app/legal-page";
import { creditsText, PLAN_CREDITS, planPriceText } from "@/lib/plan";

export const metadata = { title: "Termos de Uso · LabIA" };

// DRAFT for a lawyer's review before launch (see PROJECT_STATUS.md). Material changes bump CURRENT_TERMS_VERSION.
const sections: LegalSection[] = [
  { heading: "1. O que é a LabIA", paragraphs: ["A LabIA é uma ferramenta para criar conteúdo com personagens gerados por inteligência artificial: você define a aparência e o tom de um personagem, gera imagens e vídeos com ele e organiza essas produções em um só lugar. Durante a beta, o acesso é por convite e o serviço pode mudar sem aviso prévio."] },
  { heading: "2. Sua conta", paragraphs: ["Você entra com uma conta Google ou com e-mail e senha, e precisa confirmar que o e-mail é seu. Você é responsável por manter suas credenciais em segurança e por tudo o que for feito com a sua conta. Avise a equipe em contato@labia.studio se suspeitar de uso indevido."] },
  { heading: "3. Imagens e pessoas reais", paragraphs: ["Você só pode enviar rostos, fotos, vídeos e referências que sejam seus ou que você tenha autorização para usar. Não use a LabIA para criar personagens que imitem uma pessoa real identificável sem o consentimento dela, nem para enganar alguém sobre quem está falando.", "É proibido gerar conteúdo sexual envolvendo menores de idade, conteúdo sexual de pessoas reais sem consentimento, discurso de ódio, assédio, fraude ou qualquer conteúdo ilegal. Podemos remover conteúdo e encerrar contas que violem estas regras."] },
  { heading: "4. Conteúdo gerado", paragraphs: ["O conteúdo que você cria é seu, dentro do que a lei e os termos dos provedores de IA permitem. Você é responsável por como o publica, inclusive por identificar conteúdo sintético quando a plataforma de destino ou a lei exigir.", "Resultados de IA podem sair diferentes do esperado. Revise cada geração antes de usar."] },
  { heading: "5. Assinatura e créditos", paragraphs: [`O acesso à LabIA é por assinatura mensal de ${planPriceText()}, cobrada no cartão de crédito pela Stripe e renovada automaticamente a cada mês. Você pode cancelar quando quiser na página Plano e créditos: o cancelamento vale para as próximas cobranças e não tem multa.`, `Cada mês pago libera ${creditsText(PLAN_CREDITS)} na sua conta. Cada geração mostra quantos créditos vai usar antes de você confirmar; os créditos são reservados na confirmação e, quando o custo final é apurado, a diferença volta. Se a geração falhar, os créditos que não foram usados voltam; em alguns erros do provedor a devolução depende de uma conferência da equipe.`, "Créditos não têm valor em dinheiro e não podem ser sacados nem transferidos. Valores pagos não são reembolsados, exceto quando a lei exigir, como no direito de arrependimento em até 7 dias da contratação."] },
  { heading: "6. Provedores de terceiros", paragraphs: ["As gerações são feitas por provedores externos de IA. Ao gerar, você também está sujeito às regras de uso desses provedores, que podem recusar um pedido."] },
  { heading: "7. Garantias e responsabilidade", paragraphs: ["A LabIA é fornecida como está, especialmente durante a beta. Não garantimos disponibilidade contínua nem um resultado específico de geração. Na medida permitida pela lei, não respondemos por danos indiretos decorrentes do uso do serviço."] },
  { heading: "8. Encerramento", paragraphs: ["Você pode excluir sua conta a qualquer momento em Conta > Acesso e segurança. A exclusão apaga personagens, produções, arquivos e histórico de créditos, e não pode ser desfeita. Podemos suspender contas que violem estes Termos."] },
  { heading: "9. Alterações", paragraphs: ["Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas e poderão exigir um novo aceite para continuar usando a LabIA."] },
  { heading: "10. Lei aplicável", paragraphs: ["Estes Termos seguem as leis da República Federativa do Brasil."] },
];

export default function TermsPage() {
  return <LegalPage title="Termos de Uso" intro="Estes Termos regem o uso da LabIA, operada por LABIA, inscrita no CNPJ 49.192.199/0001-96 (contato@labia.studio). Ao criar uma conta ou usar o serviço, você concorda com eles. Se não concordar, não use a LabIA." sections={sections} />;
}
