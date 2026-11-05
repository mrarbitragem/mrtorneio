import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupsPdfFilename } from "@/letzmr/convert/analyzeLetzplay";
import { convertLetzplayGroupsPdf, type ConvertedGroupsPdf } from "@/letzmr/convert/convertLetzplayGroups";
import { convertJogosExcel, type ConvertedJogosExcel } from "@/letzmr/convert/jogosExcel/convertJogosExcel";

type DropKind = "pdf" | "xlsx";

function FileDrop({
  kind,
  file,
  onFile,
  accept,
  idleLabel,
}: {
  kind: DropKind;
  file: File | null;
  onFile: (file: File | null) => void;
  accept: string;
  idleLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        data-testid={`converter-file-${kind}`}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onFile(dropped);
        }}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-4 py-10 text-center hover:bg-[hsl(var(--muted))]/70"
      >
        <FileUp className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
        <span className="text-sm font-medium">Solte o arquivo aqui ou clique para escolher</span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">{file ? file.name : idleLabel}</span>
      </button>
    </>
  );
}

export function LetzplayGroupsConverterPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfResult, setPdfResult] = useState<ConvertedGroupsPdf | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [downloadName, setDownloadName] = useState("grupos.pdf");

  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [xlsxBusy, setXlsxBusy] = useState(false);
  const [xlsxError, setXlsxError] = useState("");
  const [xlsxResult, setXlsxResult] = useState<ConvertedJogosExcel | null>(null);
  const [xlsxUrl, setXlsxUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (xlsxUrl) URL.revokeObjectURL(xlsxUrl);
    };
  }, [previewUrl, xlsxUrl]);

  function takePdf(next: File | null) {
    setPdfResult(null);
    setPdfError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPdfFile(next);
  }

  function takeXlsx(next: File | null) {
    setXlsxResult(null);
    setXlsxError("");
    if (xlsxUrl) URL.revokeObjectURL(xlsxUrl);
    setXlsxUrl("");
    setXlsxFile(next);
  }

  async function convertPdf() {
    if (!pdfFile) return;
    setPdfBusy(true);
    setPdfError("");
    try {
      const bytes = await pdfFile.arrayBuffer();
      const converted = await convertLetzplayGroupsPdf(bytes);
      const copy = new Uint8Array(converted.pdfBytes.byteLength);
      copy.set(converted.pdfBytes);
      const blob = new Blob([copy], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setPdfResult(converted);
      setDownloadName(groupsPdfFilename(pdfFile.name));
    } catch (err) {
      setPdfResult(null);
      setPdfError(err instanceof Error ? err.message : "Não deu para converter este PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function convertXlsx() {
    if (!xlsxFile) return;
    setXlsxBusy(true);
    setXlsxError("");
    try {
      const bytes = await xlsxFile.arrayBuffer();
      const converted = await convertJogosExcel(bytes, xlsxFile.name);
      const copy = new Uint8Array(converted.xlsxBytes.byteLength);
      copy.set(converted.xlsxBytes);
      const blob = new Blob([copy], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      if (xlsxUrl) URL.revokeObjectURL(xlsxUrl);
      setXlsxUrl(url);
      setXlsxResult(converted);
    } catch (err) {
      setXlsxResult(null);
      setXlsxError(err instanceof Error ? err.message : "Não deu para converter este Excel.");
    } finally {
      setXlsxBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          <Link to="/painel" className="hover:underline">
            Painel
          </Link>
          <span> / Conversor</span>
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Conversor</h1>
        <p className="max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          Fora do torneio: duas conversões da exportação Letzplay. A primeira junta os grupos num PDF.
          A segunda transforma o Excel de jogos na folha compacta para imprimir.
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-[hsl(var(--border))] p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">1. Folha de grupos</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Envie a impressão Letzplay com um grupo e os jogos por folha. Devolve um PDF só com as
            tabelas de classificação.
          </p>
        </div>
        <FileDrop
          kind="pdf"
          file={pdfFile}
          onFile={takePdf}
          accept="application/pdf,.pdf"
          idleLabel="Aceita a folha Letzplay (grupo + jogos)"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!pdfFile || pdfBusy} onClick={() => void convertPdf()}>
            {pdfBusy ? "Convertendo…" : "Converter para folha de grupos"}
          </Button>
          {pdfFile && (
            <Button type="button" variant="outline" disabled={pdfBusy} onClick={() => takePdf(null)}>
              Limpar
            </Button>
          )}
        </div>
        {pdfError && <p className="text-sm text-[hsl(var(--destructive))]">{pdfError}</p>}
      </section>

      {pdfResult && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">PDF de grupos</h2>
            <Button asChild>
              <a href={previewUrl} download={downloadName}>
                Baixar {downloadName}
              </a>
            </Button>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {pdfResult.pageCount} folha(s) · {pdfResult.categories.length} categoria(s)
          </p>
          <ul className="divide-y divide-[hsl(var(--border))] rounded-lg border border-[hsl(var(--border))]">
            {pdfResult.categories.map((category) => (
              <li key={category.title} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="font-medium">{category.shortName}</span>
                <span className="text-[hsl(var(--muted-foreground))]">
                  {category.groupCount} grupo{category.groupCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
          {previewUrl && (
            <iframe
              title="Prévia do PDF de grupos"
              src={previewUrl}
              className="h-[80vh] w-full rounded-lg border border-[hsl(var(--border))] bg-white"
            />
          )}
        </section>
      )}

      <section className="space-y-4 rounded-lg border border-[hsl(var(--border))] p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">2. Folha de jogos</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Envie o Excel Letzplay de jogos. Devolve a folha compacta (CAT, FASE, nomes) para você
            gerar o PDF no Excel.
          </p>
        </div>
        <FileDrop
          kind="xlsx"
          file={xlsxFile}
          onFile={takeXlsx}
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          idleLabel="Aceita o Excel de jogos do Letzplay"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!xlsxFile || xlsxBusy} onClick={() => void convertXlsx()}>
            {xlsxBusy ? "Convertendo…" : "Converter para folha de jogos"}
          </Button>
          {xlsxFile && (
            <Button type="button" variant="outline" disabled={xlsxBusy} onClick={() => takeXlsx(null)}>
              Limpar
            </Button>
          )}
        </div>
        {xlsxError && <p className="text-sm text-[hsl(var(--destructive))]">{xlsxError}</p>}
      </section>

      {xlsxResult && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Excel de saída</h2>
            <Button asChild>
              <a href={xlsxUrl} download={xlsxResult.filename}>
                Baixar {xlsxResult.filename}
              </a>
            </Button>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {xlsxResult.matchCount} jogo(s) · {xlsxResult.blockCount} bloco(s) de horário/categoria
          </p>
        </section>
      )}
    </div>
  );
}
