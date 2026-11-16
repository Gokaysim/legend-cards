import type {
  AliasError,
  AliasKind,
  ArtCoverage,
  ArtFile,
  ArtGroup,
  ArtPlan,
  ArtPlanMode,
} from './artFiles.ts'
import type { CardFileError, CardFileWarning, Deck, LimitedField } from './cardRows.ts'
import type { CardOutcome, DeckPlan, Upgrade } from './importCards.ts'
import type { PictureDefinition, PictureOutcome, PicturePlan } from './importPictures.ts'
import type {
  SetImportPlan,
  SetImportWritten,
  SetPictureField,
  SetPictureOutcome,
} from './importSets.ts'
import type { WordPlan } from './importTrueWords.ts'
import type { SetFileError, SetTextField } from './setRows.ts'
import type { TrueWordFileError, WordLimitedField } from './trueWordRows.ts'

const DECK_LABELS: Readonly<Record<Deck, string>> = {
  legend: 'Legend kartlar',
  cursed: 'Cursed kartlar',
}

/** Column names as the owner's files write them. */
const COLUMN_LABELS: Readonly<Record<string, string>> = {
  name: 'Name',
  set: 'Set',
  cost: 'Cost',
  rarity: 'Rarity',
  text: 'Text',
  'mechanic pack': 'Mechanic Pack',
}

const FIELD_LABELS: Readonly<Record<LimitedField, string>> = {
  name: 'Kart adı',
  setCode: 'Set',
  cost: 'Cost',
  mechanicPack: 'Mechanic Pack',
  text: 'Kart metni',
}

const OUTCOME_LABELS: Readonly<Record<CardOutcome, { done: string; planned: string }>> = {
  'added-active': { done: 'yayında eklendi', planned: 'yayında eklenecek' },
  'added-draft': { done: 'taslak eklendi', planned: 'taslak eklenecek' },
  existing: { done: 'zaten kayıtlıydı (dokunulmadı)', planned: 'zaten kayıtlı (dokunulmayacak)' },
}

const UPGRADE_LABELS = { done: 'eski kayda durum verildi', planned: 'eski kayda durum verilecek' }
const DRAFT_LIST_LABELS = { done: 'Taslak eklenenler', planned: 'Taslak eklenecekler' }

/** What an import did, or would do: the outcome counts, the upgrades, and every draft with its empty columns. */
function additionReport(
  title: string,
  counts: Record<CardOutcome, number>,
  upgrades: readonly Upgrade[],
  items: readonly { name: string; outcome: CardOutcome; missing: readonly string[] }[],
  dryRun: boolean,
): string[] {
  const tense = dryRun ? 'planned' : 'done'
  const summary = [
    ...(Object.keys(OUTCOME_LABELS) as CardOutcome[]).map(
      (outcome) => `${counts[outcome]} ${OUTCOME_LABELS[outcome][tense]}`,
    ),
    `${upgrades.length} ${UPGRADE_LABELS[tense]}`,
  ].join(', ')
  const drafts = items
    .filter((item) => item.outcome === 'added-draft')
    .map((item) => {
      const empty = item.missing.map((column) => COLUMN_LABELS[column] ?? column).join(', ')
      return `${item.name} (${empty} boş)`
    })
  return [
    `${title}: ${summary}.`,
    ...(drafts.length > 0 ? [`  ${DRAFT_LIST_LABELS[tense]}: ${drafts.join('; ')}`] : []),
  ]
}

