import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { importPriceListRows, type PriceListImportRow } from '../src/modules/catalog/catalog.repository';

const parseNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const n = Number(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

const run = async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: tsx scripts/import-price-list.ts <path-to-xlsx>');
    process.exit(1);
  }
  const abs = path.resolve(filePath);
  console.log('Resolved file:', abs);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    console.error(`Path is a directory, not a file: ${abs}`);
    process.exit(1);
  }

  const workbook = XLSX.read(fs.readFileSync(abs), { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error('No sheet found in workbook');
  }
  const rowsRaw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
  const safeText = (val: any): string | undefined => {
    if (val === null || val === undefined) return undefined;
    const s = String(val).trim();
    return s.length > 0 ? s : undefined;
  };

  const mapped: PriceListImportRow[] = rowsRaw
    .map((row) => ({
      categoryName: safeText(row['Category Name']) ?? safeText(row['Category']),
      productName: safeText(row['Product Name']) ?? safeText(row['Product']) ?? '',
      hsnCode: safeText(row['HSN']),
      qty: safeText(row['QTY']),
      volume: safeText(row['KGS/Ml/LTr']),
      ratio: safeText(row['Ratio']),
      discountPercent: parseNumber(row['Discount %']),
      priceWithoutTax: parseNumber(row['Price without Tax']),
      dpl: parseNumber(row['DPL']),
      dplWithTax: parseNumber(row['DPL With Tax']),
      promo: parseNumber(row['Promo']),
      mrp: parseNumber(row['MRP'])
    }))
    .filter((r) => r.productName && r.productName.trim().length > 0);

  if (mapped.length === 0) {
    throw new Error('No product rows found');
  }

  const result = await importPriceListRows(mapped, undefined, {
    id: 'bdb45bda-741c-4141-b13c-ed199a806120',
    role: 'admin'
  } as any);
  console.log(`Imported ${mapped.length} rows → priceList ${result.priceListId}; inserted ${result.inserted}, updated ${result.updated}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
