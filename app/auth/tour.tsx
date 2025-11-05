import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Palette, Star, Award } from 'lucide-react-native';

export default function TourScreen() {
  const handleComplete = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Rate My Rat!</Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Palette color="#FFFFFF" size={32} />
            <Text style={styles.featureTitle}>Draw Daily</Text>
            <Text style={styles.featureText}>
              Create one rat drawing per day with our canvas tools
            </Text>
          </View>

          <View style={styles.feature}>
            <Star color="#FFFFFF" size={32} />
            <Text style={styles.featureTitle}>Rate Rats</Text>
            <Text style={styles.featureText}>
              Rate other users' rats on a 1-3 scale
            </Text>
          </View>

          <View style={styles.feature}>
            <Award color="#FFFFFF" size={32} />
            <Text style={styles.featureTitle}>Earn Badges</Text>
            <Text style={styles.featureText}>
              Build streaks and unlock achievements
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleComplete}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 48,
    textAlign: 'center',
  },
  features: {
    gap: 40,
    marginBottom: 48,
  },
  feature: {
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#6B4E2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
