import type { AtsAdapter } from "./base";

const adapters = new Map<string, AtsAdapter>();

export function registerAdapter(adapter: AtsAdapter): void {
  if (adapters.has(adapter.id)) {
    throw new Error(`Adapter "${adapter.id}" is already registered`);
  }
  adapters.set(adapter.id, adapter);
}

export function getAdapter(id: string): AtsAdapter | undefined {
  return adapters.get(id);
}

export function listAdapters(): AtsAdapter[] {
  return Array.from(adapters.values());
}