function cardFileError(file: string, error: CardFileError): string {
  switch (error.kind) {
    case 'unreadable':
      return `${file}: CSV okunamadı (${error.detail}).`
    case 'missing-columns':
      return `${file}: eksik sütun: ${error.columns.map((column) => COLUMN_LABELS[column] ?? column).join(', ')}. Doğru dosya mı?`
    case 'empty-name':
      return `${file}, satır ${error.row}: kart adı boş.`
    case 'name-without-letters':
      return `${file}, satır ${error.row}: "${error.name}" adında harf ya da rakam yok.`
    case 'too-long':
      return `${file}, satır ${error.row} (${error.name}): ${FIELD_LABELS[error.field]} en fazla ${error.max} karakter olabilir.`
    case 'invalid-rarity':
      return `${file}, satır ${error.row} (${error.name}): rarity ${error.rarity ? `"${error.rarity}"` : 'boş'}; Common veya Rare olmalı.`
    case 'blessed-with-rarity':
      return `${file}, satır ${error.row} (${error.name}): Blessed kartın rarity'si "—", "Blessed" ya da boş olmalı, "${error.rarity}" yazıyor.`
    case 'duplicate':
      return `${file}, satır ${error.rows[0]} ve ${error.rows[1]}: "${error.name}" adı iki kez var.`
  }
}

function cardFileWarning(file: string, warning: CardFileWarning): string {
  switch (warning.kind) {
    case 'unknown-set':
      return `${file}: "${warning.setCode}" set kodu kayıtlı setler arasında yok (${warning.count} kart). Seti Setler ekranında ekle (ya da npm run import-sets çalıştır); o zamana kadar uygulama kodu olduğu gibi gösterir.`
    case 'unknown-mechanic-pack':
      return `${file}: "${warning.mechanicPack}" bilinen 8 mechanic pack'ten biri değil (${warning.count} kart).`
  }
}

function deckReport({ deck, counts, cards, upgrades }: DeckPlan, dryRun: boolean): string[] {
  return additionReport(DECK_LABELS[deck], counts, upgrades, cards, dryRun)
}

const WORD_FIELD_LABELS: Readonly<Record<WordLimitedField, string>> = {
  name: 'True Word adı',
  cost: 'Cost',
  text: 'True Word metni',
}

function trueWordFileError(file: string, error: TrueWordFileError): string {
  switch (error.kind) {
    case 'unreadable':
      return `${file}: CSV okunamadı (${error.detail}).`
    case 'missing-columns':
      return `${file}: eksik sütun: ${error.columns.map((column) => COLUMN_LABELS[column] ?? column).join(', ')}. Doğru dosya mı?`
    case 'empty-name':
      return `${file}, satır ${error.row}: True Word adı boş.`
    case 'name-without-letters':
      return `${file}, satır ${error.row}: "${error.name}" adında harf ya da rakam yok.`
    case 'too-long':
      return `${file}, satır ${error.row} (${error.name}): ${WORD_FIELD_LABELS[error.field]} en fazla ${error.max} karakter olabilir.`
    case 'duplicate':
      return `${file}, satır ${error.rows[0]} ve ${error.rows[1]}: "${error.name}" adı iki kez var.`
  }
}

function wordReport({ counts, words, upgrades }: WordPlan, dryRun: boolean): string[] {
  return additionReport('True Words', counts, upgrades, words, dryRun)
}

const ALIAS_KIND_LABELS: Readonly<Record<AliasKind, string>> = {
  legend: 'Legend kart',
  cursed: 'Cursed kart',
  word: 'True Word',
  asset: 'Asset',
}

/** The alias table's columns as it writes them. */
const ALIAS_COLUMN_LABELS: Readonly<Record<string, string>> = {
  file: 'File',
  kind: 'Kind',
  name: 'Name',
}

function aliasError(file: string, error: AliasError): string {
  switch (error.kind) {
    case 'unreadable':
      return `${file}: CSV okunamadı (${error.detail}).`
    case 'missing-columns':
      return `${file}: eksik sütun: ${error.columns.map((column) => ALIAS_COLUMN_LABELS[column] ?? column).join(', ')}. Sütunlar File, Kind, Name olmalı.`
    case 'empty-cell':
      return `${file}, satır ${error.row}: ${error.column} boş.`
    case 'unknown-kind':
      return `${file}, satır ${error.row}: "${error.value}" geçerli bir Kind değil; legend, cursed, word ya da asset olmalı.`
    case 'unknown-target':
      return `${file}, satır ${error.row}: ${ALIAS_KIND_LABELS[error.aliasKind]} "${error.name}" bulunamadı.`
    case 'duplicate-file':
      return `${file}, satır ${error.rows[0]} ve ${error.rows[1]}: "${error.file}" dosyası iki kez var.`
  }
}

