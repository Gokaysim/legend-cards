import { FieldValue, type Firestore } from 'firebase-admin/firestore'

import type { CustomEffectType, ParsedVariant, VariantCost } from './customEffectRows.ts'

/**
 * Where the custom effect texts live (design D2 of add-custom-card-draft). Keep in step with
 * `src/features/custom-draft/effectsSchema.ts` and `firestore.rules`.
 */
export const CUSTOM_EFFECTS_COLLECTION = 'customEffects'
export const CUSTOM_EFFECTS_DOC = 'main'
export const CUSTOM_EFFECTS_PATH = `${CUSTOM_EFFECTS_COLLECTION}/${CUSTOM_EFFECTS_DOC}`

/** What an import does to one variant: adds it, replaces its stored text, or leaves the same text. */
export type VariantOutcome = 'added' | 'changed' | 'unchanged'

export type PlannedVariant = {
  type: CustomEffectType
  cost: VariantCost
  text: string
  outcome: VariantOutcome
}

export type EffectPlan = {
  variants: PlannedVariant[]
  counts: Record<VariantOutcome, number>
  /**
   * Stored Effects or Cursed texts that change: a Custom Card's cost table is in the code (design D5), so the report
   * reminds that a changed text may need a code change.
   */
  costTypesChanged: CustomEffectType[]
}

/** The stored texts, unvalidated: `{ <Type>: { '1'?: text, ... } }`, or `{}` before the first import. */
export type StoredVariants = Record<string, Record<string, unknown> | undefined>

/** Decides what an import does to each variant. Pure: the caller reads the stored texts and applies the plan. */
export function planEffectImport(
  stored: StoredVariants,
  variants: readonly ParsedVariant[],
): EffectPlan {
  const planned = variants.map(({ type, cost, text }): PlannedVariant => {
    const before = stored[type]?.[`${cost}`]
    const outcome = before === undefined ? 'added' : before === text ? 'unchanged' : 'changed'
    return { type, cost, text, outcome }
  })
  const counts: Record<VariantOutcome, number> = { added: 0, changed: 0, unchanged: 0 }
  for (const variant of planned) counts[variant.outcome] += 1
  const costTypesChanged = [
    ...new Set(
      planned
        .filter(
          (variant) =>
            variant.outcome === 'changed' &&
            (variant.type === 'Effects' || variant.type === 'Cursed'),
        )
        .map((variant) => variant.type),
    ),
  ]
  return { variants: planned, counts, costTypesChanged }
}

/** The stored texts. */
export async function readStoredVariants(db: Firestore): Promise<StoredVariants> {
  const snapshot = await db.doc(CUSTOM_EFFECTS_PATH).get()
  const variants: unknown = snapshot.data()?.variants
  return typeof variants === 'object' && variants !== null ? (variants as StoredVariants) : {}
}

/**
 * Writes the variants into `customEffects/main` with a merge (design D7): a variant the file has replaces the stored
 * text, and a variant it lacks keeps its old one. Finished Custom Cards keep their own texts and are never touched.
 * Returns the number of variants written.
 */
export async function applyEffectPlan(db: Firestore, plan: EffectPlan): Promise<number> {
  const variants: Record<string, Record<string, string>> = {}
  for (const { type, cost, text } of plan.variants) {
    variants[type] = { ...variants[type], [`${cost}`]: text }
  }
  await db
    .doc(CUSTOM_EFFECTS_PATH)
    .set({ variants, importedAt: FieldValue.serverTimestamp() }, { merge: true })
  return plan.variants.length
}

export type EffectImportResult = { plan: EffectPlan; written: number }

/** Runs an import of already checked variants: reads the stored texts, plans, and writes unless a dry run. */
export async function runEffectImport(
  db: Firestore,
  variants: readonly ParsedVariant[],
  { dryRun }: { dryRun: boolean },
): Promise<EffectImportResult> {
  const plan = planEffectImport(await readStoredVariants(db), variants)
  const written = dryRun ? 0 : await applyEffectPlan(db, plan)
  return { plan, written }
}
