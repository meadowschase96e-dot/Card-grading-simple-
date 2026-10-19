import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { VaultItem } from "@/lib/grade-types";

export const loadVault = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<VaultItem[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ payload: string }>`
      select payload from vault_cards where user_id = ${context.userId} order by saved_at desc
    `;
    return rows
      .map((row) => {
        try {
          return JSON.parse(row.payload) as VaultItem;
        } catch {
          return null;
        }
      })
      .filter((item): item is VaultItem => Boolean(item?.id));
  });

export const storeVault = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { items: VaultItem[] }) => {
    const items = Array.isArray(input?.items) ? input.items.slice(0, 48) : [];
    return { items };
  })
  .handler(async ({ data, context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const userId = context.userId;
    await sql`delete from vault_cards where user_id = ${userId}`;
    for (const item of data.items) {
      const payload = JSON.stringify(item);
      await sql`
        insert into vault_cards (id, user_id, saved_at, payload)
        values (${item.id}, ${userId}, ${item.savedAt}, ${payload})
      `;
    }
    return { ok: true as const };
  });