const ART_GROUP_LABELS: Readonly<Record<ArtGroup, string>> = {
  normal: 'Normal kartlar',
  blessed: 'Blessed kartlar',
  cursed: 'Cursed kartlar',
  word: 'True Words',
  back: "Cardback'ler",
  pack: 'Pack görselleri',
  mascot: 'Cardmaker',
  setBack: "Set cardback'leri",
  setMascot: "Set Cardmaker'ları",
}

/** A file in the report: its name, and the archive it came from. */
type ReportedFile = ArtFile & { from?: string | null }
const fileLabel = ({ name, from }: ReportedFile) => (from ? `${name} (${from})` : name)

/** What the report says of the files each script plans, when another script leaves them to it. */
const LEFT_TO_LABELS: Readonly<Record<ArtPlanMode, string>> = {
  definitions: 'Kart ve True Word dosyaları (npm run import-pictures yükler)',
  assets: 'Blessed/Cursed cardback, pack ve ekran Cardmaker dosyaları (npm run build-art hazırlar)',
  sets: 'Set cardback ve Cardmaker dosyaları (npm run import-sets yükler)',
}

/** The duplicates of a plan. */
function duplicateLines<F extends ReportedFile>(plan: ArtPlan<F>): string[] {
  const lines = [`Çift dosyalar (kullanılmadı): ${plan.duplicates.length}`]
  for (const { file, target, winner } of plan.duplicates) {
    lines.push(`  ${fileLabel(file)} → ${target.label}; kullanılan: ${fileLabel(winner)}`)
  }
  return lines
}

/** The duplicates, the unknown files (for an import) and how many files each other script plans. */
function fileLines<F extends ReportedFile>(plan: ArtPlan<F>): string[] {
  const lines = duplicateLines(plan)
  if (plan.mode !== 'assets') {
    lines.push(`Tanınmayan dosyalar (atlandı): ${plan.unknown.length}`)
    for (const file of plan.unknown) lines.push(`  ${fileLabel(file)}`)
  }
  for (const mode of Object.keys(LEFT_TO_LABELS) as ArtPlanMode[]) {
    if (mode !== plan.mode) lines.push(`${LEFT_TO_LABELS[mode]}: ${plan.leftTo[mode].length}`)
  }
  return lines
}

/** What a picture build found: the pictures per kind with the ones missing, the duplicates and the other files. */
function artReport<F extends ReportedFile>(plan: ArtPlan<F>, fileCount: number): string[] {
  const lines = [`${fileCount} dosya okundu.`]
  for (const [group, { expected, found, missing }] of Object.entries(plan.coverage) as [
    ArtGroup,
    ArtCoverage,
  ][]) {
    const label = ART_GROUP_LABELS[group]
    const count = `  ${label}: ${found}/${expected}`
    lines.push(missing.length > 0 ? `${count} · görseli yok: ${missing.join(', ')}` : count)
  }
  return [...lines, ...fileLines(plan)]
}

/** The kind of a definition, as the picture import's report groups it. */
const groupOf = (definition: PictureDefinition): ArtGroup => definition.kind ?? 'word'

/**
 * What a picture import does (spec: admin-scripts, "Picture import report and dry run"): per kind, the pictures it
 * gives, the definitions that already have one and those whose picture the DM removed; the definitions without a
 * picture after it; and the duplicates, unknown files and asset files.
 */
function picturesReport<F extends ReportedFile>(plan: PicturePlan<F>, fileCount: number): string[] {
  const lines = [`${fileCount} dosya okundu.`]
  for (const group of ['normal', 'blessed', 'cursed', 'word'] as const) {
    const count = (outcome: PictureOutcome) =>
      plan.pictures.filter(
        ({ definition, outcome: planned }) => groupOf(definition) === group && planned === outcome,
      ).length
    lines.push(
      `  ${ART_GROUP_LABELS[group]}: ${count('add')} resim eklenir · ${count('has')} zaten resimli · ${count('removed')} resmini DM kaldırmış`,
    )
  }
  lines.push(`Resmi olmayacaklar: ${plan.withoutPicture.length}`)
  for (const definition of plan.withoutPicture) {
    const removed = definition.picture.kind === 'removed' ? ' (resmini DM kaldırmış)' : ''
    lines.push(`  ${ART_GROUP_LABELS[groupOf(definition)]}: ${definition.name}${removed}`)
  }
  return [...lines, ...fileLines(plan.art)]
}

