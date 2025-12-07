// app/rat/[id].tsx
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
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Rat = {
  id: string;
  image_url: string;
  title: string | null;
  owner_id: string;
  moderation_state?: string;
};

export default function RatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [rat, setRat] = useState<Rat | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchRat(id as string);
  }, [id]);

  const fetchRat = async (ratId: string) => {
    try {
      const { data, error } = await supabase
        .from('rats')
        .select('id, image_url, title, owner_id, moderation_state')
        .eq('id', ratId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        Alert.alert('Error', 'Rat not found');
        router.back();
        return;
      }

      // still allow viewing even if flagged, good for admins
      setRat(data);

      if (user?.id) {
        const { data: ratingData } = await supabase
          .from('rat_ratings')
          .select('rating')
          .eq('rat_id', ratId)
          .eq('rater_id', user.id)
          .maybeSingle();

        if (ratingData) setMyRating(ratingData.rating);
      }

    } catch (err: any) {
      console.error('fetch rat error', err);
      Alert.alert('Error', err.message || 'Could not load rat');
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'You must be signed in to rate rats.');
      return;
    }
    if (!rat) return;
    if (rat.owner_id === user.id) {
      Alert.alert('Nope', 'You cannot rate your own rat.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('rat_ratings').upsert(
        {
          rat_id: rat.id,
          rater_id: user.id,
          rating,
        },
        { onConflict: 'rat_id,rater_id' }
      );
      if (error) throw error;

      setMyRating(rating);

    } catch (err: any) {
      console.error('rating error', err);
      Alert.alert('Error', err.message || 'Could not rate rat');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!user?.id || !rat) {
      Alert.alert('Error', 'You must be signed in to report.');
      return;
    }

    Alert.alert(
      'Report rat',
      'Flag this rat as inappropriate or not a rat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            setReporting(true);
            try {
              // dedupe report
              const { data: existing } = await supabase
                .from('rat_reports')
                .select('id')
                .eq('rat_id', rat.id)
                .eq('reporter_id', user.id)
                .maybeSingle();

              if (!existing) {
                const { error: insertError } = await supabase
                  .from('rat_reports')
                  .insert({
                    rat_id: rat.id,
                    reporter_id: user.id,
                    reason: 'user_flag',
                  });
                if (insertError) throw insertError;
              }

              // mark as flagged
              const { error: updateError } = await supabase
                .from('rats')
                .update({
                  moderation_state: 'flagged',
                  is_flagged: true,
                })
                .eq('id', rat.id);

              if (updateError) throw updateError;

              Alert.alert(
                'Thanks',
                'This rat has been flagged and removed from public queues.'
              );
              router.back();

            } catch (err: any) {
              console.error('report error', err);
              Alert.alert('Error', err.message || 'Could not report rat.');
            } finally {
              setReporting(false);
            }
          },
        },
      ]
    );
  };

  // UI STATES
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!rat) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#fff' }}>Rat not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        {rat.title ? <Text style={styles.title}>{rat.title}</Text> : null}
      </View>

      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: rat.image_url }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <View style={styles.ratingPanel}>
        <Text style={styles.ratingLabel}>Rate this rat</Text>

        <View style={styles.ratingRow}>
          {[1, 2, 3].map((r) => {
            const isActive = myRating === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.ratingButton, isActive && styles.ratingButtonActive]}
                onPress={() => handleRate(r)}
                disabled={submitting}
              >
                <Text style={styles.ratingButtonText}>{r} 🧀</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {rat.owner_id === user?.id && (
          <Text style={styles.infoText}>You can’t rate your own rat.</Text>
        )}

        {myRating && rat.owner_id !== user?.id && (
          <Text style={styles.infoText}>You rated this {myRating} 🧀</Text>
        )}

        <TouchableOpacity
          style={styles.reportButton}
          onPress={handleReport}
          disabled={reporting}
        >
          <Text style={styles.reportButtonText}>
            {reporting ? 'Reporting…' : 'Report this rat'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 999,
  },
  backButtonText: { color: '#fff', fontWeight: '600' },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    flexShrink: 1,
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  image: { width: '100%', height: '100%' },
  ratingPanel: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: '#000',
  },
  ratingLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: 12, marginVertical: 12 },
  ratingButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ratingButtonActive: { backgroundColor: '#6B4E2E' },
  ratingButtonText: { color: '#fff', fontWeight: '600' },
  infoText: { color: '#888', fontSize: 12, marginTop: 4 },
  reportButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ff5555',
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#ff5555',
    fontWeight: '600',
    fontSize: 14,
  },
});
