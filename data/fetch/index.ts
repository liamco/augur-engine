import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import type { depot } from './vendor';

import convertToJSON from './convert-to-json';
import generateData from './generate-data';
import { CSV_DIR, JSON_DIR, FACTIONS_DIR } from './paths';

const SOURCE_DATA_DIR = CSV_DIR;
const LOG_PREFIX = '[fetch]';

/**
 * Wahapedia publishes all ~26 factions, but this project's codex covers three.
 * Fetching the rest would expand data/src eightfold and make `npm run parse`
 * generate a codex for factions the app never loads. Override with
 * `--factions=a,b,c`, or take everything with `--all`.
 */
const DEFAULT_FACTIONS = ['space-marines', 'tyranids', 'necrons'];

/**
 * Which Wahapedia edition export to pull from. `wh40k11ed` is the site's current
 * section (10th is archived), so future 11th-edition data will land there.
 *
 * As of 2026-06 the two exports are near-identical: same schema across all 19
 * files, differing by a single datasheet row, with the 11ed export's last_update
 * (2026-05-09) actually *older* than 10ed's (2026-06-13), and both still linking
 * to /wh40k10ed/ pages. The CSV export has evidently not been rebuilt for 11th
 * edition yet. Override with `--edition=wh40k10ed` if you need the fresher feed.
 */
const DEFAULT_EDITION = 'wh40k11ed';

const editionArg = process.argv.find((a) => a.startsWith('--edition='));
const edition = editionArg
  ? editionArg.slice('--edition='.length).trim()
  : DEFAULT_EDITION;

const factionsArg = process.argv.find((a) => a.startsWith('--factions='));
const wantsAllFactions = process.argv.includes('--all');
const factionAllowlist = wantsAllFactions
  ? null
  : new Set(
      factionsArg
        ? factionsArg.slice('--factions='.length).split(',').map((s) => s.trim())
        : DEFAULT_FACTIONS
    );

const log = (message: string) => console.log(`${LOG_PREFIX} ${message}`);
const logError = (message: string, error?: unknown) =>
  console.error(`${LOG_PREFIX} ${message}`, error);

const getFileName = (input: string) =>
  input.toLowerCase().replace(/_/g, '-').replace('.csv', '.json');

const getCSVFileName = (input: string) => input.toLowerCase().replace(/_/g, '-');

const WAHAPEDIA_CSV_FILES = [
  'Factions.csv',
  'Source.csv',
  'Datasheets.csv',
  'Datasheets_abilities.csv',
  'Datasheets_keywords.csv',
  'Datasheets_models.csv',
  'Datasheets_options.csv',
  'Datasheets_wargear.csv',
  'Datasheets_unit_composition.csv',
  'Datasheets_models_cost.csv',
  'Datasheets_stratagems.csv',
  'Datasheets_enhancements.csv',
  'Datasheets_detachment_abilities.csv',
  'Datasheets_leader.csv',
  'Stratagems.csv',
  'Abilities.csv',
  'Enhancements.csv',
  'Detachment_abilities.csv',
  'Last_update.csv'
];

const fetchCSV = (url: string) => fetch(url).then((response) => response.text());

const forceDownload = process.argv.includes('--force-download');

