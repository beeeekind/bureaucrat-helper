/**
 * Removes em dashes and en dashes from AI output.
 * Project convention: no dashes anywhere. See README.
 *
 * " — " (space em-dash space) → ": "
 * " – " (space en-dash space) → ": "
 * "—" bare                   → ", "
 * "–" bare                   → ", "
 */
export function sanitize(text: string | undefined | null): string {
  if (!text) return text ?? ''
  return text
    .replace(/ — /g, ': ')
    .replace(/ – /g, ': ')
    .replace(/—/g, ', ')
    .replace(/–/g, ', ')
}

export function sanitizeList(items: readonly string[] | undefined | null): string[] {
  if (!items) return []
  return items.map(sanitize)
}
