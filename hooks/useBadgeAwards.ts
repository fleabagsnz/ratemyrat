// hooks/useBadgeAwards.ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BadgeSlug } from '@/lib/badges';

// Shape of a badge the UI can show
export type AwardedBadge = {
  slug: BadgeSlug;
  name: string;
  description?: string | null;
};

export function useBadgeAwards() {
  const [latestBadge, setLatestBadge] = useState<AwardedBadge | null>(null);

  /**
   * Award a badge by slug (e.g. 'baby-first-rat') to a user
   * if they don't already have it.
   */
  const awardBadge = async (userId: string, slug: BadgeSlug) => {
    if (!userId || !slug) return;

    // 1) Find the badge row by slug
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .select('id, name, description, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (badgeError) {
      console.error('awardBadge: error fetching badge by slug', badgeError);
      return;
    }

    if (!badge) {
      console.warn(`awardBadge: no badge found for slug "${slug}"`);
      return;
    }

    // 2) Check if already earned
    const { data: existing, error: existingError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badge.id)
      .maybeSingle();

    if (existingError) {
      console.error('awardBadge: error checking user_badges', existingError);
      return;
    }

    if (existing) {
      // already have it, no popup
      return;
    }

    // 3) Insert new record
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badge.id,
      });

    if (insertError) {
      console.error('awardBadge: error inserting user_badges', insertError);
      return;
    }

    // 4) Show modal
    setLatestBadge({
      slug: badge.slug as BadgeSlug,
      name: badge.name,
      description: badge.description,
    });
  };

  const clearLatestBadge = () => setLatestBadge(null);

  return {
    latestBadge,
    awardBadge,
    clearLatestBadge,
  };
}