const SET_FIELD_LABELS: Readonly<Record<SetTextField, string>> = {
  code: 'Code',
  name: 'Name',
  alias: 'Alias',
}

/** The set file's columns as it writes them. */
const SET_COLUMN_LABELS: Readonly<Record<string, string>> = {
  code: 'Code',
  name: 'Name',
  aliases: 'Aliases',
  packs: 'Packs',
}

function setFileError(file: string, error: SetFileError): string {
  switch (error.kind) {
    case 'unreadable':
      return `${file}: CSV okunamadı (${error.detail}).`
    case 'missing-columns':
      return `${file}: eksik sütun: ${error.columns.map((column) => SET_COLUMN_LABELS[column] ?? column).join(', ')}. Sütunlar Code, Name, Aliases, Packs olmalı.`
    case 'empty-cell':
      return `${file}, satır ${error.row}: ${error.column} boş.`
    case 'without-letters':
      return `${file}, satır ${error.row}: ${SET_FIELD_LABELS[error.field]} "${error.value}" içinde harf ya da rakam yok.`
    case 'too-long':
      return `${file}, satır ${error.row}: ${SET_FIELD_LABELS[error.field]} en fazla ${error.max} karakter olabilir.`
    case 'too-many-aliases':
      return `${file}, satır ${error.row}: ${error.count} alias var; en fazla ${error.max} olabilir.`
    case 'unknown-packs':
      return `${file}, satır ${error.row}: Packs ${error.value ? `"${error.value}"` : 'boş'}; standard ya da pandemonium olmalı.`
    case 'blessed-code':
      return `${file}, satır ${error.row}: "Blessed" bir set kodu olamaz: Blessed kartların seti yoktur.`
    case 'duplicate':
      return error.field === 'name'
        ? `${file}, satır ${error.rows[0]} ve ${error.rows[1]}: "${error.value}" adı iki kez var.`
        : `${file}, satır ${error.rows[0]} ve ${error.rows[1]}: "${error.value}" iki setin kodu ya da alias'ı.`
  }
}

/** A set's picture fields in report order (`SET_PICTURE_FIELDS`, kept here so messages load no Firebase or sharp). */
const SET_PICTURE_FIELDS: readonly SetPictureField[] = ['cardback', 'mascot']

const SET_PICTURE_LABELS: Readonly<Record<SetPictureField, string>> = {
  cardback: 'Cardback',
  mascot: 'Cardmaker',
}

const SET_WITHOUT_LABELS: Readonly<Record<SetPictureField, string>> = {
  cardback: "Cardback'i olmayacak setler",
  mascot: "Cardmaker'ı olmayacak setler",
}

const SET_OUTCOME_LABELS = {
  added: { done: 'eklendi', planned: 'eklenecek' },
  existing: { done: 'zaten kayıtlıydı (dokunulmadı)', planned: 'zaten kayıtlı (dokunulmayacak)' },
  list: { done: 'Eklenenler', planned: 'Eklenecekler' },
} as const

/**
 * What a set import does (spec: admin-scripts, "Set import report and dry run"): the sets added, by name, and the
 * ones already stored; with an archive folder, per picture the ones given, already there and removed by the DM, the
 * sets still without each, the duplicates and the files that match no set.
 */
