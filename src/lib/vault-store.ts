import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CardListing, GradedCard, ListingChannel, PriceTier, VaultItem } from "@/lib/grade-types";
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

export const VAULT_AD_KEY = "gms-vault-ad";

export function bindVaultUser(userId: string) {
  if (activeUser === userId) return;
  persistWrites = false;
  activeUser = userId;
  useVault.setState({ items: [], slots: emptySlots() });
  persistWrites = true;
  void useVault.persist.rehydrate();
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
      storage: createJSONStorage(() => ({
        getItem: (name) => (activeUser ? localStorage.getItem(`${name}:${activeUser}`) : null),
        setItem: (name, value) => {
          if (activeUser && persistWrites) localStorage.setItem(`${name}:${activeUser}`, value);
        },
        removeItem: (name) => {
          if (activeUser) localStorage.removeItem(`${name}:${activeUser}`);
        },
      })),
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

export function useSlotItems(): (VaultItem | null)[] {
  const slots = useVault((s) => s.slots);
  const items = useVault((s) => s.items);
  const byId = new Map(items.map((item) => [item.id, item]));
  return slots.map((id) => (id ? (byId.get(id) ?? null) : null));
}
