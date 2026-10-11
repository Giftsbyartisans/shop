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
