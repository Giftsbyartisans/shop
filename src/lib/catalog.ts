export type Listing = {id:string; title:string; description:string; image:string; price:number; category:string; published:boolean};
export const demoListings: Listing[] = [
 {id:'personalized-keepsake',title:'Personalized keepsake gift box',category:'Personalized gifts',price:32,image:'/demo/gift-0.svg',description:'A thoughtful little keepsake for a big moment. Add a name or a special message to make it their own.'},
 {id:'ceramic-vase',title:'Handcrafted ceramic vase',category:'Home & living',price:48,image:'/demo/gift-1.svg',description:'Organic curves and a warm, natural finish. A lovely home for fresh stems or a beautiful piece all on its own.'},
 {id:'gold-necklace',title:'Everyday gold pendant necklace',category:'Jewelry',price:29,image:'/demo/gift-2.svg',description:'A delicate pendant inspired by simple, everyday moments. A meaningful gift for someone close to your heart.'},
 {id:'celebration-box',title:'A little celebration gift set',category:'Special occasions',price:45,image:'/demo/gift-3.svg',description:'Celebrate a birthday, a thank-you, or a new beginning with a carefully curated gift set.'},
 {id:'name-keepsake',title:'Custom name keepsake',category:'Personalized gifts',price:24,image:'/demo/gift-0.svg',description:'A personal touch they can treasure. A charming keepsake to mark a special memory.'},
 {id:'bud-vase',title:'Minimal ceramic bud vase',category:'Home & living',price:26,image:'/demo/gift-1.svg',description:'A small handcrafted accent for a bedside table, a favorite shelf, or a thoughtful housewarming gift.'}
].map(item => ({...item,published:true}));
export function loadListings(): Listing[] {try {const saved=localStorage.getItem('gifts-demo-listings');if(saved){const parsed:unknown=JSON.parse(saved);if(Array.isArray(parsed)&&parsed.every(i=>typeof i.id==='string'&&typeof i.title==='string'&&typeof i.price==='number'&&typeof i.category==='string'&&typeof i.description==='string'&&typeof i.image==='string'&&typeof i.published==='boolean'))return parsed;}}catch{}return demoListings;}
export const formatPrice=(price:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(price);
