export function cleanInput(value: string): string {
  return value
    .trim() // remove leading/trailing spaces
    .replace(/</g, "&lt;") // escape <
    .replace(/>/g, "&gt;") // escape >
    .replace(/&/g, "&amp;") // escape &
    .replace(/"/g, "&quot;") // escape "
    .replace(/'/g, "&#39;") // escape '
    .replace(/\\/g, ""); // remove backslashes
}
