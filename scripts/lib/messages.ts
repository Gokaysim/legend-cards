import type { CardFileError, CardFileWarning, Deck, LimitedField } from './cardRows.ts'
import type { CardOutcome, DeckPlan } from './importCards.ts'

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
  added: { done: 'eklendi', planned: 'eklenecek' },
  updated: { done: 'güncellendi', planned: 'güncellenecek' },
  unchanged: { done: 'değişmedi', planned: 'değişmeyecek' },
  retired: { done: 'arşivlendi', planned: 'arşivlenecek' },
  restored: { done: 'geri geldi', planned: 'geri gelecek' },
}

/** Names are listed for these outcomes when there are only a few of them. */
const NAMED_OUTCOMES: readonly CardOutcome[] = ['updated', 'retired', 'restored']
export const MAX_LISTED_NAMES = 25

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
      return `${file}, satır ${error.row} (${error.name}): Blessed kartın rarity'si "—" ya da boş olmalı, "${error.rarity}" yazıyor.`
    case 'duplicate':
      return `${file}, satır ${error.rows[0]} ve ${error.rows[1]}: "${error.name}" adı iki kez var.`
  }
}

function cardFileWarning(file: string, warning: CardFileWarning): string {
  switch (warning.kind) {
    case 'skipped-without-set':
      return `${file}, satır ${warning.row}: "${warning.name}" atlandı, seti yok.`
    case 'unknown-set':
      return `${file}: "${warning.setCode}" set kodunun resmi adı bilinmiyor (${warning.count} kart). Uygulama kodu olduğu gibi gösterir.`
    case 'unknown-mechanic-pack':
      return `${file}: "${warning.mechanicPack}" bilinen 8 mechanic pack'ten biri değil (${warning.count} kart).`
  }
}

function deckReport({ deck, counts, cards }: DeckPlan, dryRun: boolean): string[] {
  const tense = dryRun ? 'planned' : 'done'
  const summary = (Object.keys(OUTCOME_LABELS) as CardOutcome[])
    .map((outcome) => `${counts[outcome]} ${OUTCOME_LABELS[outcome][tense]}`)
    .join(', ')
  const lines = [`${DECK_LABELS[deck]}: ${summary}.`]
  for (const outcome of NAMED_OUTCOMES) {
    const listed = cards.filter((card) => card.outcome === outcome).map((card) => card.name)
    if (listed.length > 0 && listed.length <= MAX_LISTED_NAMES) {
      lines.push(`  ${OUTCOME_LABELS[outcome][tense]}: ${listed.join(', ')}`)
    }
  }
  return lines
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
    `"${email}" hesabının henüz profili yok: kullanıcı önce uygulamaya bir kez giriş yapmalı. Hiçbir şey değişmedi.`,
  invalidRole: (role: string, valid: readonly string[]) =>
    `"${role}" geçerli bir rol değil. Geçerli roller: ${valid.join(', ')}. Hiçbir şey değişmedi.`,
  usageImportCards:
    'Kullanım: npm run import-cards -- [--legend <csv>] [--cursed <csv>] [--dry-run] [--project <proje-kimliği>] [--yes]\n' +
    'Dosya verilmezse data/legend-cards.csv ve data/cursed-cards.csv kullanılır. Yalnızca birini verirsen sadece o deste import edilir.',
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
    count === 0 ? 'Hiçbir kart yazılmadı: her şey zaten güncel.' : `${count} kart yazıldı.`,
} as const
