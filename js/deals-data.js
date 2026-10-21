/* Stay Santa Rosa: local offers shown on /deals.
   Add one object per offer. Offers hide automatically after `expires`
   and stay hidden until `starts`. Leave optional fields out if unused.

   {
     id:       'unique-slug',                    // required
     business: 'Business Name',                  // required
     category: 'dining',                         // dining | wine | attractions | shopping
     title:    'Offer headline',                 // required
     value:    '15% off',                        // short badge text
     desc:     'One or two sentences.',
     terms:    'Dine-in only. Not valid with other offers.',
     code:     'STAYSR',                         // promo code (optional)
     url:      'https://example.com/',           // where to redeem (optional)
     image:    'assets/opt/dining-hero-768.webp',// card image (optional)
     address:  '123 4th St, Santa Rosa',         // optional
     starts:   '2026-11-01',                     // optional, YYYY-MM-DD
     expires:  '2026-12-31'                      // optional, YYYY-MM-DD (last valid day)
   }
*/
window.SSR_LOCAL_OFFERS = [
];
