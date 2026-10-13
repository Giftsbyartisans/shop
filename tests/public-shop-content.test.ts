import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultContent } from '../src/lib/content';
import { parsePublicShopContent } from '../src/lib/public-shop-content';

test('public settings preserve deliberately blank banner text', () => {
  const content = parsePublicShopContent({ ...defaultContent, bannerTitle: '', bannerText: '', banners: [{ id: 'hero', image: 's3:media/banner.webp', alt: 'Our gifts' }] });
  assert.equal(content.bannerTitle, '');
  assert.equal(content.bannerText, '');
  assert.equal(content.banners[0].image, 's3:media/banner.webp');
});
test('invalid public settings cannot be used for server rendering', () => {
  assert.throws(() => parsePublicShopContent(null));
  assert.throws(() => parsePublicShopContent({ ...defaultContent, banners: [{ id: 'hero', image: 'javascript:alert(1)', alt: '' }] }));
});

test('legacy policies upgrade while custom merchant policies remain intact', () => {
  const policies = [
    { id: 'delivery', title: 'Shipping', text: 'Delivery times and shipping costs depend on the product and destination. Check the seller’s listing before placing an order.' },
    { id: 'returns', title: 'Returns', text: 'Custom return policy.' },
  ];
  const content = parsePublicShopContent({ ...defaultContent, policies });
  assert.equal(content.policies[0].text, defaultContent.policies.find(policy => policy.id === 'delivery')!.text);
  assert.equal(content.policies[1].text, 'Custom return policy.');
  assert.equal(content.policies.filter(policy => policy.id === 'cancellation').length, 1);
  assert.equal(policies.length, 2);
  assert.deepEqual(parsePublicShopContent(content), content);
});
