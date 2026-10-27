import { useCallback, useState } from 'react';
import type { z } from 'zod';

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

/**
 * Minimal typed form state: string-keyed values, per-field errors and Zod validation.
 * Errors clear as soon as the user edits the field.
 */
export function useForm<T extends object>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});

  const setField = useCallback(<K extends keyof T & string>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }, []);

  /** Validates the given values against a schema; returns parsed output or null with errors set. */
  const validate = useCallback(
    <S extends z.ZodType>(schema: S, input: unknown = values): z.output<S> | null => {
      const result = schema.safeParse(input);
      if (result.success) return result.data;
      const next: FieldErrors<T> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !(key in next)) {
          next[key as keyof T & string] = issue.message;
        }
      }
      setErrors((current) => ({ ...current, ...next }));
      return null;
    },
    [values],
  );

  return { values, errors, setField, setValues, validate };
}
