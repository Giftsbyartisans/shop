import { defaultContent, validateContent, type ShopContent } from './content';

export const PUBLIC_SETTINGS_PATH = 'media/website-settings.json';
export function parsePublicShopContent(value: unknown): ShopContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid website settings');
  const content = { ...structuredClone(defaultContent), ...value } as ShopContent;
  validateContent(content);
  return content;
}
