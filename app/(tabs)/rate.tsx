// app/(tabs)/rate.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useBadgeAwards } from '@/hooks/useBadgeAwards';
import { BadgeUnlockedModal } from '@/components/BadgeUnlockedModal';

type Rat = {
  id: string;
  image_url: string;
  title: string | null;
  owner_id: string;
  moderation_state?: string | null;
  is_flagged?: boolean | null;
  flagged?: boolean | null;
};

export default function RateScreen() {
  const { user } = useAuth();
  const { latestBadge, clearLatestBadge, checkRatingBadges } = useBadgeAwards();

  const [currentRat, setCurrentRat] = useState<Rat | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [noMoreRats, setNoMoreRats] = useState(false);

  useEffect(() => {
    loadNextRat();
  }, []);

  // Load next eligible rat
  const loadNextRat = async () => {
    if (!user?.id) {
      setLoading(false);
      Alert.alert('Sign in required', 'You must be signed in to rate rats.');
      return;
    }

    setLoading(true);
    setNoMoreRats(false);

    try {
      // Which rats has this user rated already?
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('rat_ratings')
        .select('rat_id')
        .eq('rater_id', user.id);

      if (ratingsError) throw ratingsError;
      const ratedIds = new Set<string>((ratingsData || []).map((r: any) => r.rat_id));

      // Fetch only approved, not flagged, not owned by user
      const { data: ratsData, error: ratsError } = await supabase
        .from('rats')
        .select('id, image_url, title, owner_id, moderation_state, is_flagged, flagged')
        .eq('moderation_state', 'approved')
        .not('is_flagged', 'is', true)
        .not('flagged', 'is', true)
        .not('moderation_state', 'eq', 'flagged')
        .not('moderation_state', 'eq', 'evil')
        .neq('owner_id', user.id);

      if (ratsError) throw ratsError;

      const candidates = (ratsData || []).filter((r: Rat) => {
        if (ratedIds.has(r.id)) return false;
        const stateOk = (r.moderation_state ?? 'approved') === 'approved';
        const notFlagged = !r.is_flagged && !r.flagged && r.moderation_state !== 'flagged';
        return stateOk && notFlagged;
      });

      if (candidates.length === 0) {
        setCurrentRat(null);
        setNoMoreRats(true);
        return;
      }

      const randomIndex = Math.floor(Math.random() * candidates.length);
      setCurrentRat(candidates[randomIndex] as Rat);
    } catch (err: any) {
      console.error('loadNextRat error', err);
      Alert.alert('Error', err.message || 'Could not load a rat to rate right now.');
    } finally {
      setLoading(false);
    }
  };

  // Rate
  const handleRate = async (rating: number) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'You must be signed in to rate rats.');
      return;
    }
    if (!currentRat) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('rat_ratings').upsert(
        {
          rat_id: currentRat.id,
          rater_id: user.id,
          rating,
        },
        { onConflict: 'rat_id,rater_id' }
      );

      if (error) throw error;

      await checkRatingBadges();
      await loadNextRat();
    } catch (err: any) {
      console.error('rating error (rate tab)', err);
      Alert.alert('Error', err.message || 'Could not rate rat');
    } finally {
      setSubmitting(false);
    }
  };

  // Report + immediately flag + remove from queue
  const handleReport = () => {
    if (!user?.id || !currentRat) {
      Alert.alert('Sign in required', 'You must be signed in to report rats.');
      return;
    }

    Alert.alert(
      'Report this rat?',
      'Flag this drawing as inappropriate, offensive, or not a rat.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            setReporting(true);
            try {
              // Insert report only if not already reported to avoid RLS update errors
              const { data: existingReport, error: checkError } = await supabase
                .from('rat_reports')
                .select('id')
                .eq('rat_id', currentRat.id)
                .eq('reporter_id', user.id)
                .maybeSingle();
              if (checkError) throw checkError;

              if (!existingReport) {
                const { error: insertError } = await supabase
                  .from('rat_reports')
                  .insert({
                    rat_id: currentRat.id,
                    reporter_id: user.id,
                    reason: 'user_flag',
                  });
                if (insertError) throw insertError;
              }

              // Mark the rat flagged
              const { error: flagError } = await supabase
                .from('rats')
                .update({
                  moderation_state: 'flagged',
                  is_flagged: true,
                  flagged: true,
                  flagged_by: user.id,
                  flagged_reason: 'user_flag',
                })
                .eq('id', currentRat.id);

              if (flagError) throw flagError;

              Alert.alert('Thank you', 'This rat has been flagged for review.');
              await loadNextRat();
            } catch (err: any) {
              console.error('report rat error', err);
              Alert.alert('Error', err.message || 'Could not report this rat.');
            } finally {
              setReporting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        </SafeAreaView>
        <BadgeUnlockedModal
          visible={!!latestBadge}
          onClose={clearLatestBadge}
          name={latestBadge?.name ?? ''}
          description={latestBadge?.description ?? undefined}
          slug={latestBadge?.slug ?? 'baby-first-rat'}
        />
      </>
    );
  }

  if (noMoreRats || !currentRat) {
    return (
      <>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>That's all...rats!</Text>
            <Text style={styles.emptyText}>
              You’ve rated all available approved rats. Come back later.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadNextRat}>
              <Text style={styles.refreshButtonText}>Check again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <BadgeUnlockedModal
          visible={!!latestBadge}
          onClose={clearLatestBadge}
          name={latestBadge?.name ?? ''}
          description={latestBadge?.description ?? undefined}
          slug={latestBadge?.slug ?? 'baby-first-rat'}
        />
      </>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>{currentRat.title || 'Mystery rat'}</Text>

          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: currentRat.image_url }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          <View style={styles.ratingPanel}>
            <Text style={styles.ratingLabel}>How many rats is this rat?</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.ratingButton}
                  onPress={() => handleRate(r)}
                  disabled={submitting || reporting}
                >
                  <Text style={styles.ratingButtonText}>{r} 🧀</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.reportButton}
              onPress={handleReport}
              disabled={reporting || submitting}
            >
              <Text style={styles.reportButtonText}>
                {reporting ? 'Reporting…' : 'Report this rat'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      <BadgeUnlockedModal
        visible={!!latestBadge}
        onClose={clearLatestBadge}
        name={latestBadge?.name ?? ''}
        description={latestBadge?.description ?? undefined}
        slug={latestBadge?.slug ?? 'baby-first-rat'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ratingPanel: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 16,
  },
  ratingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  ratingButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ratingButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  reportButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
  },
  reportButtonText: {
    color: '#ff6666',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
