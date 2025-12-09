// hooks/useBadgeAwards.ts
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BadgeSlug } from '@/lib/badges';
import { useAuth } from '@/contexts/AuthContext';

// Shape of a badge the UI can show
export type AwardedBadge = {
  slug: BadgeSlug;
  name: string;
  description?: string | null;
};

export function useBadgeAwards() {
  const { user, profile } = useAuth();
  const [latestBadge, setLatestBadge] = useState<AwardedBadge | null>(null);

  const drawThresholds = useMemo(
    () => [
      { slug: 'baby-first-rat' as BadgeSlug, threshold: 1 },
      { slug: 'rat-fever' as BadgeSlug, threshold: 5 },
      { slug: 'ratatattat' as BadgeSlug, threshold: 10 },
      { slug: 'rat-trap' as BadgeSlug, threshold: 25 },
      { slug: 'fancy-rat' as BadgeSlug, threshold: 50 },
      { slug: 'rat-pack' as BadgeSlug, threshold: 75 },
      { slug: 'tunnel-vision' as BadgeSlug, threshold: 100 },
      { slug: 'rat-royalty' as BadgeSlug, threshold: 150 },
      { slug: 'sewer-star' as BadgeSlug, threshold: 200 },
      { slug: 'ratception' as BadgeSlug, threshold: 300 },
    ],
    []
  );

  const ratingThresholds = useMemo(
    () => [
      { slug: 'five-rats-rated' as BadgeSlug, threshold: 5 },
      { slug: 'ten-rats-rated' as BadgeSlug, threshold: 10 },
      { slug: 'cheddar-chaser' as BadgeSlug, threshold: 50 },
    ],
    []
  );

  const streakThresholds = useMemo(
    () => [{ slug: 'three-day-streak' as BadgeSlug, threshold: 3 }],
    []
  );

  const insertBadge = async (slug: BadgeSlug) => {
    if (!user?.id) return;

    // Avoid duplicate work if already earned
    const { data: existing } = await supabase
      .from('profile_badges')
      .select('badge_key')
      .eq('profile_id', user.id)
      .eq('badge_key', slug)
      .maybeSingle();

    if (existing) return;

    // Fetch badge definition (uses key; falls back to slug if present in schema)
    let badgeDef: { key: string; name: string; description?: string | null } | null =
      null;

    const { data: byKey, error: byKeyError } = await supabase
      .from('badges')
      .select('key, name, description')
      .eq('key', slug)
      .maybeSingle();

    if (!byKeyError && byKey) {
      badgeDef = byKey;
    } else {
      const { data: bySlug, error: bySlugError } = await supabase
        .from('badges')
        .select('key, name, description')
        .eq('slug', slug)
        .maybeSingle();
      if (!bySlugError && bySlug) badgeDef = bySlug;
    }

    if (!badgeDef) {
      console.warn(`Badge "${slug}" missing in badges table`);
      return;
    }

    const { error: insertError } = await supabase
      .from('profile_badges')
      .insert({
        profile_id: user.id,
        badge_key: badgeDef.key,
      });

    if (insertError) {
      // Swallow duplicates or FK errors quietly
      return;
    }

    setLatestBadge({
      slug,
      name: badgeDef.name ?? slug,
      description: badgeDef.description ?? undefined,
    });
  };

  const checkDrawBadges = async () => {
    if (!user?.id) return;
    const { count, error } = await supabase
      .from('rats')
      .select('id', { head: true, count: 'exact' })
      .eq('owner_id', user.id);
    if (error) return;
    const total = typeof count === 'number' ? count : 0;

    for (const entry of drawThresholds) {
      if (total >= entry.threshold) {
        await insertBadge(entry.slug);
      }
    }
  };

  const checkRatingBadges = async () => {
    if (!user?.id) return;
    const { count, error } = await supabase
      .from('rat_ratings')
      .select('id', { head: true, count: 'exact' })
      .eq('rater_id', user.id);
    if (error) return;
    const total = typeof count === 'number' ? count : 0;
    for (const entry of ratingThresholds) {
      if (total >= entry.threshold) {
        await insertBadge(entry.slug);
      }
    }
  };

  const checkStreakBadges = async () => {
    const streak = profile?.streak_current ?? 0;
    for (const entry of streakThresholds) {
      if (streak >= entry.threshold) {
        await insertBadge(entry.slug);
      }
    }
  };

  const clearLatestBadge = () => setLatestBadge(null);

  return {
    latestBadge,
    awardBadge: insertBadge,
    checkDrawBadges,
    checkRatingBadges,
    checkStreakBadges,
    clearLatestBadge,
  };
}
