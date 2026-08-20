import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

/**
 * Resolves a document's stored `caminho` (e.g. "uploads/PF/2026-08/uuid-nome.pdf")
 * to an absolute path scoped statically to the uploads/ folder, so Next's build
 * tracer doesn't flag it as unbounded filesystem access, and so a malicious
 * `caminho` can't escape the uploads directory via "..".
 */
export function resolveUploadPath(caminho: string): string {
  const relative = caminho.replace(/^uploads[\\/]/, "");
  const absolute = path.join(UPLOADS_ROOT, relative);
  if (!absolute.startsWith(UPLOADS_ROOT)) {
    throw new Error("Caminho de arquivo inválido");
  }
  return absolute;
}

export { UPLOADS_ROOT };
