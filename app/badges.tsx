// app/badges.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type BadgeRow = {
  earned_at: string;
  badges: {
    id: string;
    slug: string;
    name: string;
    description: string;
    image_key: string | null;
  };
};

type BadgeViewModel = {
  id: string;
  slug: string;
  name: string;
  description: string;
  earnedAt: string;
  imageKey: string | null;
};

// map image_key -> PNG require
const BADGE_IMAGES: Record<string, any> = {
  'baby-first-rat': require('../assets/badges/baby-first-rat.png'),
  'rat-arse': require('../assets/badges/rat-arse.png'),
  'you-rated-my-rat': require('../assets/badges/you-rated-my-rat.png'),
  'rat-fever': require('../assets/badges/rat-fever.png'),
  // add more here as you create them
};

export default function BadgesScreen() {
  const { profile } = useAuth();
  const [badges, setBadges] = useState<BadgeViewModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_badges')
          .select(
            `
            earned_at,
            badges:badge_id (
              id,
              slug,
              name,
              description,
              image_key
            )
          `
          )
          .eq('user_id', profile.id)
          .order('earned_at', { ascending: false });

        if (error) {
          console.error('load badges error', error);
          return;
        }

        const mapped: BadgeViewModel[] =
          (data as BadgeRow[] | null)?.map((row) => ({
            id: row.badges.id,
            slug: row.badges.slug,
            name: row.badges.name,
            description: row.badges.description,
            earnedAt: row.earned_at,
            imageKey: row.badges.image_key,
          })) ?? [];

        setBadges(mapped);
      } catch (err) {
        console.error('load badges error', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profile?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to rats</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Badges</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {badges.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No badges yet. Draw and rate more rats.
            </Text>
          </View>
        ) : (
          badges.map((badge) => {
            const imgSource =
              badge.imageKey && BADGE_IMAGES[badge.imageKey];

            return (
              <View key={badge.id} style={styles.badgeCard}>
                {imgSource && (
                  <Image source={imgSource} style={styles.badgeImage} />
                )}
                <View style={styles.badgeTextWrap}>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDescription}>
                    {badge.description}
                  </Text>
                  <Text style={styles.badgeDate}>
                    Earned {new Date(badge.earnedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    gap: 8,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 999,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  badgeImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  badgeTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#BBBBBB',
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 12,
    color: '#777777',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777777',
    fontSize: 14,
  },
});