function setsReport<F extends ReportedFile>(
  plan: SetImportPlan<F>,
  fileCount: number | null,
  dryRun: boolean,
): string[] {
  const tense = dryRun ? 'planned' : 'done'
  const { added, existing } = plan.sets
  const lines = [
    `Setler: ${added.length} ${SET_OUTCOME_LABELS.added[tense]}, ${existing.length} ${SET_OUTCOME_LABELS.existing[tense]}.`,
  ]
  if (added.length > 0) {
    lines.push(`  ${SET_OUTCOME_LABELS.list[tense]}: ${added.map(({ name }) => name).join(', ')}`)
  }
  const pictures = plan.pictures
  if (pictures === null) return lines
  if (fileCount !== null) lines.push(`${fileCount} dosya okundu.`)
  for (const field of SET_PICTURE_FIELDS) {
    const count = (outcome: SetPictureOutcome) =>
      pictures.pictures.filter((picture) => picture.field === field && picture.outcome === outcome)
        .length
    lines.push(
      `  ${SET_PICTURE_LABELS[field]}: ${count('add')} resim eklenir · ${count('has')} zaten resimli · ${count('removed')} resmini DM kaldırmış`,
    )
  }
  for (const field of SET_PICTURE_FIELDS) {
    const without = pictures.without[field]
    lines.push(`${SET_WITHOUT_LABELS[field]}: ${without.length}`)
    for (const set of without) {
      const removed = set.pictures[field].kind === 'removed' ? ' (resmini DM kaldırmış)' : ''
      lines.push(`  ${set.name}${removed}`)
    }
  }
  lines.push(...duplicateLines(pictures.art))
  lines.push(`Hiçbir setle eşleşmeyen dosyalar (atlandı): ${pictures.art.unknown.length}`)
  for (const file of pictures.art.unknown) lines.push(`  ${fileLabel(file)}`)
  return lines
}

/** What a set import wrote, after its report. */
function setsWritten({ added, pictured, changedMeanwhile, recordId }: SetImportWritten): string {
  if (recordId === null && changedMeanwhile.length === 0) {
    return 'Hiçbir şey yazılmadı: dosyadaki her set zaten kayıtlı, verilecek resim de yok.'
  }
  const summary = `${added.length} set eklendi, ${pictured.length} set resmi yüklendi.`
  if (changedMeanwhile.length === 0) return summary
  const names = changedMeanwhile.map(
    ({ set, field }) => `${set.name} (${SET_PICTURE_LABELS[field]})`,
  )
  return `${summary} Bu arada başka yerden resim verilen ${names.length} resme dokunulmadı: ${names.join(', ')}.`
}

