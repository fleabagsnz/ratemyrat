// lib/badges.ts
export type BadgeSlug =
  | 'babys-first-rat'
  | 'rat-arse'
  | 'you-rated-my-rat'
  | 'rat-fever'
  | 'ratatattat'
  | 'rat-trap'
  | 'fancy-rat'
  | 'rat-pack'
  | 'tunnel-vision'
  | 'rat-royalty'
  | 'sewer-star'
  | 'cheddar-chaser'
  | 'ratception';

export const BADGE_ASSETS: Record<BadgeSlug, any> = {
  'babys-first-rat': require('../assets/badges/baby-first-rat.png'),
  'rat-arse': require('../assets/badges/rat-arse.png'),
  'you-rated-my-rat': require('../assets/badges/you-rated-my-rat.png'),
  'rat-fever': require('../assets/badges/rat-fever.png'),
  'ratatattat': require('../assets/badges/ratatattat.png'),
  'rat-trap': require('../assets/badges/rat-trap.png'),
  'fancy-rat': require('../assets/badges/fancy-rat.png'),
  'rat-pack': require('../assets/badges/rat-pack.png'),
  'tunnel-vision': require('../assets/badges/tunnel-vision.png'),
  'rat-royalty': require('../assets/badges/rat-royalty.png'),
  'sewer-star': require('../assets/badges/sewer-star.png'),
  'cheddar-chaser': require('../assets/badges/cheddar-chaser.png'),
  'ratception': require('../assets/badges/ratception.png'),
};
