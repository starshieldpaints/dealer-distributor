import { pool } from '../src/db/pool';
import { logger } from '../src/logger';
import { loadEnv } from '../src/config/env';

const env = loadEnv();
const resourceId =
  process.env.DATA_GOV_RESOURCE_ID ?? env.dataGovResourceId ?? '5c2f62fe-5afa-4119-a499-fec9d604d5bd';
const apiKey = process.env.DATA_GOV_API_KEY ?? env.dataGovApiKey;
const baseUrl =
  process.env.DATA_GOV_BASE_URL ?? env.dataGovBaseUrl ?? 'https://api.data.gov.in/resource/';
const pageSize = Number(process.env.DATA_GOV_PAGE_SIZE ?? '500');

if (!apiKey) {
  throw new Error('DATA_GOV_API_KEY is required to sync pincodes');
}

const buildUrl = (offset: number): string => {
  const params = new URLSearchParams({
    'api-key': apiKey,
    format: 'json',
    offset: offset.toString(),
    limit: pageSize.toString()
  });
  return `${baseUrl}${resourceId}?${params.toString()}`;
};

interface PincodeRecord {
  pincode: string;
  officename?: string;
  officeType?: string;
  Deliverystatus?: string;
  divisionname?: string;
  regionname?: string;
  circlename?: string;
  Taluk?: string;
  Districtname?: string;
  statename?: string;
  latitude?: string;
  longitude?: string;
}

const upsertBatch = async (records: PincodeRecord[]): Promise<void> => {
  if (records.length === 0) return;
  const unique = new Map<string, PincodeRecord>();
  for (const record of records) {
    if (!record.pincode) continue;
    unique.set(record.pincode, record);
  }
  const deduped = Array.from(unique.values());
  if (deduped.length === 0) return;
  const values: any[] = [];
  const rows: string[] = [];
  let index = 1;
  for (const record of deduped) {
    rows.push(
      `($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`
    );
    values.push(
      record.pincode,
      record.officename ?? null,
      record.officeType ?? null,
      record.Deliverystatus ?? null,
      record.divisionname ?? null,
      record.regionname ?? null,
      record.circlename ?? null,
      record.Taluk ?? null,
      record.Districtname ?? null,
      record.statename ?? null,
      record.latitude ? Number(record.latitude) : null,
      record.longitude ? Number(record.longitude) : null
    );
  }
  await pool.query({
    text: `
      INSERT INTO pincodes (
        code,
        office_name,
        office_type,
        delivery_status,
        division_name,
        region_name,
        circle_name,
        taluk,
        district_name,
        state_name,
        latitude,
        longitude
      )
      VALUES ${rows.join(',')}
      ON CONFLICT (code)
      DO UPDATE SET
        office_name = EXCLUDED.office_name,
        office_type = EXCLUDED.office_type,
        delivery_status = EXCLUDED.delivery_status,
        division_name = EXCLUDED.division_name,
        region_name = EXCLUDED.region_name,
        circle_name = EXCLUDED.circle_name,
        taluk = EXCLUDED.taluk,
        district_name = EXCLUDED.district_name,
        state_name = EXCLUDED.state_name,
        latitude = COALESCE(EXCLUDED.latitude, pincodes.latitude),
        longitude = COALESCE(EXCLUDED.longitude, pincodes.longitude),
        last_synced_at = NOW()
    `,
    values
  });
};

const run = async (): Promise<void> => {
  let offset = 0;
  let total = 0;
  while (true) {
    const url = buildUrl(offset);
    logger.info({ url }, 'Fetching pincode batch');
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch data.gov.in response: ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as { records: PincodeRecord[]; count: number };
    const records = body.records ?? [];
    if (records.length === 0) break;
    await upsertBatch(records);
    total += records.length;
    offset += records.length;
    if (records.length < pageSize) break;
  }
  logger.info({ total }, 'Pincode sync complete');
  await pool.end();
};

run().catch(async (error) => {
  logger.error({ error }, 'Failed to sync pincodes');
  await pool.end();
  process.exitCode = 1;
});
