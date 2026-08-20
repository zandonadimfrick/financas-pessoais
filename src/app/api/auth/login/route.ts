import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { COOKIE_SESSAO, criarSessao, senhaConfere } from "@/lib/auth";

const schema = z.object({ senha: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Informe a senha" }, { status: 400 });
    }

    if (!senhaConfere(parsed.data.senha)) {
      // Atraso curto para tornar tentativa e erro em massa menos prático.
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const { valor, maxAge } = await criarSessao();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_SESSAO, valor, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Erro ao entrar" }, { status: 500 });
  }
}
