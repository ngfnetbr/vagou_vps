export async function downloadFromUrl(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Falha ao baixar");
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename || "documento";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(blobUrl);
}
