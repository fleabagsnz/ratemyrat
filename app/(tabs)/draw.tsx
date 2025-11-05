import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { Undo, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  brown: '#6B4E2E',
  red: '#8B0000',
};

const BRUSH_SIZES = [4, 8, 16];

export default function DrawScreen() {
  const { user } = useAuth();
  const [hasDrawnToday, setHasDrawnToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS.white);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [paths, setPaths] = useState<string[]>([]);
  const [title, setTitle] = useState('');

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
    } catch (error) {
      console.error('Error checking daily rat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaths(paths.slice(0, -1));
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Clear Canvas', 'Are you sure you want to clear your drawing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setPaths([]) },
    ]);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to submit a rat.');
      return;
    }

    if (paths.length === 0) {
      Alert.alert('Error', 'Please draw something before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      // Convert strokes to SVG markup
      const svgData = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="#000000"/>${paths
        .map(
          (p) =>
            `<path d="${p}" stroke="${selectedColor}" stroke-width="${brushSize}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
        )
        .join('')}</svg>`;

      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const fileName = `${user.id}_${Date.now()}.svg`;

      const { error: uploadError } = await supabase.storage
        .from('rats')
        .upload(fileName, blob, {
          contentType: 'image/svg+xml',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('rats')
        .getPublicUrl(fileName);

      const image_url = urlData.publicUrl;

      // Insert the new rat
      const { error: insertError } = await supabase.from('rats').insert({
        owner_id: user.id,
        image_url,
        title: title.trim() || null,
        tags: [],
        creation_tool: 'drawing_canvas_v1',
        moderation_state: 'approved',
        avg_rating: 0,
      });

      if (insertError) throw insertError;

      Alert.alert('Success', 'Your rat has been submitted!', [
        {
          text: 'OK',
          onPress: () => {
            setPaths([]);
            setTitle('');
            setHasDrawnToday(true);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Rat submission error:', error);
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (hasDrawnToday) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hoursLeft = Math.floor(
      (tomorrow.getTime() - Date.now()) / (1000 * 60 * 60)
    );

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedTitle}>You've drawn today!</Text>
          <Text style={styles.lockedText}>
            Come back in {hoursLeft} hours to draw again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Draw Your Rat</Text>

        <View style={styles.canvasContainer}>
          <DrawingCanvas
            color={selectedColor}
            brushSize={brushSize}
            tool={tool}
            onPathsChange={setPaths}
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleUndo}
            disabled={paths.length === 0}
          >
            <Undo size={20} color={paths.length === 0 ? '#333' : '#fff'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleClear}
            disabled={paths.length === 0}
          >
            <Trash2 size={20} color={paths.length === 0 ? '#333' : '#fff'} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Add a title (optional)"
          placeholderTextColor="#666"
          maxLength={40}
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || paths.length === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Rat</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  canvasContainer: { alignItems: 'center', marginBottom: 24 },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
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
    fontSize: 16,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#6B4E2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  lockedText: { fontSize: 16, color: '#999', textAlign: 'center' },
});
