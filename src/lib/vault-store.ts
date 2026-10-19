import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CardListing, GradedCard, ListingChannel, PriceTier, VaultItem } from "@/lib/grade-types";
import { loadVault, storeVault } from "@/lib/vault-sync";
import { uid } from "@/lib/utils";

const MAX_VAULT = 48;

type VaultState = {
  items: VaultItem[];
  slots: (string | null)[];
  saveCard: (input: {
    image: string;
    card: GradedCard;
    model: string;
    slot?: number | null;
    mat?: boolean;
    lane?: "standard" | "deep";
    backImage?: string;
  }) => string;
  replaceImage: (id: string, image: string) => void;
  assignSlot: (slot: number, id: string | null) => void;
  remove: (id: string) => void;
  submitListing: (id: string, channel: ListingChannel, tier: PriceTier) => void;
  clear: () => void;
};

const emptySlots = (): (string | null)[] => Array.from({ length: 9 }, () => null);

let activeUser = "";
let persistWrites = true;
let pushTimer = 0;

function schedulePush() {
  if (!activeUser || !persistWrites || typeof window === "undefined") return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    const items = useVault.getState().items;
    void storeVault({ data: { items } }).catch(() => undefined);
  }, 400);
}

function mergeItems(local: VaultItem[], remote: VaultItem[]): VaultItem[] {
  const byId = new Map<string, VaultItem>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of local) {
    const other = byId.get(item.id);
    if (!other || item.savedAt >= other.savedAt) byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_VAULT);
}

function idbStorage() {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("gms-vault", 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("kv")) req.result.createObjectStore("kv");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  const run = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction("kv", mode);
      const req = fn(tx.objectStore("kv"));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };
  return {
    getItem: async (name: string) => {
      if (typeof indexedDB === "undefined") return null;
      const id = activeUser ? `${name}:${activeUser}` : "";
      if (!id) return null;
      try {
        const value = await run<string | undefined>("readonly", (store) => store.get(id));
        if (value) return value;
      } catch {
        /* Fall through to the old local copy. */
      }
      const legacy = localStorage.getItem(id);
      if (legacy) {
        try {
          await run("readwrite", (store) => store.put(legacy, id));
        } catch {
          /* Keep the legacy copy. */
        }
      }
      return legacy;
    },
    setItem: async (name: string, value: string) => {
      if (typeof indexedDB === "undefined" || !activeUser || !persistWrites) return;
      const id = `${name}:${activeUser}`;
      await run("readwrite", (store) => store.put(value, id));
      try {
        localStorage.setItem(id, value);
      } catch {
        /* Photos can be larger than localStorage. IndexedDB already has them. */
      }
    },
    removeItem: async (name: string) => {
      if (!activeUser) return;
      const id = `${name}:${activeUser}`;
      await run("readwrite", (store) => store.delete(id));
      localStorage.removeItem(id);
    },
  };
}

export const VAULT_AD_KEY = "gms-vault-ad";

export function bindVaultUser(userId: string) {
  if (activeUser === userId) return;
  persistWrites = false;
  activeUser = userId;
  void (async () => {
    await useVault.persist.rehydrate();
    const local = useVault.getState().items;
    let remote: VaultItem[] = [];
    try {
      remote = await loadVault();
    } catch {
      remote = [];
    }
    const items = mergeItems(local, remote);
    const slots = useVault.getState().slots;
    useVault.setState({ items, slots: Array.isArray(slots) && slots.length === 9 ? slots : emptySlots() });
    persistWrites = true;
    if (items.length) schedulePush();
  })();
}

export const useVault = create<VaultState>()(
  persist(
    (set) => ({
      items: [],
      slots: emptySlots(),
      saveCard: ({ image, card, model, mat, lane, backImage }) => {
        const id = uid("card");
        const item: VaultItem = {
          id,
          savedAt: Date.now(),
          image,
          card,
          model,
          mat: mat !== false,
          lane: lane === "deep" ? "deep" : "standard",
          backImage,
        };
        set((state) => {
          const items = [item, ...state.items].slice(0, MAX_VAULT);
          return { items, slots: state.slots };
        });
        return id;
      },
      replaceImage: (id, image) => {
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, image, mat: true } : item)),
        }));
      },
      assignSlot: (slot, id) => {
        if (slot < 0 || slot > 8) return;
        set((state) => {
          const slots = [...state.slots];
          slots[slot] = id;
          return { slots };
        });
      },
      remove: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          slots: state.slots.map((s) => (s === id ? null : s)),
        }));
      },
      submitListing: (id, channel, tier) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;
            const price = item.card.prices?.[tier];
            if (price == null || price <= 0) return item;
            const listing: CardListing = { channel, tier, price, submittedAt: Date.now() };
            return { ...item, listing };
          }),
        }));
      },
      clear: () => set({ items: [], slots: emptySlots() }),
    }),
    {
      name: "gms-vault-v1",
      storage: createJSONStorage(() => idbStorage()),
      partialize: (state) => ({ items: state.items, slots: state.slots }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.slots) || state.slots.length !== 9) {
          state.slots = emptySlots();
        }
      },
    },
  ),
);

useVault.subscribe(() => {
  schedulePush();
});

export function useSlotItems(): (VaultItem | null)[] {
  const slots = useVault((s) => s.slots);
  const items = useVault((s) => s.items);
  const byId = new Map(items.map((item) => [item.id, item]));
  return slots.map((id) => (id ? (byId.get(id) ?? null) : null));
}
