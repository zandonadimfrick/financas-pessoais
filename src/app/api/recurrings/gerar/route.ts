import { NextResponse } from "next/server";

import { gerarCobrancasPendentes } from "@/lib/recorrentes";

/**
 * Lança as cobranças vencidas de assinaturas e recorrentes.
 *
 * Chamada quando o app abre. É idempotente — repetir a chamada no mesmo dia
 * não cria nada de novo.
 */
export async function POST() {
  try {
    const resultado = await gerarCobrancasPendentes();
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao gerar as cobranças recorrentes" },
      { status: 500 }
    );
  }
}
