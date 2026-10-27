import { randomUUID } from 'expo-crypto';

/** Stable RFC 4122 v4 identifier for every stored record. */
export function createId(): string {
  return randomUUID();
}
