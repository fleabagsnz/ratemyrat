import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { X, Palette } from 'lucide-react-native';

export default function PurchaseScreen() {
  const { profile } = useAuth();
  const hasBloodRed = profile?.entitlements?.blood_red || false;

  const handlePurchase = () => {
    Alert.alert(
      'RevenueCat Required',
      'To complete this purchase, you need to export this project and integrate RevenueCat SDK.\n\n' +
        'Steps:\n' +
        '1. Export this Expo project\n' +
        '2. Install RevenueCat SDK: npm install react-native-purchases\n' +
        '3. Configure RevenueCat with your API key\n' +
        '4. Set up the blood_red product in RevenueCat dashboard\n' +
        '5. Implement the purchase flow\n\n' +
        'See: https://www.revenuecat.com/docs/getting-started/installation/expo',
      [{ text: 'OK' }]
    );
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
        >
          <Text style={styles.purchaseButtonText}>Purchase</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
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
});