const init = async () => {
  if (existsSync(JSON_DIR)) {
    rmSync(JSON_DIR, { recursive: true, force: true });
  }

  // NOTE: unlike the prototype, the output directory is NOT wiped wholesale.
  // FACTIONS_DIR is committed source data, and a scoped run (--factions=…) would
  // otherwise delete the factions it isn't regenerating. Each faction's own
  // directory is replaced individually below instead.

  const sourceDataExists = existsSync(SOURCE_DATA_DIR);
  const shouldDownload = forceDownload || !sourceDataExists;

  if (forceDownload && sourceDataExists) {
    log('Force download flag detected, removing existing source data');
    rmSync(SOURCE_DATA_DIR, { recursive: true, force: true });
  }

  log('Creating directories');
  mkdirSync(JSON_DIR, { recursive: true });
  if (!existsSync(SOURCE_DATA_DIR)) {
    mkdirSync(SOURCE_DATA_DIR, { recursive: true });
  }

  const fileNames = WAHAPEDIA_CSV_FILES.map(getFileName);
  const csvFileNames = WAHAPEDIA_CSV_FILES.map(getCSVFileName);
  let results: string[];

  if (shouldDownload) {
    log(`Fetching CSV data from Wahapedia (${edition})`);
    const requests = WAHAPEDIA_CSV_FILES.map((fileName) =>
      fetchCSV(`https://wahapedia.ru/${edition}/${fileName}`)
    );
    results = await Promise.all(requests);

    log('Saving raw CSV files for debugging');
    for (let i = 0; i < results.length; i++) {
      const csvPath = join(SOURCE_DATA_DIR, csvFileNames[i]);
      log(`Saving ${csvPath}`);
      writeFileSync(csvPath, results[i]);
    }
  } else {
    log('Using existing source data files');
    results = csvFileNames.map((fileName) => {
      const csvPath = join(SOURCE_DATA_DIR, fileName);
      log(`Reading ${csvPath}`);
      return readFileSync(csvPath, 'utf-8');
    });
  }

  log('Parsing data from CSV');
  for (let i = 0; i < results.length; i++) {
    const parsedData = convertToJSON(results[i]);
    const jsonPath = join(JSON_DIR, fileNames[i]);
    log(`Creating ${jsonPath}`);
    writeFileSync(jsonPath, JSON.stringify(parsedData));
  }

  log('Generating faction files');
  mkdirSync(FACTIONS_DIR, { recursive: true });

  const { factions, dataVersion, skippedForMissingSource } = generateData();
  const skipped: string[] = [];

  if (skippedForMissingSource.length > 0) {
    log(
      `Skipped ${skippedForMissingSource.length} datasheet(s) with no resolvable source: ${skippedForMissingSource.join(', ')}`
    );
  }

  factions.forEach((faction) => {
    if (factionAllowlist && !factionAllowlist.has(faction.slug)) {
      skipped.push(faction.slug);
      return;
    }

    const factionDir = join(FACTIONS_DIR, faction.slug);
    const datasheetsDir = join(factionDir, 'datasheets');

    // Replace this faction's directory so datasheets dropped upstream don't
    // linger as stale files.
    rmSync(factionDir, { recursive: true, force: true });
    mkdirSync(datasheetsDir, { recursive: true });

    const manifestDatasheets: depot.DatasheetSummary[] = faction.datasheets.map((datasheet) => ({
      id: datasheet.id,
      slug: datasheet.slug,
      name: datasheet.name,
      factionId: faction.id,
      factionSlug: faction.slug,
      role: datasheet.role,
      roleLabel: datasheet.roleLabel,
      supplementKey: datasheet.supplementKey,
      path: `/data/factions/${faction.slug}/datasheets/${datasheet.id}.json`,
      supplementSlug: datasheet.supplementSlug,
      supplementName: datasheet.supplementName,
      supplementLabel: datasheet.supplementLabel,
      isSupplement: datasheet.isSupplement,
      link: datasheet.link,
      isForgeWorld: datasheet.isForgeWorld,
      isLegends: datasheet.isLegends
    }));

    if (manifestDatasheets.length === 0) {
      log(`Skipping ${faction.slug} (no datasheets)`);
      return;
    }

    const manifest: depot.FactionManifest = {
      id: faction.id,
      slug: faction.slug,
      name: faction.name,
      link: faction.link,
      datasheets: manifestDatasheets,
      detachments: faction.detachments,
      dataVersion: dataVersion ?? undefined,
      datasheetCount: manifestDatasheets.length,
      detachmentCount: faction.detachments.length
    };

    const manifestPath = join(factionDir, 'faction.json');
    log(`Creating ${manifestPath}`);
    writeFileSync(manifestPath, JSON.stringify(manifest));

    log(`Creating ${manifestDatasheets.length} datasheets for ${faction.slug}`);
    faction.datasheets.forEach((datasheet) => {
      const datasheetPath = join(datasheetsDir, `${datasheet.id}.json`);
      writeFileSync(datasheetPath, JSON.stringify(datasheet));
    });
  });

  if (skipped.length > 0) {
    log(`Skipped ${skipped.length} faction(s) not in scope: ${skipped.join(', ')}`);
    log('Pass --all to fetch every faction, or --factions=a,b,c to choose.');
  }

  // The prototype also emitted index.json and core-stratagems.json for its web
  // app. Neither belongs here: `npm run parse` derives the codex, including core
  // stratagems, from these faction files.
};

init()
  .then(() => log('Done!'))
  .catch((e) => logError("fetch failed", e));
