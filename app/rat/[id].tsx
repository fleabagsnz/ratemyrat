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
};

export default function RatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [rat, setRat] = useState<Rat | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchRat(id as string);
  }, [id]);

  const fetchRat = async (ratId: string) => {
    try {
      // 1) load the rat itself
      const { data, error } = await supabase
        .from('rats')
        .select('id, image_url, title, owner_id')
        .eq('id', ratId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        Alert.alert('Error', 'Rat not found');
        router.back();
        return;
      }

      setRat(data);

      // 2) load *my* rating if logged in
      if (user?.id) {
        const { data: ratingData, error: ratingError } = await supabase
          .from('rat_ratings')
          .select('rating')
          .eq('rat_id', ratId)
          .eq('rater_id', user.id) // IMPORTANT: rater_id
          .maybeSingle();

        if (!ratingError && ratingData) {
          setMyRating(ratingData.rating);
        }
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

    // don’t allow rating your own rat
    if (rat.owner_id === user.id) {
      Alert.alert('Nope', 'You cannot rate your own rat.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        rat_id: rat.id,
        rater_id: user.id, // <— only rater_id, never user_id
        rating,
      };

      // Helpful log if anything goes wrong
      console.log('rating upsert payload', payload);

      const { error } = await supabase
        .from('rat_ratings')
        .upsert(payload, {
          onConflict: 'rat_id,rater_id',
        });

      if (error) throw error;

      setMyRating(rating);
    } catch (err: any) {
      console.error('rating error', err);
      Alert.alert('Error', err.message || 'Could not rate rat');
    } finally {
      setSubmitting(false);
    }
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to rats</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to rats</Text>
        </TouchableOpacity>
        {rat.title ? <Text style={styles.title}>{rat.title}</Text> : null}
      </View>

      {/* image */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: rat.image_url }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* rating bar */}
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
                <Text
                  style={[
                    styles.ratingButtonText,
                    isActive && styles.ratingButtonTextActive,
                  ]}
                >
                  {r} 🐀
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {rat.owner_id === user?.id ? (
          <Text style={styles.infoText}>You can’t rate your own rat.</Text>
        ) : myRating ? (
          <Text style={styles.infoText}>You rated this rat: {myRating} 🐀</Text>
        ) : null}
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
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
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
  image: {
    width: '100%',
    height: '100%',
  },
  ratingPanel: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: '#000',
  },
  ratingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
  ratingButtonActive: {
    backgroundColor: '#6B4E2E',
  },
  ratingButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  ratingButtonTextActive: {
    color: '#fff',
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
});
