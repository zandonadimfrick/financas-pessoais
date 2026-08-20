/**
 * Autenticação por senha única.
 *
 * O app é de uso pessoal, então não há cadastro nem múltiplos usuários: uma
 * senha destrava tudo. A senha em si nunca fica no código — vem de
 * `APP_PASSWORD` — e o cookie de sessão não carrega a senha, só um recibo
 * assinado com HMAC-SHA256 e com validade.
 *
 * Usa Web Crypto (não `node:crypto`) porque o `proxy.ts` também precisa
 * validar o cookie, e ele pode rodar no runtime Edge.
 */

export const COOKIE_SESSAO = "financas_sessao";

/** 30 dias — é um app pessoal, relogar toda hora só atrapalharia. */
const VALIDADE_SEGUNDOS = 60 * 60 * 24 * 30;

function segredo(): string {
  const valor = process.env.AUTH_SECRET;
  if (!valor) {
    throw new Error("AUTH_SECRET não configurado");
  }
  return valor;
}

async function assinar(mensagem: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const assinatura = await crypto.subtle.sign(
    "HMAC",
    chave,
    new TextEncoder().encode(mensagem)
  );
  return Array.from(new Uint8Array(assinatura))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante, para não vazar o segredo pelo tempo de resposta. */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferenca === 0;
}

export function senhaConfere(tentativa: string): boolean {
  const esperada = process.env.APP_PASSWORD;
  if (!esperada) return false;
  return iguais(tentativa, esperada);
}

/** Gera o valor do cookie: "expiraEm.assinatura". */
export async function criarSessao(): Promise<{ valor: string; maxAge: number }> {
  const expiraEm = Date.now() + VALIDADE_SEGUNDOS * 1000;
  const assinatura = await assinar(String(expiraEm));
  return { valor: `${expiraEm}.${assinatura}`, maxAge: VALIDADE_SEGUNDOS };
}

export async function sessaoValida(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;

  const [expiraEm, assinatura] = cookie.split(".");
  if (!expiraEm || !assinatura) return false;

  const prazo = Number(expiraEm);
  if (!Number.isFinite(prazo) || prazo < Date.now()) return false;

  try {
    return iguais(assinatura, await assinar(expiraEm));
  } catch {
    // AUTH_SECRET ausente: sem como validar, então a sessão não vale.
    return false;
  }
}
