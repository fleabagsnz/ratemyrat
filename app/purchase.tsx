import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Palette } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  isPurchaseCancelled,
  purchaseBloodRed,
  restoreBloodRedPurchase,
  syncEntitlementsFromRevenueCat,
} from '@/lib/revenuecat';
import { trackEvent } from '@/lib/analytics';

export default function PurchaseScreen() {
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBloodRed = profile?.entitlements?.blood_red || false;

  const handlePurchase = async () => {
    if (!profile?.id) {
      Alert.alert('Error', 'You must be signed in to purchase.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await trackEvent('purchase_started', { product: 'blood_red' });

      await purchaseBloodRed({
        profileId: profile.id,
        currentEntitlements: profile.entitlements,
      });

      await refreshProfile();
      await trackEvent('purchase_completed', { product: 'blood_red' });

      Alert.alert(
        'Unlocked',
        'Blood red has been added to your drawing palette.'
      );
    } catch (err: any) {
      if (isPurchaseCancelled(err)) {
        return;
      }
      const message = err?.message || 'Could not complete purchase.';
      setError(message);
      Alert.alert('Purchase failed', message);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!profile?.id) {
      Alert.alert('Error', 'You must be signed in to restore purchases.');
      return;
    }

    setRestoring(true);
    setError(null);

    try {
      const { hasBloodRed: restored } = await restoreBloodRedPurchase({
        profileId: profile.id,
        currentEntitlements: profile.entitlements,
      });

      if (restored) {
        await refreshProfile();
        Alert.alert('Restored', 'Blood red has been restored to your palette.');
      } else {
        Alert.alert('No purchases found', 'No eligible purchases were found.');
      }
    } catch (err: any) {
      const message = err?.message || 'Could not restore purchases.';
      setError(message);
      Alert.alert('Restore failed', message);
    } finally {
      setRestoring(false);
    }
  };

  const handleSync = async () => {
    if (!profile?.id) return;
    setBusy(true);
    setError(null);
    try {
      await syncEntitlementsFromRevenueCat({
        profileId: profile.id,
        currentEntitlements: profile.entitlements,
      });
      await refreshProfile();
    } catch (err: any) {
      const message = err?.message || 'Could not sync entitlements.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  if (hasBloodRed) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Blood Red Color</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.ownedBadge}>
            <Palette size={48} color="#8B0000" />
            <Text style={styles.ownedTitle}>You own this!</Text>
            <Text style={styles.ownedText}>
              The blood red color is now available in your drawing palette.
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.restoreButton, styles.syncButton]}
              onPress={handleSync}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.restoreButtonText}>Sync with RevenueCat</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Blood Red Color</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.colorPreview}>
          <View style={styles.colorSwatch} />
          <Text style={styles.colorName}>Blood Red</Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.featureText}>
            ✓ Unlock the blood red color for your rat drawings
          </Text>
          <Text style={styles.featureText}>
            ✓ One-time purchase, yours forever
          </Text>
          <Text style={styles.featureText}>
            ✓ Stand out with unique color palette
          </Text>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.price}>£4.99</Text>
          <Text style={styles.priceNote}>One-time purchase</Text>
        </View>

        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.purchaseButtonText}>Purchase</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring || busy}
        >
          {restoring ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  colorPreview: {
    alignItems: 'center',
    marginBottom: 48,
  },
  colorSwatch: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#8B0000',
    marginBottom: 16,
  },
  colorName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  features: {
    gap: 16,
    marginBottom: 48,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 14,
    color: '#999999',
  },
  purchaseButton: {
    backgroundColor: '#8B0000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#999999',
    fontSize: 14,
  },
  ownedBadge: {
    alignItems: 'center',
    gap: 16,
  },
  ownedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ownedText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    color: '#FF5C5C',
    textAlign: 'center',
    marginTop: 16,
  },
  syncButton: {
    marginTop: 8,
  },
});
