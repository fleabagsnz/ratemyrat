import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export type BadgeDef = {
  key: string;
  name: string;
  description: string;
  image: any; // require('...png')
};

export const BADGE_DEFS: BadgeDef[] = [
  {
    key: 'baby_first_rat',
    name: "Baby's First Rat!",
    description: 'Submitted your very first rat.',
    image: require('../assets/badges/baby-first-rat.png'),
  },
  // ...other badges
];

export function useBadgeAwards() {
  const [unlockedBadge, setUnlockedBadge] = useState<BadgeDef | null>(null);

  const awardBadgeIfNeeded = async (userId: string, key: string) => {
    const def = BADGE_DEFS.find((b) => b.key === key);
    if (!def) return;

    // Already earned?
    const { data: existing, error: existingError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_key', key)
      .maybeSingle();

    if (existingError) {
      console.error('check badge error', existingError);
      return;
    }

    if (existing) {
      return; // already have it, no popup
    }

    // Insert new badge
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_key: key,
      });

    if (insertError) {
      console.error('insert badge error', insertError);
      return;
    }

    setUnlockedBadge(def);
  };

  const clearUnlockedBadge = () => setUnlockedBadge(null);

  return { unlockedBadge, awardBadgeIfNeeded, clearUnlockedBadge };
}
