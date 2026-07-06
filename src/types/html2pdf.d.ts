declare module "html2pdf.js" {
  const html2pdf: () => {
    set: (opt: Record<string, unknown>) => ReturnType<typeof html2pdf>;
    from: (element: HTMLElement | string) => ReturnType<typeof html2pdf>;
    save: (filename?: string) => Promise<void>;
    toPdf: () => Promise<unknown>;
    outputPdf: (type?: "blob" | "datauristring" | "arraybuffer") => Promise<unknown>;
  };
  export default html2pdf;
}
