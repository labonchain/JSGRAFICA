export type PriceMode = "FIXO" | "A_PARTIR_DE" | "SOB_CONSULTA";
export type ProductModeType =
  | "DIGITAL"
  | "PERSONALIZADO"
  | "IMPRESSO"
  | "PERSONALIZADO_IMPRESSO"
  | "IMPRESSO_ENVIO"
  | "FISICO";

export type CatalogMode = {
  id: number;
  tipo: ProductModeType;
  ativo: boolean;
  conteudo_incluido: unknown;
  preco: number | null;
  modo_preco: PriceMode;
  prazo: string;
  dados_cliente: unknown;
  regras_personalizacao: unknown;
  orcamento_obrigatorio: boolean;
  whatsapp_mensagem: string;
};

export type CatalogAsset = {
  id: number;
  tipo: "CAPA" | "MOCKUP" | "GALERIA";
  storage_bucket: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  ordem: number;
  largura: number | null;
  altura: number | null;
};

export type CatalogProduct = {
  produto_id: string | number;
  sku: string;
  slug: string;
  nome: string;
  categoria: string;
  familia: string | null;
  colecao_tema: string | null;
  versao: string;
  resumo_curto: string;
  descricao_publica: string;
  publico: string | null;
  problema_resolvido: string | null;
  ocasioes: unknown;
  diferenciais: unknown;
  narrativa_comercial: string | null;
  especificacao_digital: unknown;
  especificacao_fisica: unknown;
  entrega: unknown;
  licenca_direitos: unknown;
  tags: string[];
  destaque: boolean;
  seo_title: string;
  seo_description: string;
  modalidades: CatalogMode[];
  assets: CatalogAsset[];
};
