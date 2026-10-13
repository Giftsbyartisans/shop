import type { Listing } from "./catalog";
import type { ShopContent } from "./content";

export function resolvePersonalization(item: Listing, content: ShopContent): Listing {
  const mode = item.personalizationMode || (item.personalizationEnabled ? "custom" : "default");
  if (mode === "none") return { ...item, personalizationEnabled: false, personalizationPrice: undefined };
  if (mode === "custom") return { ...item, personalizationEnabled: true };
  const id = mode === "template" ? item.personalizationTemplateId : content.defaultPersonalizationId;
  const template = (content.personalizations ?? []).find(template => template.id === id);
  return { ...item, personalizationEnabled: Boolean(template), personalizationHeading: template?.heading, personalizationText: template?.text, personalizationPrice: template?.price };
}
