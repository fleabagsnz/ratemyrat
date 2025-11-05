import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Award, Flame, ShoppingBag, Shield, LogOut } from 'lucide-react-native';

export default function SettingsScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(profile?.push_opt_in ?? true);

  useEffect(() => {
    setPushEnabled(profile?.push_opt_in ?? true);
  }, [profile]);

  const handlePushToggle = async (value: boolean) => {
    setPushEnabled(value);
    try {
      await supabase
        .from('profiles')
        .update({ push_opt_in: value })
        .eq('id', profile?.id);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating push settings:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  const hasBloodRed = profile?.entitlements?.blood_red || false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <Text style={styles.username}>@{profile?.username}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Flame size={20} color="#FF6B35" />
              <Text style={styles.statLabel}>Current Streak</Text>
              <Text style={styles.statValue}>{profile?.streak_current || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Flame size={20} color="#FFD700" />
              <Text style={styles.statLabel}>Best Streak</Text>
              <Text style={styles.statValue}>{profile?.streak_best || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Award size={20} color="#FFFFFF" />
              <Text style={styles.statLabel}>Rats Submitted</Text>
              <Text style={styles.statValue}>
                {profile?.stats?.rats_submitted || 0}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Award size={20} color="#FFFFFF" />
              <Text style={styles.statLabel}>Ratings Given</Text>
              <Text style={styles.statValue}>
                {profile?.stats?.ratings_given || 0}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/badges')}
          >
            <View style={styles.menuItem}>
              <Award size={20} color="#FFFFFF" />
              <Text style={styles.menuItemText}>View My Badges</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In-App Purchase</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/purchase')}
          >
            <View style={styles.menuItem}>
              <ShoppingBag size={20} color="#8B0000" />
              <Text style={styles.menuItemText}>
                Blood Red Color {hasBloodRed ? '(Owned)' : ''}
              </Text>
              {!hasBloodRed && <Text style={styles.price}>£4.99</Text>}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch
                value={pushEnabled}
                onValueChange={handlePushToggle}
                trackColor={{ false: '#333333', true: '#6B4E2E' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {profile?.is_admin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/admin')}
            >
              <View style={styles.menuItem}>
                <Shield size={20} color="#FF3B30" />
                <Text style={styles.menuItemText}>Admin Dashboard</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  statLabel: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  menuItemArrow: {
    fontSize: 24,
    color: '#666666',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B4E2E',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 8,
    marginTop: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
