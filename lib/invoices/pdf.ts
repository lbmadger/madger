import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { splitVat, vatApplies, vatRateLabel } from "@/lib/invoices/vat";

// Facture ou avoir en PDF, généré côté serveur (pdf-lib : pur JS, aucune
// police à charger, fonctionne sur Vercel). Mise en page sobre, noir sur
// blanc, mentions obligatoires françaises : numéro séquentiel, date, vendeur
// (raison sociale, adresse, SIRET, TVA ou franchise), client, désignation,
// montant, référence du paiement.

export type InvoicePdfInput = {
  kind: "invoice" | "credit_note";
  number: string;
  issuedAt: Date;
  amountCents: number;
  currency: string;
  clientName: string;
  clientEmail: string | null;
  serviceName: string;
  bookingStartsAt: Date | null;
  // Avoir : facture d'origine et motif.
  linkedNumber?: string | null;
  reason?: string | null;
  paymentRef: string | null;
  coach: {
    name: string;
    businessName: string | null;
    address: string | null;
    city: string | null;
    siret: string | null;
    vatNumber: string | null;
    // Taux de TVA en points de base (0 = franchise en base).
    vatRateBps?: number | null;
  };
};

// Les polices standard (Helvetica) n'acceptent que WinAnsi : on remplace les
// espaces fines, les guillemets et points de suspension typographiques, les
// ligatures œ, puis on retire tout caractère hors Latin-1 (sauf le symbole
// euro) et les caractères de contrôle, qui font planter l'encodage.
function safe(s: string): string {
  return s
    .replace(/[\u202F\u00A0\u2009]/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u0153/g, "oe")
    .replace(/\u0152/g, "OE")
    .replace(/\u2022/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF\u20AC]/g, "");
}

function money(cents: number, currency: string): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  const str = abs.toFixed(2).replace(".", ",");
  return `${sign}${str} ${currency.toUpperCase() === "EUR" ? "€" : currency.toUpperCase()}`;
}

