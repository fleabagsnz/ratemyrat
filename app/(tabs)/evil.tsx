import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Rat = {
  id: string;
  title: string | null;
  image_url: string;
  created_at: string;
  moderation_state?: string | null;
  is_flagged?: boolean | null;
  flagged?: boolean | null;
  owner_id?: string;
  rat_ratings?: { rating: number; rater_id: string }[];
  avgRating?: number;
  ratingsCount?: number;
  myRating?: number | null;
};

const WINDOW_WIDTH = Dimensions.get('window').width;
const COLUMN_WIDTH = (WINDOW_WIDTH - 48) / 2;

export default function EvilScreen() {
  const { profile, user } = useAuth();
  const [rats, setRats] = useState<Rat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRatId, setExpandedRatId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortByCheese = (a: Rat, b: Rat) => {
    const aAvg = a.avgRating ?? 0;
    const bAvg = b.avgRating ?? 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const fetchFlaggedRats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rats')
        .select(`
          id,
          title,
          image_url,
          created_at,
          moderation_state,
          is_flagged,
          flagged,
          owner_id,
          rat_ratings(rating, rater_id)
        `)
        .or('moderation_state.eq.flagged,moderation_state.eq.evil,is_flagged.eq.true,flagged.eq.true')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const cleaned = ((data as Rat[]) || []).filter((r) => {
        const isFlagged =
          (r.moderation_state ?? 'flagged') === 'flagged' ||
          r.is_flagged ||
          r.flagged;
        return isFlagged;
      });

      const withRatings = cleaned.map((r) => {
        const ratings = r.rat_ratings ?? [];
        const ratingsCount = ratings.length;
        const avgRating =
          ratingsCount > 0
            ? ratings.reduce((sum, row) => sum + (row.rating ?? 0), 0) /
              ratingsCount
            : 0;
        const myRating =
          user?.id && ratings.length > 0
            ? ratings.find((row) => row.rater_id === user.id)?.rating ?? null
            : null;

        return {
          ...r,
          ratingsCount,
          avgRating,
          myRating,
        };
      });

      setRats(withRatings.sort(sortByCheese));
    } catch (err) {
      console.error('Error fetching evil rats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // If somehow navigated here without permission, bounce back
    if (profile && !profile.is_evil) {
      router.replace('/(tabs)');
      return;
    }

    fetchFlaggedRats();
  }, [profile?.is_evil, user?.id]);

  const toggleExpand = (ratId: string) => {
    setExpandedRatId((prev) => (prev === ratId ? null : ratId));
  };

  const handleDelete = async (rat: Rat) => {
    if (!profile?.is_admin) return;
    Alert.alert(
      'Delete rat?',
      'This will permanently remove the rat. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(rat.id);
            try {
              const { error } = await supabase
                .from('rats')
                .delete()
                .eq('id', rat.id);
              if (error) throw error;

              setRats((prev) => prev.filter((r) => r.id !== rat.id));
              if (expandedRatId === rat.id) {
                setExpandedRatId(null);
              }
            } catch (err: any) {
              console.error('Error deleting rat:', err);
              Alert.alert('Error', err.message || 'Could not delete rat.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleRate = async (rat: Rat, rating: number) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'You must be signed in to rate rats.');
      return;
    }

    if (rat.owner_id && rat.owner_id === user.id) {
      Alert.alert('Not allowed', 'You cannot rate your own rat.');
      return;
    }

    setSubmittingId(rat.id);
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

      setRats((prev) => {
        const updated = prev.map((r) => {
          if (r.id !== rat.id) return r;
          const ratingsCount = r.ratingsCount ?? 0;
          const prevRating = r.myRating ?? null;
          const prevTotal = (r.avgRating ?? 0) * ratingsCount;
          const totalWithoutPrev = prevRating ? prevTotal - prevRating : prevTotal;
          const newCount = prevRating ? ratingsCount : ratingsCount + 1;
          const newAvg = newCount > 0 ? (totalWithoutPrev + rating) / newCount : 0;

          return {
            ...r,
            myRating: rating,
            ratingsCount: newCount,
            avgRating: newAvg,
          };
        });

        return [...updated].sort(sortByCheese);
      });
    } catch (err: any) {
      console.error('Error rating rat:', err);
      Alert.alert('Error', err.message || 'Could not rate rat.');
    } finally {
      setSubmittingId(null);
    }
  };

  const renderRat = ({ item, index }: { item: Rat; index: number }) => {
    const isExpanded = expandedRatId === item.id;
    const avgRating = item.avgRating ?? 0;
    const ratingsCount = item.ratingsCount ?? 0;
    const myRating = item.myRating ?? null;
    const canModerate = !!profile?.is_admin;

    return (
      <TouchableOpacity
        style={[
          styles.ratCard,
          { marginLeft: index % 2 === 0 ? 0 : 8 },
        ]}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.ratImage}
          resizeMode="cover"
        />
        <View style={styles.ratInfo}>
          <View style={styles.topRow}>
            <Text style={styles.skullBadge}>☠️</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.cheeseIcon}>🧀</Text>
              <Text style={styles.ratingText}>
                {avgRating.toFixed(2)} ({ratingsCount})
              </Text>
            </View>
          </View>

          {item.title ? (
            <Text style={styles.ratTitle} numberOfLines={1}>
              {item.title}
            </Text>
          ) : null}

          {isExpanded ? (
            <View style={styles.expandArea}>
              <Text style={styles.expandLabel}>Rate with cheese</Text>
              <View style={styles.ratingButtonsRow}>
                {[1, 2, 3].map((rating) => {
                  const isActive = myRating === rating;
                  return (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingButton,
                        isActive && styles.ratingButtonActive,
                      ]}
                      onPress={() => handleRate(item, rating)}
                      disabled={submittingId === item.id}
                    >
                      <Text style={styles.ratingButtonText}>
                        {rating} 🧀
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {myRating ? (
                <Text style={styles.infoText}>
                  You rated this {myRating} 🧀
                </Text>
              ) : null}
              {canModerate ? (
                <TouchableOpacity
                  style={[
                    styles.detailButton,
                    styles.deleteButton,
                    deletingId === item.id && { opacity: 0.6 },
                  ]}
                  onPress={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                >
                  <Text style={styles.deleteButtonText}>
                    {deletingId === item.id ? 'Deleting…' : 'Delete rat'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.detailButton}
                onPress={() => router.push(`/rat/${item.id}`)}
              >
                <Text style={styles.detailButtonText}>Open rat</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Evil</Text>
        <Text style={styles.headerSubtitle}>Stay in the sewer where you belong</Text>
      </View>

      <FlatList
        data={rats}
        renderItem={renderRat}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFlaggedRats(true)}
            tintColor="#FFFFFF"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No evil rats right now.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    color: '#888888',
    marginTop: 4,
    fontSize: 14,
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  ratCard: {
    width: COLUMN_WIDTH,
    marginBottom: 16,
    backgroundColor: '#0F0F0F',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222222',
  },
  ratImage: {
    width: '100%',
    height: COLUMN_WIDTH,
    backgroundColor: '#111',
  },
  ratInfo: {
    padding: 10,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skullBadge: {
    backgroundColor: '#1C1C1C',
    color: '#FF6666',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: '800',
    fontSize: 14,
  },
  ratTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cheeseIcon: {
    fontSize: 14,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  expandArea: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#222222',
    paddingTop: 10,
    gap: 8,
  },
  expandLabel: {
    color: '#BBBBBB',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#151515',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  ratingButtonActive: {
    backgroundColor: '#6B4E2E',
    borderColor: '#8A5E33',
  },
  ratingButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoText: {
    color: '#888',
    fontSize: 12,
  },
  detailButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#0F0F0F',
  },
  deleteButton: {
    borderColor: '#FF4D4F',
    backgroundColor: '#1A0B0B',
    marginTop: 4,
  },
  detailButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
});
