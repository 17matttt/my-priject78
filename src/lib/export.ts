export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const body = rows.map((row) => row.map(cell).join(',')).join('\n')
  downloadFile(filename, body, 'text/csv')
}

export function downloadJson(filename: string, value: unknown): void {
  downloadFile(filename, JSON.stringify(value, null, 2), 'application/json')
}
