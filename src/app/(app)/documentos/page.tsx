"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FileText, Paperclip, Plus, Receipt, Trash2, X } from "lucide-react";
import type { z } from "zod";

import { documentUploadSchema } from "@/lib/validations";
import type { Document as DocumentEntity, TipoDocumento } from "@/lib/types";
import { useEscopoStore } from "@/lib/store";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

type FormValues = z.infer<typeof documentUploadSchema>;

const TIPO_LABELS: Record<TipoDocumento, string> = {
  NOTA_FISCAL: "Nota fiscal",
  COMPROVANTE: "Comprovante",
  OUTRO: "Outro",
};

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const NONE = "__none__";

function currentCompetencia() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Conteúdo do formulário de upload. Não usa `useEffect` para resetar o
 * estado ao reabrir o diálogo — em vez disso, `UploadDialog` remonta este
 * componente (via `key`) toda vez que o diálogo abre, o que já garante
 * `useState`/`useForm` limpos (padrão "reset state with a key" do React,
 * evitando `setState` síncrono dentro de efeito).
 */
function UploadForm({
  onOpenChange,
  escopoDefault,
  transactionId,
  onSaved,
}: {
  onOpenChange: (open: boolean) => void;
  escopoDefault: string | null;
  transactionId: string | null;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      tipo: "COMPROVANTE",
      escopo: (escopoDefault as FormValues["escopo"]) ?? undefined,
      competencia: currentCompetencia(),
      observacao: "",
      transactionId: transactionId ?? null,
    },
  });

  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (f: File | null): string | null => {
    if (!f) return "Selecione um arquivo.";
    const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(f.type)) {
      return "Tipo de arquivo não permitido. Use pdf, jpg, jpeg, png ou webp.";
    }
    if (f.size > MAX_FILE_SIZE) {
      return "Arquivo excede o tamanho máximo de 15MB.";
    }
    return null;
  };

  const onSubmit = async (values: FormValues) => {
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);

    const formData = new FormData();
    formData.append("file", file!);
    formData.append("tipo", values.tipo);
    formData.append("escopo", values.escopo);
    formData.append("competencia", values.competencia);
    if (values.observacao) formData.append("observacao", values.observacao);
    if (values.transactionId) formData.append("transactionId", values.transactionId);

    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const fieldErrors = body?.error?.fieldErrors as
          | Record<string, string[]>
          | undefined;
        if (fieldErrors) {
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (messages?.[0]) {
              setError(field as keyof FormValues, { message: messages[0] });
            }
          }
          toast.error("Verifique os campos destacados.");
        } else {
          toast.error(body?.error || "Não foi possível enviar o documento.");
        }
        return;
      }

      toast.success("Documento enviado.");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Erro de rede ao enviar o documento.");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg">Novo documento</DialogTitle>
        <DialogDescription>
          Envie uma nota fiscal ou comprovante (pdf, jpg, png ou webp, até 15MB).
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file">Arquivo</Label>
            <Input
              id="file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="h-auto rounded-2xl px-3.5 py-2.5"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setFileError(f ? validateFile(f) : null);
              }}
            />
            {file && !fileError && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="tipo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 w-full rounded-full px-3.5">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Escopo</Label>
              <Controller
                control={control}
                name="escopo"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 w-full rounded-full px-3.5">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PF">Pessoa física</SelectItem>
                      <SelectItem value="PJ">Pessoa jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.escopo && (
                <p className="text-xs text-destructive">{errors.escopo.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="competencia">Competência (mês)</Label>
            <Input
              id="competencia"
              type="month"
              className="h-9 rounded-full px-3.5"
              {...register("competencia")}
            />
            {errors.competencia && (
              <p className="text-xs text-destructive">{errors.competencia.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              rows={2}
              placeholder="Ex: Nota fiscal do notebook novo"
              className="rounded-2xl px-3.5 py-2.5"
              {...register("observacao")}
            />
          </div>

          {transactionId && (
            <p className="rounded-2xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
              Este documento será vinculado à transação selecionada.
            </p>
          )}

          <DialogFooter className="mx-0 mt-1 mb-0 rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full px-4"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="rounded-full px-4 font-semibold"
            >
              {isSubmitting ? "Enviando…" : "Enviar documento"}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  escopoDefault,
  transactionId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escopoDefault: string | null;
  transactionId: string | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-3xl p-5 sm:max-w-md">
        {open && (
          <UploadForm
            key={transactionId ?? "none"}
            onOpenChange={onOpenChange}
            escopoDefault={escopoDefault}
            transactionId={transactionId}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocumentIcon({ tipo }: { tipo: TipoDocumento }) {
  if (tipo === "NOTA_FISCAL") return <Receipt className="size-6" />;
  if (tipo === "COMPROVANTE") return <FileText className="size-6" />;
  return <Paperclip className="size-6" />;
}

function DocumentosContent() {
  const escopo = useEscopoStore((s) => s.escopo);
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionIdParam = searchParams.get("transactionId");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [competenciaFilter, setCompetenciaFilter] = React.useState("");
  const [tipoFilter, setTipoFilter] = React.useState<TipoDocumento | typeof NONE>(NONE);

  const query = React.useMemo(() => {
    const params = new URLSearchParams();
    if (escopo !== "ALL") params.set("escopo", escopo);
    if (competenciaFilter) params.set("competencia", competenciaFilter);
    if (tipoFilter !== NONE) params.set("tipo", tipoFilter);
    if (transactionIdParam) params.set("transactionId", transactionIdParam);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [escopo, competenciaFilter, tipoFilter, transactionIdParam]);

  const { data: documents, loading, error, refetch } = useFetch<DocumentEntity[]>(
    `/api/documents${query}`
  );

  const list = React.useMemo(() => documents ?? [], [documents]);

  const handleDelete = async (doc: DocumentEntity) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Não foi possível excluir o documento.");
        return;
      }
      toast.success("Documento excluído.");
      refetch();
    } catch {
      toast.error("Erro de rede ao excluir o documento.");
    }
  };

  const clearTransactionFilter = () => {
    router.push("/documentos");
  };

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Documentos
          </h2>
          <p className="text-sm text-muted-foreground">
            Notas fiscais e comprovantes guardados para não furar o caixa.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full rounded-full px-4 font-semibold sm:w-auto"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-4" />
          Novo documento
        </Button>
      </div>

      <Card className="gap-4 px-4 py-4 md:px-5">
        {/* Tipo em pílulas: são poucas opções e cabem numa linha. */}
        <div
          role="group"
          aria-label="Filtrar por tipo de documento"
          className="flex flex-wrap items-center gap-1 rounded-3xl bg-secondary p-1 sm:w-fit sm:rounded-full"
        >
          {[
            { value: NONE as string, label: "Todos" },
            ...Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label })),
          ].map((opt) => {
            const ativo = tipoFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={ativo}
                onClick={() => setTipoFilter(opt.value as TipoDocumento | typeof NONE)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  ativo
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5 sm:w-48">
          <Label className="text-xs text-muted-foreground">Competência</Label>
          <Input
            type="month"
            value={competenciaFilter}
            onChange={(e) => setCompetenciaFilter(e.target.value)}
            className="h-9 rounded-full border-transparent bg-secondary px-3.5"
          />
        </div>

        {(competenciaFilter || tipoFilter !== NONE || transactionIdParam) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {competenciaFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3 text-xs font-medium text-foreground">
                Competência {competenciaFilter}
                <button
                  type="button"
                  aria-label="Remover filtro de competência"
                  onClick={() => setCompetenciaFilter("")}
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {tipoFilter !== NONE && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3 text-xs font-medium text-foreground">
                {TIPO_LABELS[tipoFilter as TipoDocumento]}
                <button
                  type="button"
                  aria-label="Remover filtro de tipo"
                  onClick={() => setTipoFilter(NONE)}
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {transactionIdParam && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3 text-xs font-medium text-foreground">
                De uma transação específica
                <button
                  type="button"
                  aria-label="Remover filtro de transação"
                  onClick={clearTransactionFilter}
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </Card>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="items-center px-6 py-10 text-center text-sm text-muted-foreground">
          {error}
        </Card>
      )}

      {!loading && !error && list.length === 0 && (
        <Card className="items-center gap-4 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Paperclip className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-heading text-base font-semibold">
              Nenhum documento encontrado
            </p>
            <p className="text-sm text-muted-foreground">
              Envie notas e comprovantes pra ter tudo à mão na hora do acerto.
            </p>
          </div>
          <Button
            size="lg"
            className="rounded-full px-4 font-semibold"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />
            Enviar primeiro documento
          </Button>
        </Card>
      )}

      {!loading && !error && list.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 md:gap-5">
          {list.map((doc) => {
            const isImage = doc.mimeType.startsWith("image/");
            return (
              <Card key={doc.id} className="gap-0 overflow-hidden px-0 py-0">
                <div
                  className={cn(
                    "flex h-32 items-center justify-center bg-secondary",
                    !isImage && "text-muted-foreground"
                  )}
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/documents/${doc.id}/file`}
                      alt={doc.nomeArquivo}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-full bg-card">
                      <DocumentIcon tipo={doc.tipo} />
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <p
                    className="truncate text-sm font-semibold"
                    title={doc.nomeArquivo}
                  >
                    {doc.nomeArquivo}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {doc.competencia} • {formatBytes(doc.tamanho)}
                  </p>
                  <Badge variant="secondary" className="w-fit">
                    {TIPO_LABELS[doc.tipo]}
                  </Badge>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-full"
                      render={
                        <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer" />
                      }
                    >
                      Ver
                    </Button>
                    <ConfirmDeleteDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full text-muted-foreground"
                          aria-label={`Excluir ${doc.nomeArquivo}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      }
                      title="Excluir documento?"
                      description={`"${doc.nomeArquivo}" será excluído permanentemente.`}
                      onConfirm={() => handleDelete(doc)}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        escopoDefault={escopo !== "ALL" ? escopo : null}
        transactionId={transactionIdParam}
        onSaved={refetch}
      />
    </div>
  );
}

export default function DocumentosPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      }
    >
      <DocumentosContent />
    </Suspense>
  );
}
