/**
 * Local drop-in replacement for html2pdf.js.
 *
 * The upstream html2pdf.js package (0.12.1) transitively pins a vulnerable
 * jspdf 3.x (GHSA-f8cm-6447-x5h2 and GHSA-wfv2-pwc8-crg5). We alias
 * "html2pdf.js" to this module in vite.config.ts so the app keeps working
 * without shipping the vulnerable dependency.
 *
 * Implements the small chained API our codebase uses:
 *   html2pdf().set(opt).from(element).save()
 */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Margin = number | [number, number] | [number, number, number, number];

interface Html2PdfOptions {
  margin?: Margin;
  filename?: string;
  image?: { type?: "jpeg" | "png"; quality?: number };
  html2canvas?: Record<string, unknown>;
  jsPDF?: {
    unit?: "pt" | "mm" | "cm" | "in";
    format?: string | [number, number];
    orientation?: "portrait" | "landscape" | "p" | "l";
    compress?: boolean;
  };
  pagebreak?: { mode?: string | string[] };
  enableLinks?: boolean;
}

const DEFAULTS: Required<Pick<Html2PdfOptions, "margin" | "filename" | "image" | "jsPDF">> & {
  html2canvas: Record<string, unknown>;
} = {
  margin: 0,
  filename: "file.pdf",
  image: { type: "jpeg", quality: 0.95 },
  html2canvas: { scale: 2, useCORS: true, logging: false },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
};

function normalizeMargin(margin: Margin): [number, number, number, number] {
  if (typeof margin === "number") return [margin, margin, margin, margin];
  if (margin.length === 2) return [margin[0], margin[1], margin[0], margin[1]];
  return margin;
}

class Html2Pdf {
  private opt: Html2PdfOptions = { ...DEFAULTS };
  private source: HTMLElement | null = null;

  set(opt: Html2PdfOptions): this {
    this.opt = {
      ...this.opt,
      ...opt,
      image: { ...DEFAULTS.image, ...(opt.image ?? {}) },
      html2canvas: { ...DEFAULTS.html2canvas, ...(opt.html2canvas ?? {}) },
      jsPDF: { ...DEFAULTS.jsPDF, ...(opt.jsPDF ?? {}) },
    };
    return this;
  }

  from(element: HTMLElement | string): this {
    this.source =
      typeof element === "string"
        ? (document.querySelector(element) as HTMLElement)
        : element;
    return this;
  }

  async toPdf(): Promise<jsPDF> {
    if (!this.source) throw new Error("html2pdf: no source element provided");

    const canvas = await html2canvas(this.source, this.opt.html2canvas as Parameters<typeof html2canvas>[1]);

    const imgType = this.opt.image?.type ?? "jpeg";
    const imgQuality = this.opt.image?.quality ?? 0.95;
    const imgData = canvas.toDataURL(`image/${imgType}`, imgQuality);

    const pdfOpts = this.opt.jsPDF!;
    const pdf = new jsPDF({
      unit: pdfOpts.unit ?? "mm",
      format: pdfOpts.format ?? "a4",
      orientation: pdfOpts.orientation ?? "portrait",
      compress: pdfOpts.compress ?? true,
    });

    const [mT, mR, mB, mL] = normalizeMargin(this.opt.margin ?? 0);
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const contentW = pageW - mL - mR;
    const contentH = pageH - mT - mB;

    // Scale image so its width fills the content area; paginate vertically.
    const imgW = contentW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= contentH) {
      pdf.addImage(imgData, imgType.toUpperCase(), mL, mT, imgW, imgH);
    } else {
      // Slice the source canvas per page to avoid overflowing addImage.
      const pxPerUnit = canvas.width / imgW;
      const pageSliceHeightPx = Math.floor(contentH * pxPerUnit);
      let renderedPx = 0;
      let pageIndex = 0;

      while (renderedPx < canvas.height) {
        const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - renderedPx);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) throw new Error("html2pdf: 2D context unavailable");
        ctx.drawImage(
          canvas,
          0,
          renderedPx,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx,
        );
        const sliceData = sliceCanvas.toDataURL(`image/${imgType}`, imgQuality);
        const sliceHeightUnits = sliceHeightPx / pxPerUnit;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(sliceData, imgType.toUpperCase(), mL, mT, imgW, sliceHeightUnits);

        renderedPx += sliceHeightPx;
        pageIndex += 1;
      }
    }

    return pdf;
  }

  async save(filename?: string): Promise<void> {
    const pdf = await this.toPdf();
    pdf.save(filename ?? this.opt.filename ?? "file.pdf");
  }

  async outputPdf(type: "blob" | "datauristring" | "arraybuffer" = "blob"): Promise<unknown> {
    const pdf = await this.toPdf();
    return pdf.output(type as "blob");
  }
}

export default function html2pdf(): Html2Pdf {
  return new Html2Pdf();
}
