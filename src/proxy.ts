import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { COOKIE_SESSAO, sessaoValida } from "@/lib/auth";

/** Rotas que precisam responder mesmo sem sessão, senão não há como entrar. */
const PUBLICAS = ["/login", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const autenticado = await sessaoValida(
    request.cookies.get(COOKIE_SESSAO)?.value
  );

  if (PUBLICAS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`))) {
    // Já entrou e voltou pro login: manda direto pro painel.
    if (pathname === "/login" && autenticado) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (autenticado) return NextResponse.next();

  // Requisições de dados recebem 401 em vez de um HTML de redirecionamento,
  // que o cliente não saberia interpretar.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const destino = new URL("/login", request.url);
  if (pathname !== "/") destino.searchParams.set("de", pathname);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: [
    // Tudo, menos os arquivos internos do Next e estáticos.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
