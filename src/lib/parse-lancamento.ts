/**
 * Interpretador de lançamentos em linguagem natural.
 *
 * Transforma frases como "gastei 25 na padaria hoje no cartão Nubank" nos
 * campos do formulário de transação. É todo baseado em regras — sem IA, sem
 * rede, sem chave de API — e tolerante a erro de digitação: o nome da conta,
 * do cartão e da categoria é casado por similaridade contra o que o usuário
 * já tem cadastrado ("Nubnak" encontra "Nubank").
 *
 * O resultado é sempre levado ao formulário para conferência antes de salvar,
 * então na dúvida é melhor deixar um campo vazio do que chutar errado.
 */

export interface ParseOption {
  id: string;
  nome: string;
}

export interface ParseCategoria extends ParseOption {
  tipo: "ENTRADA" | "SAIDA";
}

export interface ParseContexto {
  contas: ParseOption[];
  cartoes: ParseOption[];
  categorias: ParseCategoria[];
  /** Data de referência para "hoje"/"ontem". Default: agora. */
  hoje?: Date;
}

export interface ParseResultado {
  valor: number | null;
  tipo: "ENTRADA" | "SAIDA";
  data: string;
  descricao: string;
  accountId: string | null;
  cardId: string | null;
  categoryId: string | null;
  /** Resumo legível do que foi reconhecido, para mostrar ao usuário. */
  entendido: string[];
}

const VERBOS_SAIDA = [
  "gastei", "gaste", "gastou", "gasto", "gastar", "paguei", "pague", "pagar",
  "pago", "comprei", "compre", "comprar", "compra", "saiu", "saida", "debito",
  "torrei", "investi", "mandei", "enviei", "transferi",
];

const VERBOS_ENTRADA = [
  "recebi", "recebe", "receber", "recebido", "ganhei", "ganho", "entrou",
  "entrada", "caiu", "salario", "credito", "vendi", "faturei",
];

/** Palavras de ligação que nunca fazem parte da descrição. */
const RUIDO = new Set([
  ...VERBOS_SAIDA,
  ...VERBOS_ENTRADA,
  "no", "na", "em", "de", "do", "da", "para", "pra", "por", "com", "o", "a",
  "os", "as", "um", "uma", "reais", "real", "conta", "cartao", "cartão",
  "credito", "crédito", "debito", "débito", "hoje", "ontem", "anteontem",
  "dia", "r$", "rs", "que", "e", "meu", "minha", "no valor",
]);

/**
 * Estabelecimento/assunto → nome da categoria cadastrada. Só entra aqui o que
 * é ambíguo pelo nome: "padaria" não parece "Alimentação" sozinho.
 */
const PALAVRAS_CATEGORIA: Record<string, string> = {
  padaria: "Alimentação", restaurante: "Alimentação", lanche: "Alimentação",
  almoco: "Alimentação", jantar: "Alimentação", cafe: "Alimentação",
  pizzaria: "Alimentação", churrasco: "Alimentação",
  ifood: "Delivery", rappi: "Delivery", delivery: "Delivery",
  mercado: "Mercado", supermercado: "Mercado", feira: "Mercado",
  hortifruti: "Mercado", acougue: "Mercado", atacadao: "Mercado",
  uber: "Transporte", taxi: "Transporte", gasolina: "Transporte",
  combustivel: "Transporte", posto: "Transporte", onibus: "Transporte",
  estacionamento: "Transporte", pedagio: "Transporte", metro: "Transporte",
  farmacia: "Saúde", remedio: "Saúde", medico: "Saúde", dentista: "Saúde",
  academia: "Saúde", exame: "Saúde", consulta: "Saúde", plano: "Saúde",
  aluguel: "Moradia", condominio: "Moradia", iptu: "Moradia",
  luz: "Contas Fixas", energia: "Contas Fixas", agua: "Contas Fixas",
  internet: "Contas Fixas", telefone: "Contas Fixas", celular: "Contas Fixas",
  netflix: "Assinaturas", spotify: "Assinaturas", assinatura: "Assinaturas",
  disney: "Assinaturas", chatgpt: "Assinaturas", claude: "Assinaturas",
  amazon: "E-commerce & Varejo", shopee: "E-commerce & Varejo",
  aliexpress: "E-commerce & Varejo", magalu: "E-commerce & Varejo",
  cinema: "Lazer", bar: "Lazer", show: "Lazer", viagem: "Viagens",
  hotel: "Viagens", passagem: "Viagens", roupa: "Vestuário",
  tenis: "Vestuário", sapato: "Vestuário", curso: "Educação",
  livro: "Educação", faculdade: "Educação", imposto: "Impostos & Taxas",
  das: "Impostos & Taxas", tarifa: "Impostos & Taxas",
  salario: "Salário", freela: "Freelance", freelance: "Freelance",
  reembolso: "Reembolso", dividendo: "Investimentos",
};

