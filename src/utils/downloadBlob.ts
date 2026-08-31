// Dispara la descarga de un Blob en el navegador -- truco estándar
// del <a download> temporal, ya que fetch() no expone un "guardar
// como" nativo.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
