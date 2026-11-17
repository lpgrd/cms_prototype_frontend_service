/**
 * The code from a partner QR. The QR holds the offer link (".../r/AB3K9QZP") so customers can open it,
 * and a camera or USB scanner reads the whole link; the counter only needs the code at its end.
 * Anything else is returned as typed.
 */
export function codeFromScan(input: string): string {
  const match = input.trim().match(/\/r\/([A-Za-z0-9]+)\/?(?:[?#].*)?$/i);
  return match ? match[1].toUpperCase() : input;
}
