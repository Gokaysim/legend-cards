import type { ConfigProblem } from '@/lib/firebase/config'

export type ConfigErrorScreenProps = {
  problems: ConfigProblem[]
}

const problemLabels: Record<ConfigProblem['kind'], string> = {
  missing: 'eksik',
  invalid: 'geçersiz',
}

/** Shown instead of the app when the Firebase settings are missing or malformed. */
export function ConfigErrorScreen({ problems }: ConfigErrorScreenProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section
        role="alert"
        className="w-full max-w-lg rounded-2xl border border-danger-line bg-pane p-6"
      >
        <h1 className="text-xl font-semibold text-ink">Uygulama başlatılamadı</h1>
        <p className="mt-2 text-ink-muted">Firebase bağlantı ayarları eksik veya hatalı:</p>
        <ul className="mt-4 flex flex-col gap-2">
          {problems.map((problem) => (
            <li
              key={problem.key}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-pane-raised px-3 py-2"
            >
              <code className="text-sm text-ink">{problem.key}</code>
              <span className="text-sm text-danger-ink">{problemLabels[problem.kind]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-muted">
          Ayarları bir <code>.env</code> dosyasına ekleyip (örnek: <code>.env.example</code>)
          uygulamayı yeniden başlat.
        </p>
      </section>
    </main>
  )
}
