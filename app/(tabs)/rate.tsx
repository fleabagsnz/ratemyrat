import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Eye } from 'lucide-react-native';
import { trackEvent } from '@/lib/analytics';

type Rat = {
  id: string;
  title: string | null;
  image_url: string;
  owner_id: string;
};

export default function RateScreen() {
  const { user } = useAuth();
  const [currentRat, setCurrentRat] = useState<Rat | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRandomRat();
  }, []);

  const fetchRandomRat = async () => {
    setLoading(true);

    try {
      const { data: ratedIds } = await supabase
        .from('ratings')
        .select('rat_id')
        .eq('rater_id', user?.id);

      const ratedRatIds = ratedIds?.map((r) => r.rat_id) || [];

      let query = supabase
        .from('rats')
        .select('id, title, image_url, owner_id')
        .eq('moderation_state', 'approved')
        .neq('owner_id', user?.id);

      if (ratedRatIds.length > 0) {
        query = query.not('id', 'in', `(${ratedRatIds.join(',')})`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        setCurrentRat(data[randomIndex]);
      } else {
        setCurrentRat(null);
      }
    } catch (error) {
      console.error('Error fetching rat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (score: number) => {
    if (!currentRat || submitting) return;

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase.from('ratings').insert({
        rat_id: currentRat.id,
        rater_id: user?.id,
        score,
      });

      if (error) throw error;

      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/on-rating-insert`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rat_id: currentRat.id }),
      });

      const apiUrl2 = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/award-badges`;
      await fetch(apiUrl2, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile_id: user?.id,
          event_type: 'rating_given',
        }),
      });

      await trackEvent('rating_given', { rat_id: currentRat.id, score });

      fetchRandomRat();
    } catch (error: any) {
      console.error('Error submitting rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewFullscreen = () => {
    if (currentRat) {
      router.push(`/rat/${currentRat.id}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!currentRat) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyText}>
            You've rated all available rats. Check back later for more.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rate This Rat</Text>
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={handleViewFullscreen}
        >
          <Eye size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.ratContainer}>
        <Image
          source={{ uri: currentRat.image_url }}
          style={styles.ratImage}
          resizeMode="contain"
        />
        {currentRat.title && (
          <Text style={styles.ratTitle}>{currentRat.title}</Text>
        )}
      </View>

      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>How would you rate this rat?</Text>
        <View style={styles.ratingButtons}>
          {[1, 2, 3].map((score) => (
            <TouchableOpacity
              key={score}
              style={styles.ratingButton}
              onPress={() => handleRate(score)}
              disabled={submitting}
            >
              <Text style={styles.ratingButtonNumber}>{score}</Text>
              <Text style={styles.ratingButtonLabel}>
                {score === 1 ? 'Meh' : score === 2 ? 'Good' : 'Great'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fullscreenButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  ratImage: {
    width: '100%',
    maxWidth: 400,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
  },
  ratTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  ratingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  ratingLabel: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 16,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333333',
  },
  ratingButtonNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ratingButtonLabel: {
    fontSize: 14,
    color: '#999999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
  },
});
