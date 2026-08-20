import { z } from "zod";

// Nota: os campos que possuem valor padrão no schema.prisma (via @default) são
// declarados como `.optional()` aqui, SEM `.default()` no zod. Isso é proposital:
// se usássemos `.default()`, o `.partial()` usado nos schemas de PATCH aplicaria
// o valor padrão em qualquer campo omitido do body, sobrescrevendo silenciosamente
// valores já existentes no banco. Deixando o campo apenas opcional, quando omitido
// o zod retorna `undefined`, o Prisma ignora a chave (não sobrescreve no update) e,
// na criação, o próprio banco aplica o `@default` do schema.

export const escopoSchema = z.enum(["PF", "PJ"]);
export const tipoContaSchema = z.enum(["CORRENTE", "POUPANCA", "INVESTIMENTO", "CARTEIRA"]);
export const tipoLancamentoSchema = z.enum(["ENTRADA", "SAIDA"]);
export const periodicidadeSchema = z.enum(["DIARIA", "SEMANAL", "MENSAL", "ANUAL"]);
export const statusRecebivelSchema = z.enum(["PENDENTE", "RECEBIDO", "ATRASADO", "CANCELADO"]);
export const tipoDocumentoSchema = z.enum(["NOTA_FISCAL", "COMPROVANTE", "OUTRO"]);

export const accountSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  instituicao: z.string().min(1, "Instituição é obrigatória"),
  tipo: tipoContaSchema.optional(),
  escopo: escopoSchema.optional(),
  saldoInicial: z.number().optional(),
  cor: z.string().optional(),
  icone: z.string().nullable().optional(),
  arquivada: z.boolean().optional(),
});
export const accountUpdateSchema = accountSchema.partial();

export const cardSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  instituicao: z.string().min(1, "Instituição é obrigatória"),
  escopo: escopoSchema.optional(),
  limite: z.number().optional(),
  diaFechamento: z.number().int().min(1).max(31).optional(),
  diaVencimento: z.number().int().min(1).max(31).optional(),
  cor: z.string().optional(),
  arquivado: z.boolean().optional(),
  accountId: z.string().nullable().optional(),
});
export const cardUpdateSchema = cardSchema.partial();

export const categorySchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: tipoLancamentoSchema,
  essencial: z.boolean().optional(),
  cor: z.string().optional(),
  icone: z.string().nullable().optional(),
});
export const categoryUpdateSchema = categorySchema.partial();

export const recurringSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  valor: z.number().positive("Valor deve ser maior que zero"),
  tipo: tipoLancamentoSchema.optional(),
  periodicidade: periodicidadeSchema.optional(),
  diaCobranca: z.number().int().min(1).max(31).optional(),
  escopo: escopoSchema.optional(),
  ativo: z.boolean().optional(),
  proximaCobranca: z.coerce.date().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});
export const recurringUpdateSchema = recurringSchema.partial();

export const receivableSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.number().positive("Valor deve ser maior que zero"),
  vencimento: z.coerce.date(),
  status: statusRecebivelSchema.optional(),
  escopo: escopoSchema.optional(),
  pagador: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
});
export const receivableUpdateSchema = receivableSchema.partial();

export const transactionSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.number().positive("Valor deve ser maior que zero"),
  tipo: tipoLancamentoSchema,
  data: z.coerce.date(),
  escopo: escopoSchema.optional(),
  observacao: z.string().nullable().optional(),
  efetivado: z.boolean().optional(),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  cardId: z.string().nullable().optional(),
  /*
    Número de parcelas. Quando maior que 1, `valor` é o VALOR TOTAL da compra
    e o servidor divide em N lançamentos mensais. Só faz sentido em compra no
    cartão — a API recusa parcelar fora dele.
  */
  parcelas: z
    .number()
    .int("Informe um número inteiro de parcelas")
    .min(1, "Mínimo de 1 parcela")
    .max(48, "Máximo de 48 parcelas")
    .optional(),
});
export const transactionUpdateSchema = transactionSchema.partial();

export const documentUploadSchema = z.object({
  tipo: tipoDocumentoSchema,
  escopo: escopoSchema,
  competencia: z.string().min(1, "Competência é obrigatória"),
  observacao: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
});
