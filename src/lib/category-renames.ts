import type { ShopContent } from "./content";

export function categoryRenames(previous: ShopContent["categories"], next: ShopContent["categories"]) {
  const names = new Map(next.map(category => [category.id, category.name]));
  return new Map(previous.flatMap(category => {
    const name = names.get(category.id);
    return name && name !== category.name ? [[category.name, name] as const] : [];
  }));
}