function dateFr(d: Date): string {
  return safe(
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Paris",
    })
  );
}

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0.06, 0.06, 0.06);
  const grey = rgb(0.45, 0.45, 0.45);
  const light = rgb(0.85, 0.85, 0.85);
  const accent = rgb(0.6, 0.78, 0);
  const M = 50;
  const W = page.getWidth() - 2 * M;
  let y = page.getHeight() - M;

  const text = (
    s: string,
    x: number,
    yy: number,
    o: { size?: number; b?: boolean; color?: typeof black; right?: boolean } = {}
  ) => {
    const f = o.b ? bold : font;
    const size = o.size ?? 10;
    const str = safe(s);
    const w = f.widthOfTextAtSize(str, size);
    page.drawText(str, {
      x: o.right ? x - w : x,
      y: yy,
      size,
      font: f,
      color: o.color ?? black,
    });
  };

  // Liseré accent + marque
  page.drawRectangle({ x: M, y: y - 4, width: W, height: 4, color: accent });
  y -= 30;
  const isCredit = input.kind === "credit_note";
  text(isCredit ? "AVOIR" : "FACTURE", M, y, { size: 22, b: true });
  text("MADGER", M + W, y + 2, { size: 14, b: true, right: true, color: accent });
  y -= 18;
  text(input.number, M, y, { size: 11, b: true, color: grey });
  text("madger.app", M + W, y, { size: 9, right: true, color: grey });
  y -= 14;
  text(`Émise le ${dateFr(input.issuedAt)}`, M, y, { size: 9, color: grey });
  if (isCredit && input.linkedNumber) {
    y -= 12;
    text(`Avoir sur la facture ${input.linkedNumber}`, M, y, { size: 9, color: grey });
  }
  if (isCredit && input.reason) {
    y -= 12;
    text(`Motif : ${input.reason}`, M, y, { size: 9, color: grey });
  }

  // Vendeur / client
  y -= 34;
  const colR = M + W / 2 + 10;
  text("ÉMISE PAR", M, y, { size: 8, b: true, color: grey });
  text("FACTURÉE À", colR, y, { size: 8, b: true, color: grey });
  y -= 14;
  const issuerLines: string[] = [];
  const c = input.coach;
  issuerLines.push(c.businessName?.trim() || c.name);
  if (c.businessName && c.businessName.trim() !== c.name.trim()) issuerLines.push(c.name);
  if (c.address) issuerLines.push(c.address);
  // La ville du profil (celle de l'annuaire) ne complète l'adresse que si
  // aucune adresse de facturation n'est renseignée : une adresse BAN porte
  // déjà son code postal et sa ville.
  if (c.city && !c.address) issuerLines.push(c.city);
  if (c.siret) issuerLines.push(`SIRET : ${c.siret}`);
  if (c.vatNumber) issuerLines.push(`TVA : ${c.vatNumber}`);
  const clientLines = [input.clientName || "-", ...(input.clientEmail ? [input.clientEmail] : [])];
  const n = Math.max(issuerLines.length, clientLines.length);
  for (let i = 0; i < n; i++) {
    if (issuerLines[i]) text(issuerLines[i], M, y, { size: 10, b: i === 0 });
    if (clientLines[i]) text(clientLines[i], colR, y, { size: 10, b: i === 0 });
    y -= 13;
  }

  // Tableau
  y -= 20;
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.8, color: light });
  y -= 14;
  text("DÉSIGNATION", M, y, { size: 8, b: true, color: grey });
  text("DATE", M + W * 0.62, y, { size: 8, b: true, color: grey });
  text("MONTANT", M + W, y, { size: 8, b: true, color: grey, right: true });
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.8, color: light });
  y -= 18;
  const label = isCredit
    ? `Remboursement : ${input.serviceName}`
    : input.serviceName;
  text(label, M, y, { size: 10, b: true });
  text(
    dateFr(input.bookingStartsAt ?? input.issuedAt),
    M + W * 0.62,
    y,
    { size: 10, color: grey }
  );
  const amount = isCredit ? -Math.abs(input.amountCents) : input.amountCents;
  text(money(amount, input.currency), M + W, y, { size: 10, b: true, right: true });
  y -= 12;
  page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.8, color: light });

  // Total : ventilé HT / TVA / TTC pour un coach assujetti, sinon un seul
  // montant (franchise en base : la mention 293 B suit plus bas).
  const withVat = vatApplies(c.vatNumber, c.vatRateBps);
  y -= 26;
  if (withVat) {
    const { htCents, vatCents } = splitVat(Math.abs(amount), c.vatRateBps as number);
    const sign = amount < 0 ? -1 : 1;
    text("Total HT", M + W - 150, y, { size: 10, color: grey });
    text(money(sign * htCents, input.currency), M + W, y, { size: 10, right: true });
    y -= 14;
    text(`TVA ${vatRateLabel(c.vatRateBps as number)}`, M + W - 150, y, { size: 10, color: grey });
    text(money(sign * vatCents, input.currency), M + W, y, { size: 10, right: true });
    y -= 16;
    text("Total TTC", M + W - 150, y, { size: 10, color: grey });
  } else {
    text("Total", M + W - 150, y, { size: 10, color: grey });
  }
  text(money(amount, input.currency), M + W, y, { size: 15, b: true, right: true });
  y -= 16;
  text(
    isCredit
      ? `Remboursé le ${dateFr(input.issuedAt)}`
      : `Acquittée le ${dateFr(input.issuedAt)}`,
    M + W,
    y,
    { size: 9, right: true, color: accent, b: true }
  );

  // Mentions
  y -= 34;
  if (!withVat) {
    text("TVA non applicable, art. 293 B du CGI.", M, y, { size: 9, color: grey });
    y -= 13;
  }
  if (input.paymentRef) {
    text(`Paiement sécurisé Stripe · réf. ${input.paymentRef}`, M, y, { size: 8, color: grey });
    y -= 12;
  }
  text(
    "Document généré automatiquement par Madger pour le compte du coach.",
    M,
    y,
    { size: 8, color: grey }
  );

  return pdf.save();
}
