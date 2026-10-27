import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { z } from 'zod';

import { db } from '@/db/client';
import { preferences } from '@/db/schema';
import { appearance } from '@/domain/enums';

const preferenceSchemas = {
  'onboarding-complete': z.boolean(),
  appearance: z.enum(appearance.values),
  'reminder-hour': z.number().int().min(0).max(23),
  'reminder-minute': z.number().int().min(0).max(59),
} as const;

export type PreferenceKey = keyof typeof preferenceSchemas;
export type PreferenceValue<K extends PreferenceKey> = z.infer<(typeof preferenceSchemas)[K]>;

export const PREFERENCE_DEFAULTS: { [K in PreferenceKey]: PreferenceValue<K> } = {
  'onboarding-complete': false,
  appearance: 'system',
  'reminder-hour': 9,
  'reminder-minute': 0,
};

function parse<K extends PreferenceKey>(key: K, raw: string | undefined): PreferenceValue<K> {
  if (raw === undefined) return PREFERENCE_DEFAULTS[key];
  try {
    const result = preferenceSchemas[key].safeParse(JSON.parse(raw));
    return result.success ? (result.data as PreferenceValue<K>) : PREFERENCE_DEFAULTS[key];
  } catch {
    return PREFERENCE_DEFAULTS[key];
  }
}

export function getPreference<K extends PreferenceKey>(key: K): PreferenceValue<K> {
  const row = db
    .select()
    .from(preferences)
    .all()
    .find((item) => item.key === key);
  return parse(key, row?.value);
}

export function setPreference<K extends PreferenceKey>(key: K, value: PreferenceValue<K>) {
  const serialized = JSON.stringify(preferenceSchemas[key].parse(value));
  db.insert(preferences)
    .values({ key, value: serialized })
    .onConflictDoUpdate({ target: preferences.key, set: { value: serialized } })
    .run();
}

export type Preferences = { [K in PreferenceKey]: PreferenceValue<K> };

/** All preferences, kept live so settings changes apply everywhere immediately. */
export function usePreferences(): Preferences {
  const live = useLiveQuery(db.select().from(preferences));
  // Until the live query delivers, read synchronously so first render isn't using defaults.
  const rows = live.updatedAt === undefined ? db.select().from(preferences).all() : live.data;
  const raw = new Map(rows.map((row) => [row.key, row.value]));
  return {
    'onboarding-complete': parse('onboarding-complete', raw.get('onboarding-complete')),
    appearance: parse('appearance', raw.get('appearance')),
    'reminder-hour': parse('reminder-hour', raw.get('reminder-hour')),
    'reminder-minute': parse('reminder-minute', raw.get('reminder-minute')),
  };
}
