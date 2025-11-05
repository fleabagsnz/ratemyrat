import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { X, Award } from 'lucide-react-native';

type Badge = {
  key: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at?: string;
};

export default function BadgesScreen() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const { data: allBadges } = await supabase
        .from('badges')
        .select('key, name, description, icon');

      const { data: earnedBadges } = await supabase
        .from('profile_badges')
        .select('badge_key, earned_at')
        .eq('profile_id', user?.id);

      const earnedSet = new Set(earnedBadges?.map((b) => b.badge_key) || []);
      const earnedMap = new Map(
        earnedBadges?.map((b) => [b.badge_key, b.earned_at]) || []
      );

      const combinedBadges =
        allBadges?.map((badge) => ({
          ...badge,
          earned: earnedSet.has(badge.key),
          earned_at: earnedMap.get(badge.key),
        })) || [];

      combinedBadges.sort((a, b) => {
        if (a.earned && !b.earned) return -1;
        if (!a.earned && b.earned) return 1;
        return 0;
      });

      setBadges(combinedBadges);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconForBadge = (iconName: string) => {
    switch (iconName) {
      case 'flame':
        return '🔥';
      case 'star':
        return '⭐';
      case 'trophy':
        return '🏆';
      default:
        return '🏅';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Badges</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {badges.map((badge) => (
          <View
            key={badge.key}
            style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}
          >
            <View style={styles.badgeIcon}>
              <Text style={styles.badgeEmoji}>{getIconForBadge(badge.icon)}</Text>
            </View>
            <View style={styles.badgeInfo}>
              <Text
                style={[styles.badgeName, !badge.earned && styles.textLocked]}
              >
                {badge.name}
              </Text>
              <Text
                style={[
                  styles.badgeDescription,
                  !badge.earned && styles.textLocked,
                ]}
              >
                {badge.description}
              </Text>
              {badge.earned && badge.earned_at && (
                <Text style={styles.earnedDate}>
                  Earned {new Date(badge.earned_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        ))}
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
  closeButton: {
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
  badgeCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  badgeCardLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 4,
  },
  textLocked: {
    color: '#666666',
  },
  earnedDate: {
    fontSize: 12,
    color: '#6B4E2E',
    marginTop: 4,
  },
});
