import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { X, Flag, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { trackEvent } from '@/lib/analytics';

type Rat = {
  id: string;
  title: string | null;
  image_url: string;
  ratings_count: number;
  ratings_sum: number;
  created_at: string;
  owner_id: string;
};

type EmojiReaction = {
  id: string;
  emoji: string;
  reactor_id: string;
};

const EMOJI_OPTIONS = ['❤️', '😂', '😍', '🔥', '👏', '🎉', '😮', '👍'];

export default function RatDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [rat, setRat] = useState<Rat | null>(null);
  const [reactions, setReactions] = useState<EmojiReaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatDetails();
    trackEvent('rat_viewed_fullscreen', { rat_id: id });

    const channel = supabase
      .channel(`rat:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ratings',
          filter: `rat_id=eq.${id}`,
        },
        () => {
          fetchRatDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchRatDetails = async () => {
    try {
      const { data: ratData, error: ratError } = await supabase
        .from('rats')
        .select('*')
        .eq('id', id)
        .single();

      if (ratError) throw ratError;
      setRat(ratData);

      const { data: reactionsData } = await supabase
        .from('emoji_reactions')
        .select('*')
        .eq('rat_id', id);

      setReactions(reactionsData || []);
    } catch (error) {
      console.error('Error fetching rat details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiReaction = async (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const existingReaction = reactions.find(
      (r) => r.emoji === emoji && r.reactor_id === user?.id
    );

    if (existingReaction) {
      await supabase
        .from('emoji_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      await supabase.from('emoji_reactions').insert({
        rat_id: id as string,
        reactor_id: user?.id,
        emoji,
      });
    }

    fetchRatDetails();
  };

  const handleReport = () => {
    Alert.alert(
      'Report Rat',
      'Why are you reporting this rat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Inappropriate Content',
          onPress: () => submitReport('Inappropriate content'),
        },
        {
          text: 'Spam',
          onPress: () => submitReport('Spam'),
        },
        {
          text: 'Other',
          onPress: () => submitReport('Other'),
        },
      ],
      { cancelable: true }
    );
  };

  const submitReport = async (reason: string) => {
    try {
      await supabase.from('reports').insert({
        rat_id: id as string,
        reporter_id: user?.id,
        reason,
      });
      Alert.alert('Thank you', 'Your report has been submitted.');
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!rat) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Rat not found</Text>
      </View>
    );
  }

  const avgRating = rat.ratings_count > 0 ? rat.ratings_sum / rat.ratings_count : 0;
  const reactionCounts = reactions.reduce(
    (acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
          <Flag size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image
          source={{ uri: rat.image_url }}
          style={styles.ratImage}
          resizeMode="contain"
        />

        {rat.title && <Text style={styles.ratTitle}>{rat.title}</Text>}

        <View style={styles.ratingSection}>
          <View style={styles.ratingRow}>
            <Star size={20} color="#FFD700" fill="#FFD700" />
            <Text style={styles.ratingText}>
              {avgRating.toFixed(1)} ({rat.ratings_count} ratings)
            </Text>
          </View>
        </View>

        <View style={styles.emojiSection}>
          <Text style={styles.sectionTitle}>React with Emoji</Text>
          <View style={styles.emojiGrid}>
            {EMOJI_OPTIONS.map((emoji) => {
              const count = reactionCounts[emoji] || 0;
              const hasReacted = reactions.some(
                (r) => r.emoji === emoji && r.reactor_id === user?.id
              );

              return (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiButton,
                    hasReacted && styles.emojiButtonActive,
                  ]}
                  onPress={() => handleEmojiReaction(emoji)}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                  {count > 0 && (
                    <Text style={styles.emojiCount}>{count}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  ratImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    marginBottom: 16,
  },
  ratTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emojiSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emojiButton: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonActive: {
    borderColor: '#6B4E2E',
  },
  emoji: {
    fontSize: 32,
  },
  emojiCount: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
});
