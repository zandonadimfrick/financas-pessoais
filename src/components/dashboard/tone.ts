/**
 * Cores de valor monetário, separadas por tamanho de texto.
 *
 * `--income` (`#16a34a`) e `--expense` (`#e8593f`) sobre o branco do card dão
 * 3.3:1 e 3.5:1 — suficiente para texto GRANDE (≥ 24px, onde o AA pede 3:1),
 * mas reprovado para texto pequeno (que pede 4.5:1). Por isso os valores em
 * listas usam uma versão mais profunda do mesmo verde/coral no tema claro
 * (≈ 5:1 e ≈ 6:1); no tema escuro os tokens já passam folgado sobre o card,
 * então lá voltam a ser `--income`/`--expense`.
 */
export const MONEY_SMALL_INCOME = "text-[#15803d] dark:text-income";
export const MONEY_SMALL_EXPENSE = "text-[#b3391f] dark:text-expense";

/** Classe de cor para um valor em texto pequeno (listas, linhas de tabela). */
export function moneyToneSmall(isIncome: boolean) {
  return isIncome ? MONEY_SMALL_INCOME : MONEY_SMALL_EXPENSE;
}

/**
 * Link de ação dentro de um card ("Ver tudo"). Mesma história do coral: o
 * `--primary` do tema claro fica em 3.5:1 sobre o branco do card, então o
 * link (texto pequeno) usa o coral profundo; no escuro o `--primary` claro já
 * passa folgado sobre o card.
 */
export const CARD_LINK =
  "rounded-lg text-xs font-semibold text-[#b3391f] outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-primary";
