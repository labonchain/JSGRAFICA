export type Service = {
  name: string;
  slug: string;
  description: string;
  group: "graficos" | "digitais";
  icon: string;
  whatsappContext: string;
  image?: string;
};

export const services: Service[] = [
  { name: "Xerox", slug: "xerox", description: "Cópias rápidas para documentos e materiais do dia a dia.", group: "graficos", icon: "▤", whatsappContext: "xerox", image: "/images/servicos/xerox.jpg" },
  { name: "Impressão", slug: "impressao", description: "Impressão de arquivos e materiais em formatos usuais.", group: "graficos", icon: "▣", whatsappContext: "impressão", image: "/images/servicos/impressao.jpg" },
  { name: "Fotos", slug: "fotos", description: "Foto 3x4, formatos fotográficos e impressão de fotos para lembranças e documentos.", group: "graficos", icon: "◫", whatsappContext: "fotos", image: "/images/servicos/fotos.jpg" },
  { name: "Plastificação", slug: "plastificacao", description: "Proteção e acabamento para documentos e impressos.", group: "graficos", icon: "▰", whatsappContext: "plastificação" },
  { name: "Encadernação", slug: "encadernacao", description: "Organização e acabamento para apostilas e documentos.", group: "graficos", icon: "▥", whatsappContext: "encadernação", image: "/images/servicos/encadernacao.jpg" },
  { name: "Cadernos e Apostilas", slug: "cadernos-e-apostilas", description: "Montagem e impressão sob orientação do atendimento.", group: "graficos", icon: "▧", whatsappContext: "cadernos ou apostilas", image: "/images/servicos/cadernos.jpg" },
  { name: "Recarga de Celular e VEM", slug: "recarga-de-celular-e-vem", description: "Recarga de celular de qualquer operadora e recarga do cartão VEM.", group: "digitais", icon: "⇌", whatsappContext: "recarga de celular ou VEM", image: "/images/servicos/recarga.jpg" },
  { name: "Consulta CPF, Serasa e SCPC", slug: "consulta-cpf-serasa-e-scpc", description: "Consulta de CPF, Serasa, SCPC, cartórios e cheques.", group: "digitais", icon: "◍", whatsappContext: "consulta CPF, Serasa ou SCPC", image: "/images/servicos/consulta-cpf.jpg" },
  { name: "2ª Via de Contas", slug: "segunda-via-de-contas", description: "Apoio para localizar e imprimir documentos de consumo quando o serviço estiver disponível.", group: "digitais", icon: "↻", whatsappContext: "2ª via de conta", image: "/images/servicos/segunda-via.jpg" },
  { name: "Consulta e Impressão de Documentos", slug: "consulta-e-impressao-de-documentos", description: "Apoio para consulta e impressão de documentos digitais.", group: "digitais", icon: "⌕", whatsappContext: "consulta e impressão de documentos", image: "/images/servicos/consulta-documentos.jpg" },
  { name: "Acesso Gov.br", slug: "acesso-gov-br", description: "Suporte presencial para navegação e impressão, sem armazenar senhas do cliente.", group: "digitais", icon: "◎", whatsappContext: "suporte Gov.br", image: "/images/servicos/gov-br.jpg" },
  { name: "Declaração MEI", slug: "declaracao-mei", description: "Apoio operacional para consulta e impressão de documentos MEI.", group: "digitais", icon: "▱", whatsappContext: "declaração MEI", image: "/images/servicos/mei.jpg" },
  { name: "Licenciamento / Renovações", slug: "licenciamento-renovacoes", description: "Suporte de acesso e impressão conforme o serviço público disponível.", group: "digitais", icon: "◈", whatsappContext: "licenciamento ou renovação", image: "/images/servicos/licenciamento.jpg" },
  { name: "CadÚnico / Benefícios", slug: "cadunico-beneficios", description: "Apoio para acesso e impressão de informações quando aplicável.", group: "digitais", icon: "◇", whatsappContext: "CadÚnico ou benefícios", image: "/images/servicos/cadunico.jpg" },
];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug) ?? null;
}