/** Turkish messages printed by the admin scripts. Code and comments stay in English. */
export const messages = {
  targetEmulator: 'Hedef: yerel emulatorler (demo-legend-cards)',
  targetProject: (projectId: string) => `Hedef: gerçek Firebase projesi "${projectId}"`,
  emulatorsUnreachable:
    'Emulatorler çalışmıyor: önce `npm run emulators` veya `npm run dev` ile başlat. Hiçbir şey değişmedi.',
  demoProject: (projectId: string) =>
    `"${projectId}" bir demo projesi. Demo projeler sadece emulatorde çalışır: --project olmadan çalıştır.`,
  mixedEnvironment: (variables: string) =>
    `--project verildi ama emulator ayarı da açık (${variables}). Hedefler karışmasın diye durdum; bu değişkenleri kaldırıp tekrar dene.`,
  confirmPrompt: (projectId: string) =>
    `Bu işlem gerçek projede veri değiştirecek. Devam etmek için proje kimliğini yaz (${projectId}): `,
  notConfirmed: 'Onaylanmadı. Hiçbir şey değişmedi.',
  invalidArguments: (detail: string) => `Geçersiz argüman: ${detail}`,
  usageSetRole:
    'Kullanım: npm run set-role -- --email <e-posta> --role dm|player [--project <proje-kimliği>] [--yes]',
  roleUpdated: (name: string, from: string, to: string) =>
    `${name}: rol "${from}" → "${to}" olarak değişti.`,
  roleUnchanged: (name: string, role: string) => `${name} zaten "${role}". Hiçbir şey değişmedi.`,
  noSuchUser: (email: string) => `"${email}" e-postasıyla bir kullanıcı yok. Hiçbir şey değişmedi.`,
  noProfile: (email: string) =>
    `"${email}" hesabının henüz profili yok: adres erişim listesinde olmalı (npm run allow-email) ve kullanıcı önce uygulamaya bir kez giriş yapmalı. Hiçbir şey değişmedi.`,
  invalidRole: (role: string, valid: readonly string[]) =>
    `"${role}" geçerli bir rol değil. Geçerli roller: ${valid.join(', ')}. Hiçbir şey değişmedi.`,
  usageAllowEmail:
    'Kullanım: npm run allow-email -- --email <e-posta> [--project <proje-kimliği>] [--yes]',
  emailAllowed: (email: string) => `"${email}" erişim listesine eklendi.`,
  emailAlreadyAllowed: (email: string) =>
    `"${email}" zaten erişim listesinde. Hiçbir şey değişmedi.`,
  invalidEmail: (email: string) =>
    `"${email}" geçerli bir e-posta adresi değil. Hiçbir şey değişmedi.`,
  usageImportCards:
    'Kullanım: npm run import-cards -- [--legend <csv>] [--cursed <csv>] [--dry-run] [--project <proje-kimliği>] [--yes]\n' +
    'Dosya verilmezse data/legend-cards.csv ve data/cursed-cards.csv kullanılır. Yalnızca birini verirsen sadece o deste import edilir.',
  dataFileMissing: (file: string, options: string | null) =>
    `"${file}" bulunamadı. Bu dosya repoda tutulmuyor, yalnızca sahibin makinesinde durur (bkz. data/README.md). ` +
    (options === null
      ? 'Dosyayı data/ klasörüne koyup tekrar çalıştır.'
      : `Dosyayı data/ klasörüne koy ya da başka bir dosyayı ${options} ile ver.`) +
    ' Hiçbir şey değişmedi.',
  fileUnreadable: (file: string, detail: string) =>
    `"${file}" okunamadı: ${detail}. Hiçbir kart değişmedi.`,
  cardFileError,
  cardFileWarning,
  cardFilesInvalid: (count: number) =>
    `Dosyalarda ${count} hata var. Hiçbir kart değişmedi: önce dosyaları düzelt.`,
  dryRunHeader: 'Deneme (--dry-run): hiçbir kart yazılmadı. Gerçek bir import şunu yapardı:',
  deckReport,
  warningsHeader: 'Uyarılar (import yine de yapıldı):',
  dryRunWarningsHeader: "Uyarılar (import'u durdurmaz):",
  cardsWritten: (count: number) =>
    count === 0
      ? 'Hiçbir kart yazılmadı: dosyadaki her kart zaten kayıtlı.'
      : `${count} kart yazıldı.`,
  usageImportTrueWords:
    'Kullanım: npm run import-true-words -- [--file <csv>] [--dry-run] [--project <proje-kimliği>] [--yes]\n' +
    'Dosya verilmezse data/true-words.csv kullanılır.',
  wordFileUnreadable: (file: string, detail: string) =>
    `"${file}" okunamadı: ${detail}. Hiçbir True Word değişmedi.`,
  trueWordFileError,
  trueWordFileInvalid: (count: number) =>
    `Dosyada ${count} hata var. Hiçbir True Word değişmedi: önce dosyayı düzelt.`,
  dryRunWordsHeader:
    'Deneme (--dry-run): hiçbir True Word yazılmadı. Gerçek bir import şunu yapardı:',
  wordReport,
  wordsWritten: (count: number) =>
    count === 0
      ? 'Hiçbir True Word yazılmadı: dosyadaki her True Word zaten kayıtlı.'
      : `${count} True Word yazıldı.`,
  usageBuildArt:
    'Kullanım: npm run build-art -- --source <klasör> [--dry-run]\n' +
    "Klasördeki .7z arşivlerini ve .png dosyalarını okur, onlara dokunmaz; Blessed ve Cursed cardback'lerini, pack görsellerini ve ekranların Cardmaker görsellerini public/art/ klasörüne yazar. Kart ve True Word resimlerini npm run import-pictures, setlerin cardback ve Cardmaker resimlerini npm run import-sets yükler.",
  sevenZipMissing:
    '7-Zip bulunamadı (`7zz` komutu yok). Kurmak için: brew install sevenzip. Hiçbir şey yazılmadı.',
  sourceUnreadable: (folder: string, detail: string) =>
    `"${folder}" klasörü okunamadı: ${detail}. Hiçbir şey yazılmadı.`,
  noSourceFiles: (folder: string) =>
    `"${folder}" klasöründe .7z arşivi ya da .png dosyası yok. Hiçbir şey yazılmadı.`,
  aliasError,
  aliasesInvalid: (count: number) =>
    `Alias tablosunda ${count} hata var. Hiçbir görsel yazılmadı: önce tabloyu düzelt.`,
  extracting: (archive: string) => `${archive} açılıyor…`,
  extractFailed: (archive: string, detail: string) =>
    `"${archive}" açılamadı: ${detail}. Hiçbir görsel yazılmadı.`,
  dryRunArtHeader: 'Deneme (--dry-run): hiçbir görsel yazılmadı. Gerçek bir build şunu yapardı:',
  artReport,
  usageImportPictures:
    'Kullanım: npm run import-pictures -- --source <klasör> [--dry-run] [--project <proje-kimliği>] [--yes] [--bucket <bucket>]\n' +
    "Klasördeki .7z arşivlerinden ve .png dosyalarından kart ve True Word resimlerini, kayıtlı kartlar ve kelimelerle eşleştirip Cloud Storage'a yükler. Resmi olan ya da resmini DM'in kaldırdığı tanımlara dokunmaz.",
  dryRunPicturesHeader:
    'Deneme (--dry-run): hiçbir resim yüklenmedi. Gerçek bir import şunu yapardı:',
  picturesReport,
  picturesProgress: (done: number, total: number) => `Resimler yükleniyor: ${done}/${total}`,
  picturesWritten: (count: number, changedMeanwhile: readonly string[]) =>
    changedMeanwhile.length === 0
      ? `${count} resim yüklendi.`
      : `${count} resim yüklendi. Bu arada başka yerden resim verilen ${changedMeanwhile.length} tanıma dokunulmadı: ${changedMeanwhile.join(', ')}.`,
  picturesFailed: (detail: string) =>
    `Resim yükleme yarıda kaldı: ${detail}. O ana kadar yüklenenler kaldı; aynı komutu yeniden çalıştırınca kalanlar eklenir.`,
  usageImportSets:
    'Kullanım: npm run import-sets -- [--file <csv>] [--source <klasör>] [--dry-run] [--project <proje-kimliği>] [--yes] [--bucket <bucket>]\n' +
    "Dosya verilmezse data/sets.csv kullanılır. Kayıtlı olmayan setleri ekler; kayıtlı bir sete dokunmaz. --source verilirse klasördeki .7z arşivlerinden ve .png dosyalarından setlerin cardback ve Cardmaker resimlerini Cloud Storage'a yükler; resmi olan ya da resmini DM'in kaldırdığı setlere dokunmaz.",
  setFileUnreadable: (file: string, detail: string) =>
    `"${file}" okunamadı: ${detail}. Hiçbir set değişmedi.`,
  setFileError,
  setFileInvalid: (count: number) =>
    `Set dosyasında ${count} hata var. Hiçbir set değişmedi: önce dosyayı düzelt.`,
  dryRunSetsHeader:
    'Deneme (--dry-run): hiçbir set yazılmadı, hiçbir resim yüklenmedi. Gerçek bir import şunu yapardı:',
  setsReport,
  setsProgress: (done: number, total: number) => `Set resimleri yükleniyor: ${done}/${total}`,
  setsWritten,
  setsFailed: (detail: string) =>
    `Set import'u yarıda kaldı: ${detail}. O ana kadar eklenenler kaldı; aynı komutu yeniden çalıştırınca kalanlar eklenir.`,
  artProgress: (done: number, total: number) => `Görseller dönüştürülüyor: ${done}/${total}`,
  artWritten: (count: number, folder: string) => `${count} görsel ve manifest yazıldı: ${folder}`,
  artWriteFailed: (detail: string) =>
    `Görseller yazılamadı: ${detail}. Manifest yazılmadı: uygulama görselsiz (CSS) görünümde kalır.`,
} as const