const MESES = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Minúsculas, sem acento — base de toda comparação. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Distância de Damerau-Levenshtein: conta troca de letras vizinhas como UM
 * erro. Isso importa porque o erro de digitação mais comum é justamente
 * inverter duas letras ("Nubnak" → "Nubank"), e com Levenshtein puro isso
 * custaria 2 — o mesmo que "bank", que é outra palavra.
 */
function distancia(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const linhas: number[][] = [];
  for (let i = 0; i <= a.length; i++) linhas.push([i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) linhas[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      linhas[i][j] = Math.min(
        linhas[i - 1][j] + 1,
        linhas[i][j - 1] + 1,
        linhas[i - 1][j - 1] + custo
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        linhas[i][j] = Math.min(linhas[i][j], linhas[i - 2][j - 2] + 1);
      }
    }
  }
  return linhas[a.length][b.length];
}

/**
 * Tolerância proporcional ao tamanho — deliberadamente apertada. Ser
 * permissivo demais faz "bank" casar com "Nubank" e o lançamento cair na
 * conta errada, que é pior do que simplesmente deixar o campo vazio.
 */
function tolerancia(nome: string): number {
  return Math.max(1, Math.floor(nome.length / 6));
}

/**
 * Procura a opção cujo nome aparece na frase, exata ou aproximadamente.
 * Devolve também o trecho casado, para removê-lo antes de montar a descrição.
 */
function acharPorNome<T extends ParseOption>(
  palavras: string[],
  opcoes: T[]
): { opcao: T; trecho: string[] } | null {
  let melhor: { opcao: T; trecho: string[]; erro: number } | null = null;

  for (const opcao of opcoes) {
    const alvo = normalizar(opcao.nome);
    const tokensAlvo = alvo.split(/\s+/).filter(Boolean);
    const limite = tolerancia(alvo);

    // Janela do tamanho do nome da opção, deslizando pela frase.
    for (let i = 0; i + tokensAlvo.length <= palavras.length; i++) {
      const janela = palavras.slice(i, i + tokensAlvo.length);
      const erro = distancia(janela.join(" "), alvo);
      if (erro <= limite && (!melhor || erro < melhor.erro)) {
        melhor = { opcao, trecho: janela, erro };
      }
    }
  }

  return melhor ? { opcao: melhor.opcao, trecho: melhor.trecho } : null;
}

function iso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Extrai a data e devolve o texto sem o trecho consumido. */
function extrairData(texto: string, hoje: Date): { data: string; resto: string } {
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const relativas: [RegExp, number][] = [
    [/\banteontem\b/, -2],
    [/\bontem\b/, -1],
    [/\bhoje\b/, 0],
    [/\bamanha\b/, 1],
  ];
  for (const [regex, offset] of relativas) {
    if (regex.test(texto)) {
      const d = new Date(base);
      d.setDate(d.getDate() + offset);
      return { data: iso(d), resto: texto.replace(regex, " ") };
    }
  }

  // 05/08/2026, 05-08-26, 5/8
  const numerica = texto.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numerica) {
    const dia = Number(numerica[1]);
    const mes = Number(numerica[2]);
    let ano = numerica[3] ? Number(numerica[3]) : base.getFullYear();
    if (ano < 100) ano += 2000;
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      return {
        data: iso(new Date(ano, mes - 1, dia)),
        resto: texto.replace(numerica[0], " "),
      };
    }
  }

  // "5 de agosto"
  const porExtenso = texto.match(
    new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${MESES.join("|")})\\b`)
  );
  if (porExtenso) {
    const dia = Number(porExtenso[1]);
    const mes = MESES.indexOf(porExtenso[2]);
    if (dia >= 1 && dia <= 31 && mes >= 0) {
      return {
        data: iso(new Date(base.getFullYear(), mes, dia)),
        resto: texto.replace(porExtenso[0], " "),
      };
    }
  }

  // "dia 5" — assume o mês corrente.
  const diaSolto = texto.match(/\bdia\s+(\d{1,2})\b/);
  if (diaSolto) {
    const dia = Number(diaSolto[1]);
    if (dia >= 1 && dia <= 31) {
      return {
        data: iso(new Date(base.getFullYear(), base.getMonth(), dia)),
        resto: texto.replace(diaSolto[0], " "),
      };
    }
  }

  return { data: iso(base), resto: texto };
}

/**
 * Número monetário: aceita "25", "25,50", "25.50" e também milhar com
 * separador ("1.250,00", "12.500").
 */
const NUMERO = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?`;

