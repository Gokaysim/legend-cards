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
} as const
