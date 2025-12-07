// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

type RatRatingRow = {
  rating: number;
};

type Rat = {
  id: string;
  title: string | null;
  image_url: string;
  created_at: string;
  rat_ratings: RatRatingRow[];

  // NEW: so we can filter locally as a safety net
  moderation_state?: string | null;
  is_flagged?: boolean | null;
  flagged?: boolean | null;
};

const WINDOW_WIDTH = Dimensions.get('window').width;
const COLUMN_WIDTH = (WINDOW_WIDTH - 48) / 2;

export default function WallScreen() {
  const [view, setView] = useState<'all' | 'today'>('all');
  const [rats, setRats] = useState<Rat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let query = supabase
        .from('rats')
        .select(
          `
          id,
          title,
          image_url,
          created_at,
          moderation_state,
          is_flagged,
          flagged,
          rat_ratings(rating)
        `
        )
        // primary filter: only approved + not flagged
        .eq('moderation_state', 'approved')
        .is('is_flagged', false)
        .is('flagged', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (view === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('created_at', `${today}T00:00:00`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Extra safety: filter on the client too, in case older rows
      // don’t have the booleans populated exactly how we expect.
      const cleaned = ((data as Rat[]) || []).filter((r) => {
        const stateOk = (r.moderation_state ?? 'approved') === 'approved';
        const notFlagged = !r.is_flagged && !r.flagged;
        return stateOk && notFlagged;
      });

      setRats(cleaned);
    } catch (error) {
      console.error('Error fetching rats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const renderRat = ({ item, index }: { item: Rat; index: number }) => {
    const ratings = item.rat_ratings || [];
    const ratingsCount = ratings.length;

    const avgRating =
      ratingsCount > 0
        ? ratings.reduce((sum, row) => sum + (row.rating ?? 0), 0) /
          ratingsCount
        : 0;

    return (
      <TouchableOpacity
        style={[
          styles.ratCard,
          { marginLeft: index % 2 === 0 ? 0 : 8 },
        ]}
        onPress={() => router.push(`/rat/${item.id}`)}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.ratImage}
          resizeMode="cover"
        />
        <View style={styles.ratInfo}>
          <View style={styles.ratingRow}>
            <Text style={styles.cheeseIcon}>🧀</Text>
            <Text style={styles.ratingText}>
              {avgRating.toFixed(2)} ({ratingsCount})
            </Text>
          </View>
          {item.title && (
            <Text style={styles.ratTitle} numberOfLines={1}>
              {item.title}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wall</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, view === 'all' && styles.toggleActive]}
            onPress={() => setView('all')}
          >
            <Text
              style={[
                styles.toggleText,
                view === 'all' && styles.toggleTextActive,
              ]}
            >
              All-Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              view === 'today' && styles.toggleActive,
            ]}
            onPress={() => setView('today')}
          >
            <Text
              style={[
                styles.toggleText,
                view === 'today' && styles.toggleTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
        </View>
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
            onRefresh={() => fetchRats(true)}
            tintColor="#FFFFFF"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {view === 'today'
                  ? 'No rats drawn today yet'
                  : 'No rats to display'}
              </Text>
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
    marginBottom: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: '#6B4E2E',
  },
  toggleText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    padding: 16,
  },
  ratCard: {
    width: COLUMN_WIDTH,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  ratImage: {
    width: '100%',
    height: COLUMN_WIDTH,
    backgroundColor: '#000000',
  },
  ratInfo: {
    padding: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cheeseIcon: {
    fontSize: 14,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ratTitle: {
    color: '#999999',
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
  },
});
