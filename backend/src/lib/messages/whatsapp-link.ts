/**
 * The link that opens a WhatsApp chat with the message typed in, ready for Francis to send. wa.me
 * wants the number as digits only, with the country code and no `+`.
 *
 * @param e164 - The number in E.164 form, e.g. `+6581234567`.
 * @param text - The message, exactly as it is sent.
 * @returns e.g. `https://wa.me/6581234567?text=Hi%20Priya!`.
 */
export function whatsappLink(e164: string, text: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
