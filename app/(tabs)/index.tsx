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
import { Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Rat = {
  id: string;
  title: string | null;
  image_url: string;
  avg_rating: number | null;
  rating_count: number | null;
  created_at: string;
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
        .select('id, title, image_url, avg_rating, rating_count, created_at')
        .eq('moderation_state', 'approved');

      // order: best rats first, then newest
      query = query
        .order('avg_rating', { ascending: false, nullsFirst: false })
        .order('rating_count', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (view === 'today') {
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        ).toISOString();

        query = query.gte('created_at', startOfDay);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRats(data || []);
    } catch (error) {
      console.error('Error fetching rats:', error);
      setRats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRats();
  }, [view]);

  const renderRat = ({ item, index }: { item: Rat; index: number }) => {
    const avgRating = item.avg_rating ?? 0;
    const ratingCount = item.rating_count ?? 0;

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
            <Star size={14} color="#FFD700" fill="#FFD700" />
            <Text style={styles.ratingText}>
              {avgRating.toFixed(1)} ({ratingCount})
            </Text>
          </View>
          {item.title ? (
            <Text style={styles.ratTitle} numberOfLines={1}>
              {item.title}
            </Text>
          ) : null}
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
