export type ShopContent = {
 logo: string; logoAlt: string; announcement: string; bannerTitle: string; bannerText: string;
 footerText: string; instagram: string; etsy: string; pinterest: string; contactEmail: string; phone: string; address: string;
 categories: {id: string; name: string; image: string}[];
 policies: {id: string; title: string; text: string}[];
};
export const defaultContent: ShopContent = {
 logo: '', logoAlt: 'GiftsByArtisans', announcement: 'A little thought. A meaningful gift.',
 bannerTitle: 'For the moments that matter.', bannerText: 'Discover gifts with a personal touch. Find your favorite, then explore the possibilities of thoughtful giving.',
 footerText: 'Made for thoughtful giving.', instagram: '', etsy: '', pinterest: '', contactEmail: '', phone: '', address: '',
 categories: ['Personalized gifts', 'Home & living', 'Jewelry', 'Special occasions'].map((name, i) => ({id: String(i), name, image: `/demo/gift-${i}.svg`})),
 policies: [{id:'ordering',title:'Ordering & personalization',text:'This is a frontend demonstration. Products and prices are examples. Ordering and personalization will be available when a real shop is connected.'}, {id:'delivery',title:'Shipping & delivery',text:'Delivery times and shipping costs depend on the product and destination. Check the seller’s listing before placing an order.'}, {id:'returns',title:'Returns & exchanges',text:'Please check the seller’s return policy before purchasing, particularly for custom and personalized items.'}, {id:'privacy',title:'Your privacy',text:'Demo inquiries are saved only in this browser. They are not sent to a shop or stored on a server. You can remove them by clearing this website’s browser storage.'}]
};
