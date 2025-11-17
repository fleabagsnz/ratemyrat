// hooks/useBadgeAwards.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BadgeSlug } from '@/lib/badges';
import { useAuth } from '@/contexts/AuthContext';

export function useBadgeAwards() {
  const { user } = useAuth();
  const [currentBadge, setCurrentBadge] = useState<{
    slug: BadgeSlug;
    name: string;
    description?: string;
  } | null>(null);

  const awardBadge = useCallback(
    async (slug: BadgeSlug) => {
      if (!user?.id) return;

      // fetch badge by slug
      const { data: badge, error: badgeErr } = await supabase
        .from('badges')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (badgeErr || !badge) return;

      // insert user_badges (will fail if already has, so ignore error)
      const { error: insertErr } = await supabase.from('user_badges').insert({
        user_id: user.id,
        badge_id: badge.id,
      });

      // if already earned, don't show modal again
      if (insertErr && !insertErr.message.includes('duplicate')) {
        // some other error - you could log it
        return;
      }

      // show modal
      setCurrentBadge({
        slug,
        name: badge.name,
        description: badge.description ?? '',
      });
    },
    [user]
  );

  const clearBadge = () => setCurrentBadge(null);

  return {
    currentBadge,
    awardBadge,
    clearBadge,
  };
}
