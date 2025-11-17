// app/(tabs)/draw.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useBadgeAwards } from '@/hooks/useBadgeAwards';
import { BadgeUnlockedModal } from '@/components/BadgeUnlockedModal';

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  grey: '#888888',
  brown: '#6B4E2E',
  pink: '#FF9CB5',
  mutedYellow: '#D9C36A',
};

const BRUSH_SIZES = [4, 8, 16];

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = global.atob ? global.atob(base64) : atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function DrawScreen() {
  const { user } = useAuth();
  const canvasRef = useRef<View>(null);

  const [hasDrawnToday, setHasDrawnToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS.white);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [title, setTitle] = useState('');
  const [hasAnyStroke, setHasAnyStroke] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [canvasKey, setCanvasKey] = useState(0); // force remount on clear

  // BADGE HOOK
  const { awardBadge, latestBadge, clearLatestBadge } = useBadgeAwards();

  useEffect(() => {
    checkIfDrawnToday();
  }, []);

  const checkIfDrawnToday = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('rats')
        .select('id')
        .eq('owner_id', user?.id)
        .gte('created_at', `${today}T00:00:00`)
        .maybeSingle();
      setHasDrawnToday(!!data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setHasAnyStroke(false);
    setTitle('');
    setCanvasKey((k) => k + 1);
    setScrollEnabled(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in.');
      return;
    }
    if (!canvasRef.current) {
      Alert.alert('Error', 'Canvas not ready.');
      return;
    }
    if (!hasAnyStroke) {
      Alert.alert('Error', 'Please draw something first.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Capture the canvas as base64 PNG
      const base64 = await captureRef(canvasRef, {
        format: 'png',
        quality: 1,
        result: 'base64',
      });

      // 2. Convert base64 → bytes
      const bytes = base64ToUint8Array(base64);
      const filePath = `${user.id}/${Date.now()}.png`;

      // 3. Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('rats')
        .upload(filePath, bytes, {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('rats')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      // 4. Insert rat row
      const { error: insertError } = await supabase.from('rats').insert({
        image_url: imageUrl,
        title: title.trim() || null,
        creation_tool: 'png_canvas_v1',
        moderation_state: 'approved',
        avg_rating: 0,
      });

      if (insertError) throw insertError;

      // 5. Award "Baby’s First Rat" badge
      // NOTE: slug must match badges.slug in DB, e.g. "baby-first-rat"
      if (awardBadge) {
        await awardBadge('baby-first-rat');
      }

      Alert.alert('Success', 'Your rat has been submitted!', [
        {
          text: 'OK',
          onPress: () => {
            setHasDrawnToday(true);
          },
        },
      ]);
    } catch (err: any) {
      console.error('submit error', err);
      Alert.alert('Error', err.message || 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (hasDrawnToday) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedTitle}>You've done a rat today.</Text>
          <Text style={styles.lockedText}>Come rat tomorrow.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        scrollEnabled={scrollEnabled}
      >
        <Text style={styles.title}>Draw Your Rat</Text>

        <View style={styles.canvasContainer}>
          <DrawingCanvas
            key={canvasKey}
            ref={canvasRef}
            color={selectedColor}
            brushSize={brushSize}
            tool="brush"
            onStroke={() => setHasAnyStroke(true)}
            onDrawingStart={() => setScrollEnabled(false)}
            onDrawingEnd={() => setScrollEnabled(true)}
          />
        </View>

        {/* Colors */}
        <Text style={styles.sectionLabel}>Colour</Text>
        <View style={styles.row}>
          {Object.entries(COLORS).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.colorButton,
                { backgroundColor: value },
                selectedColor === value && styles.colorButtonActive,
              ]}
              onPressIn={() => setScrollEnabled(false)}
              onPress={() => {
                setSelectedColor(value);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onPressOut={() => setScrollEnabled(true)}
            />
          ))}
        </View>

        {/* Brush sizes */}
        <Text style={styles.sectionLabel}>Brush</Text>
        <View style={styles.row}>
          {BRUSH_SIZES.map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.sizeButton,
                brushSize === size && styles.sizeButtonActive,
              ]}
              onPressIn={() => setScrollEnabled(false)}
              onPress={() => {
                setBrushSize(size);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onPressOut={() => setScrollEnabled(true)}
            >
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: '#fff',
                }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Clear */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.iconButton} onPress={handleClear}>
            <Trash2 size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Add a title (optional)"
          placeholderTextColor="#666"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit rat</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Badge popup */}
      <BadgeUnlockedModal
        visible={!!latestBadge}
        badge={latestBadge}
        onClose={clearLatestBadge}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  canvasContainer: { marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonActive: { borderColor: '#fff' },
  sizeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sizeButtonActive: { borderColor: '#6B4E2E' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#6B4E2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  lockedTitle: { color: '#fff', fontSize: 22, marginBottom: 8 },
  lockedText: { color: '#999' },
  sectionLabel: { color: '#fff', marginBottom: 4, fontWeight: '600' },
});