/** Extrai o valor monetário e devolve o texto sem o trecho consumido. */
function extrairValor(texto: string): { valor: number | null; resto: string } {
  // Procura primeiro um valor explicitamente marcado (R$ ... ou ... reais),
  // que é sempre mais confiável que um número solto.
  const marcado =
    texto.match(new RegExp(String.raw`r\$\s*(${NUMERO})`)) ??
    texto.match(new RegExp(String.raw`(${NUMERO})\s*(?:reais|real|conto|pila)\b`));

  const solto =
    marcado ?? texto.match(new RegExp(String.raw`(?:^|\s)(${NUMERO})(?=\s|$)`));
  if (!solto) return { valor: null, resto: texto };

  const bruto = solto[1];
  // "1.250,00" → 1250.00 · "25,50" → 25.50 · "25.50" → 25.50
  const limpo = bruto.includes(",")
    ? bruto.replace(/\./g, "").replace(",", ".")
    : bruto;

  const valor = Number(limpo);
  if (!Number.isFinite(valor) || valor <= 0) return { valor: null, resto: texto };

  return { valor, resto: texto.replace(solto[0], " ") };
}

function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function parseLancamento(
  frase: string,
  contexto: ParseContexto
): ParseResultado {
  const hoje = contexto.hoje ?? new Date();
  const entendido: string[] = [];

  const original = normalizar(frase);

  // 1. Tipo — pelo verbo. Saída é o padrão: é o caso mais comum.
  let tipo: "ENTRADA" | "SAIDA" = "SAIDA";
  const palavrasOriginais = original.split(/\s+/).filter(Boolean);
  if (palavrasOriginais.some((p) => VERBOS_ENTRADA.includes(p))) {
    tipo = "ENTRADA";
    entendido.push("entrada");
  } else if (palavrasOriginais.some((p) => VERBOS_SAIDA.includes(p))) {
    entendido.push("saída");
  }

  // 2. Data e valor, nessa ordem: assim "dia 5" não vira valor 5.
  const comData = extrairData(original, hoje);
  const comValor = extrairValor(comData.resto);

  if (comValor.valor !== null) {
    entendido.push(
      comValor.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    );
  }

  let palavras = comValor.resto.split(/\s+/).filter(Boolean);

  // 3. Cartão e conta. O cartão é procurado primeiro: "no cartão Nubank"
  // deve virar cartão mesmo existindo uma conta com o mesmo nome.
  let cardId: string | null = null;
  let accountId: string | null = null;

  const mencionaCartao = /\bcarta[oõ]\b/.test(original);
  const mencionaConta = /\bconta\b/.test(original);

  const remover = (trecho: string[]) => {
    const alvo = trecho.join(" ");
    const juntas = palavras.join(" ").replace(alvo, " ");
    palavras = juntas.split(/\s+/).filter(Boolean);
  };

  if (!mencionaConta || mencionaCartao) {
    const achado = acharPorNome(palavras, contexto.cartoes);
    if (achado && (mencionaCartao || !mencionaConta)) {
      cardId = achado.opcao.id;
      entendido.push(`cartão ${achado.opcao.nome}`);
      remover(achado.trecho);
    }
  }

  if (!cardId) {
    const achado = acharPorNome(palavras, contexto.contas);
    if (achado) {
      accountId = achado.opcao.id;
      entendido.push(`conta ${achado.opcao.nome}`);
      remover(achado.trecho);
    }
  }

  // 4. Categoria: primeiro pelo nome cadastrado, depois por palavra-chave
  // de estabelecimento ("padaria" → Alimentação).
  const categoriasDoTipo = contexto.categorias.filter((c) => c.tipo === tipo);
  let categoryId: string | null = null;

  const porNome = acharPorNome(palavras, categoriasDoTipo);
  if (porNome) {
    categoryId = porNome.opcao.id;
    entendido.push(porNome.opcao.nome);
  } else {
    const chaves = Object.keys(PALAVRAS_CATEGORIA);
    for (const palavra of palavras) {
      // Casa a palavra-chave também com erro de digitação ("padalria").
      const chave =
        PALAVRAS_CATEGORIA[palavra] !== undefined
          ? palavra
          : chaves.find((k) => distancia(palavra, k) <= tolerancia(k));
      if (!chave) continue;

      const nomeCategoria = PALAVRAS_CATEGORIA[chave];
      const categoria = categoriasDoTipo.find(
        (c) => normalizar(c.nome) === normalizar(nomeCategoria)
      );
      if (categoria) {
        categoryId = categoria.id;
        entendido.push(categoria.nome);
        break;
      }
    }
  }

  // 5. Descrição: o que sobrou depois de tirar valor, data, conta/cartão e
  // as palavras de ligação.
  const restantes = palavras.filter((p) => !RUIDO.has(p) && !/^\d+$/.test(p));
  const descricao = restantes.length
    ? primeiraMaiuscula(restantes.join(" "))
    : tipo === "ENTRADA"
      ? "Entrada"
      : "Despesa";

  return {
    valor: comValor.valor,
    tipo,
    data: comData.data,
    descricao,
    accountId,
    cardId,
    categoryId,
    entendido,
  };
}
