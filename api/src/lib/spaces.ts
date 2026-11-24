import { prisma } from "./prisma";
import { DEFAULT_CATEGORIES } from "./defaultCategories";

export function createDefaultCategories(tx: Pick<typeof prisma, "category">, spaceId: string) {
  return tx.category.createMany({
    data: DEFAULT_CATEGORIES.map((c, i) => ({
      spaceId,
      name: c.name,
      type: c.type,
      icon: c.icon,
      isEssential: c.isEssential,
      sortOrder: i,
    })),
  });
}
