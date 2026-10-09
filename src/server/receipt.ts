import PDFDocument from 'pdfkit';

export interface ReceiptData {
  receipt_number: string;
  payment_date: Date | string;
  student_name: string;
  student_code?: string;
  student_email?: string;
  student_phone?: string;
  course_name: string;
  installment_label: string;   // e.g. "Installment 2 (March 2026)"
  amount: number;
  transaction_id: string;
  payment_method: string;
  gateway: string;
  installment_amount?: number;
  installment_paid?: number;   // total paid against this installment (incl. this payment)
  installment_balance?: number;
  academy: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
  };
}

const RED = '#B91C1C';
const CHARCOAL = '#1E242B';
const AMBER = '#D97706';
const GREY = '#64748B';
const LIGHT = '#F1F5F9';

/** Built-in PDF fonts have no rupee glyph, so amounts are printed as "Rs." */
const rs = (n: number) =>
  `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---- Amount in words (Indian numbering) ----
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
  'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '');
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
}

export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));

  let words = rupees ? `${parts.join(' ')} Rupees` : '';
  if (paise) words += `${words ? ' and ' : ''}${twoDigits(paise)} Paise`;
  return `${words} Only`;
}

/** Streams a one-page A4 receipt into a Buffer */
export function buildReceiptPdf(d: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Fee Receipt ${d.receipt_number}`,
        Author: d.academy.name,
        Subject: `Fee receipt for ${d.student_name}`
      }
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 40;
    const W = doc.page.width - 80; // content width

    // ---------- Header band ----------
    doc.rect(0, 0, doc.page.width, 110).fill(CHARCOAL);
    doc.rect(0, 110, doc.page.width, 4).fill(RED);

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(d.academy.name, L, 28, { width: W - 140 });
    doc.font('Helvetica').fontSize(8.5).fillColor('#CBD5E1');
    const sub = [d.academy.address, [d.academy.phone, d.academy.email].filter(Boolean).join('  |  ')]
      .filter(Boolean).join('\n');
    if (sub) doc.text(sub, L, 56, { width: W - 140 });

    doc.font('Helvetica-Bold').fontSize(15).fillColor(AMBER)
      .text('FEE RECEIPT', L, 30, { width: W, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor('#E2E8F0')
      .text(`No: ${d.receipt_number}`, L, 52, { width: W, align: 'right' });
    doc.text(
      `Date: ${new Date(d.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      L, 66, { width: W, align: 'right' }
    );

    // ---------- Student block ----------
    let y = 140;
    doc.roundedRect(L, y, W, 92, 6).fill(LIGHT);
    const field = (label: string, value: string, x: number, yy: number, w: number) => {
      doc.font('Helvetica').fontSize(8).fillColor(GREY).text(label.toUpperCase(), x, yy, { width: w });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(CHARCOAL).text(value || '-', x, yy + 11, { width: w });
    };
    field('Received from', d.student_name, L + 14, y + 12, W / 2 - 20);
    field('Student ID', d.student_code || '-', L + W / 2, y + 12, W / 2 - 20);
    field('Course', d.course_name, L + 14, y + 52, W / 2 - 20);
    field('Towards', d.installment_label, L + W / 2, y + 52, W / 2 - 20);

    // ---------- Amount box ----------
    y += 110;
    doc.roundedRect(L, y, W, 62, 6).lineWidth(1.5).stroke(RED);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(RED).text('AMOUNT RECEIVED', L + 16, y + 12);
    doc.font('Helvetica-Bold').fontSize(24).fillColor(CHARCOAL)
      .text(rs(d.amount), L, y + 14, { width: W - 16, align: 'right' });
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(GREY)
      .text(amountInWords(d.amount), L + 16, y + 40, { width: W - 32 });

    // ---------- Payment details table ----------
    y += 84;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(CHARCOAL).text('Payment details', L, y);
    y += 18;
    const rows: [string, string][] = [
      ['Payment mode', d.gateway.toLowerCase().startsWith(d.payment_method.toLowerCase()) ? d.gateway : `${d.payment_method.toUpperCase()} (${d.gateway})`],
      ['Transaction / UTR', d.transaction_id]
    ];
    if (d.installment_amount !== undefined) rows.push(['Installment amount', rs(d.installment_amount)]);
    if (d.installment_paid !== undefined) rows.push(['Paid against this installment', rs(d.installment_paid)]);
    if (d.installment_balance !== undefined) rows.push(['Balance due on this installment', rs(d.installment_balance)]);

    rows.forEach(([k, v], i) => {
      if (i % 2 === 0) doc.rect(L, y - 3, W, 20).fill('#F8FAFC');
      doc.font('Helvetica').fontSize(9.5).fillColor(GREY).text(k, L + 10, y + 1, { width: 200 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(CHARCOAL).text(v, L + 220, y + 1, { width: W - 230 });
      y += 20;
    });

    // ---------- Signature + footer ----------
    y += 50;
    doc.moveTo(L + W - 170, y).lineTo(L + W, y).lineWidth(0.8).stroke('#94A3B8');
    doc.font('Helvetica').fontSize(8.5).fillColor(GREY)
      .text('Authorised Signatory', L + W - 170, y + 4, { width: 170, align: 'center' });

    const fy = doc.page.height - 80;
    doc.moveTo(L, fy).lineTo(L + W, fy).lineWidth(0.5).stroke('#CBD5E1');
    doc.font('Helvetica').fontSize(8).fillColor(GREY).text(
      [
        'This is a computer generated receipt and does not require a physical signature.',
        [d.academy.website, d.academy.gstin ? `GSTIN: ${d.academy.gstin}` : ''].filter(Boolean).join('   |   '),
        'Thank you for learning with Srikara Training & Placement Academy.'
      ].filter(Boolean).join('\n'),
      L, fy + 8, { width: W, align: 'center' }
    );

    doc.end();
  });
}
