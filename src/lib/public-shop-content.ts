import { defaultContent, validateContent, type ShopContent } from './content';

export const PUBLIC_SETTINGS_PATH = 'media/website-settings.json';
export function parsePublicShopContent(value: unknown): ShopContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid website settings');
  const content = { ...structuredClone(defaultContent), ...value } as ShopContent;
  // Remove references to the retired bundled artwork from older saved settings.
  content.categories = content.categories.filter(category => !category.image.startsWith('/demo/'));
  content.banners = content.banners.filter(banner => !banner.image.startsWith('/demo/'));
  if (content.logo.startsWith('/demo/')) content.logo = '';
  if (content.favicon.startsWith('/demo/')) content.favicon = '';
  // Upgrade only the original default wording; retain merchant-authored policies.
  const legacy: Record<string, string> = {
    delivery: 'Delivery times and shipping costs depend on the product and destination. Check the seller’s listing before placing an order.',
    returns: 'Please check the seller’s return policy before purchasing, particularly for custom and personalized items.',
    privacy: 'Inquiry details are stored securely in our backend and are available to authorized shop administrators so they can respond to your request. Contact us with questions about your information.',
  };
  if (Array.isArray(content.policies)) {
    content.policies = content.policies.map(policy => {
      const replacement = defaultContent.policies.find(item => item.id === policy.id);
      return replacement && policy.text === legacy[policy.id] ? { ...policy, text: replacement.text } : policy;
    });
    if (!content.policies.some(policy => policy.id === 'cancellation')) {
      content.policies.push({ ...defaultContent.policies.find(policy => policy.id === 'cancellation')! });
    }
  }
  validateContent(content);
  return content;
}
