/** The first letter of a name, as Turkish writes it in upper case: "ılgaz" gives "I", "işık" gives "İ". */
export function initialOf(name: string): string {
  return (Array.from(name.trim())[0] ?? '?').toLocaleUpperCase('tr')
}
