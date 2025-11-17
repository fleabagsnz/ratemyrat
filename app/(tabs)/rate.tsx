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

type Rat = {
  id: string;
  image_url: string;
  title: string | null;
  owner_id: string;
};

export default function RateScreen() {
  const { user } = useAuth();

  const [currentRat, setCurrentRat] = useState<Rat | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [noMoreRats, setNoMoreRats] = useState(false);

  useEffect(() => {
    loadNextRat();
  }, []);

  const loadNextRat = async () => {
    if (!user?.id) {
      setLoading(false);
      Alert.alert('Sign in required', 'You must be signed in to rate rats.');
      return;
    }

    setLoading(true);
    setNoMoreRats(false);

    try {
      // 1) Which rats has this user already rated?
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('rat_ratings')
        .select('rat_id')
        .eq('rater_id', user.id);

      if (ratingsError) throw ratingsError;

      const ratedIds = new Set<string>(
        (ratingsData || []).map((r: any) => r.rat_id)
      );

      // 2) Fetch candidate rats: approved, not owned by this user
      const { data: ratsData, error: ratsError } = await supabase
        .from('rats')
        .select('id, image_url, title, owner_id')
        .eq('moderation_state', 'approved')
        .neq('owner_id', user.id);

      if (ratsError) throw ratsError;

      const candidates = (ratsData || []).filter(
        (r: any) => !ratedIds.has(r.id)
      );

      if (candidates.length === 0) {
        setCurrentRat(null);
        setNoMoreRats(true);
        return;
      }

      const randomIndex = Math.floor(Math.random() * candidates.length);
      setCurrentRat(candidates[randomIndex] as Rat);
    } catch (err: any) {
      console.error('loadNextRat error', err);
      Alert.alert(
        'Error',
        err.message || 'Could not load a rat to rate right now.'
      );
    } finally {
      setLoading(false);
    }
  };

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
          rater_id: user.id, // IMPORTANT: rater_id, not user_id
          rating,
        },
        {
          onConflict: 'rat_id,rater_id',
        }
      );

      if (error) throw error;

      // move on to next rat
      await loadNextRat();
    } catch (err: any) {
      console.error('rating error (rate tab)', err);
      Alert.alert('Error', err.message || 'Could not rate rat');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  if (noMoreRats || !currentRat) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>That's all...rats!</Text>
          <Text style={styles.emptyText}>
            You’ve rated every available rat by other users. Come back later.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadNextRat}>
            <Text style={styles.refreshButtonText}>Check again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {currentRat.title ? (
          <Text style={styles.title}>{currentRat.title}</Text>
        ) : (
          <Text style={styles.title}>Mystery rat</Text>
        )}

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
                disabled={submitting}
              >
                <Text style={styles.ratingButtonText}>{r} 🧀</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
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
 