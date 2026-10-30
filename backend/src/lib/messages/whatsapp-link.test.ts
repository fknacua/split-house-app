import { describe, expect, it } from "vitest";
import { whatsappLink } from "./whatsapp-link";

describe("whatsappLink", () => {
  it("drops the plus and encodes the whole message", () => {
    expect(whatsappLink("+6581234567", "Hi Priya!")).toBe("https://wa.me/6581234567?text=Hi%20Priya!");
  });

  it("keeps line breaks, bold markers, ampersands and emoji intact once decoded", () => {
    const text = "*Yours:*\nRent & utilities: $1,675.00\nTotal 😊";
    const url = new URL(whatsappLink("+6581234567", text));
    expect(url.searchParams.get("text")).toBe(text);
    expect(url.search).not.toContain("\n");
  });
});
