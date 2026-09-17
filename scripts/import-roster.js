import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseParticipantCsv } from '../server/utils/csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    csv: path.join(repoRoot, 'data', 'stc-vol8-roster.csv'),
    db: null,
    dry: false,
    event: null
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--csv') args.csv = argv[++i];
    else if (a === '--db') args.db = argv[++i];
    else if (a === '--dry') args.dry = true;
    else if (a === '--event') args.event = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.db) {
    process.env.DB_PATH = path.resolve(args.db);
  }

  const csvPath = path.resolve(args.csv);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`File CSV tidak ditemukan di: ${csvPath}`);
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const preview = parseParticipantCsv(csvText);

  console.log(`\n[import-roster] ${args.dry ? 'DRY RUN — ' : ''}Parsed ${preview.valid.length} valid racers, ${preview.skipped.length} skipped rows from ${path.basename(csvPath)}`);

  if (preview.skipped.length > 0) {
    console.log(`\n[import-roster] Sample skipped rows (up to 5):`);
    preview.skipped.slice(0, 5).forEach(s => {
      console.log(`  - Baris ${s.row}: ${s.reason}`);
    });
  }

  if (args.dry) {
    console.log('\n[import-roster] DRY RUN complete. No database mutations made.\n');
    return;
  }

  const { initDatabase } = await import('../server/db.js');
  await initDatabase();

  const { getActiveEventId, getActiveEvent } = await import('../server/services/eventService.js');
  const { importParticipants } = await import('../server/services/participantService.js');

  const targetEventId = args.event || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Silakan buat atau aktifkan event terlebih dahulu, atau gunakan opsi --event <id>');
  }

  const activeEvent = getActiveEvent();
  console.log(`\n[import-roster] Target Event: ${activeEvent?.nama || targetEventId} (${targetEventId})`);

  const result = importParticipants(preview.valid, { event_id: targetEventId });

  console.log(`\n[import-roster] Sukses mengimpor ${result.count} peserta!`);
  if (result.imported.length > 0) {
    const firstNum = result.imported[0].participant_number;
    const lastNum = result.imported[result.imported.length - 1].participant_number;
    console.log(`[import-roster] Alokasi nomor: #${firstNum} s/d #${lastNum}`);
    console.log(`\nSample imported participants (first 5):`);
    result.imported.slice(0, 5).forEach(p => {
      console.log(`  #${p.participant_number} - ${p.name} (Tim: ${p.team_name || '-'})`);
    });
  }
  console.log('\n[import-roster] Selesai.\n');
}

main().catch((err) => {
  console.error('[import-roster] FAILED:', err.message || err);
  process.exit(1);
});