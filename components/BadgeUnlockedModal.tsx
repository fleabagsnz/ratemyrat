// components/BadgeUnlockedModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Image,
  TouchableOpacity,
} from 'react-native';
import { BADGE_ASSETS } from '@/lib/badges';

type Props = {
  visible: boolean;
  onClose: () => void;
  name: string;
  description?: string;
  slug: string; // <— we treat slug as string
};

export function BadgeUnlockedModal({
  visible,
  onClose,
  name,
  description,
  slug,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity }]}>
          <View style={styles.sunburstWrapper}>
            <View style={styles.sunburst} />
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Image
                source={BADGE_ASSETS[slug]}
                style={styles.badgeImage}
              />
            </Animated.View>
          </View>

          <Text style={styles.title}>{name}</Text>
          {description ? <Text style={styles.desc}>{description}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Nice</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const SUNBURST_SIZE = 180;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6B4E2E',
  },
  sunburstWrapper: {
    width: SUNBURST_SIZE,
    height: SUNBURST_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sunburst: {
    position: 'absolute',
    width: SUNBURST_SIZE,
    height: SUNBURST_SIZE,
    borderRadius: SUNBURST_SIZE / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
  },
  badgeImage: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  desc: {
    color: '#bbb',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#6B4E2E',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
