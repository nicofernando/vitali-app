// Shim de tipos para xlsx 0.18.x — el paquete tiene tipos propios pero no los expone
// correctamente con moduleResolution: "bundler". Solo declaramos las APIs en uso.
declare module 'xlsx' {
  interface WorkSheet {
    [cell: string]: unknown
  }
  interface WorkBook {
    SheetNames: string[]
    Sheets: Record<string, WorkSheet>
  }
  const utils: {
    json_to_sheet(data: unknown[]): WorkSheet
    book_new(): WorkBook
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void
  }
  function writeFile(wb: WorkBook, filename: string, opts?: unknown): void
}
