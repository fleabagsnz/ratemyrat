import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { X, Shield } from 'lucide-react-native';

type Report = {
  id: string;
  rat_id: string;
  reason: string;
  created_at: string;
  status: string;
  rat: {
    id: string;
    title: string | null;
    thumb_url: string;
    owner_id: string;
    moderation_state: string;
  };
};

export default function AdminScreen() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [view, setView] = useState<'reports' | 'pending'>('reports');

  useEffect(() => {
    if (!profile?.is_admin) {
      router.back();
      return;
    }
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data } = await supabase
        .from('reports')
        .select('*, rat:rats(*)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20);

      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleApprove = async (ratId: string, reportId: string) => {
    try {
      await supabase
        .from('rats')
        .update({ moderation_state: 'approved' })
        .eq('id', ratId);

      await supabase
        .from('reports')
        .update({ status: 'actioned' })
        .eq('id', reportId);

      Alert.alert('Success', 'Rat approved');
      fetchReports();
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleReject = async (ratId: string, reportId: string) => {
    Alert.alert(
      'Reject Rat',
      'Are you sure you want to reject this rat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('rats')
                .update({ moderation_state: 'rejected' })
                .eq('id', ratId);

              await supabase
                .from('reports')
                .update({ status: 'actioned' })
                .eq('id', reportId);

              Alert.alert('Success', 'Rat rejected');
              fetchReports();
            } catch (error) {
              console.error('Error rejecting:', error);
            }
          },
        },
      ]
    );
  };

  const handleDismiss = async (reportId: string) => {
    try {
      await supabase
        .from('reports')
        .update({ status: 'dismissed' })
        .eq('id', reportId);

      Alert.alert('Success', 'Report dismissed');
      fetchReports();
    } catch (error) {
      console.error('Error dismissing:', error);
    }
  };

  if (!profile?.is_admin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield size={24} color="#FF3B30" />
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Open Reports</Text>

        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No open reports</Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <Image
                source={{ uri: report.rat.thumb_url }}
                style={styles.reportImage}
              />
              <View style={styles.reportInfo}>
                <Text style={styles.reportReason}>{report.reason}</Text>
                {report.rat.title && (
                  <Text style={styles.reportTitle}>"{report.rat.title}"</Text>
                )}
                <Text style={styles.reportDate}>
                  {new Date(report.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprove(report.rat_id, report.id)}
                >
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleReject(report.rat_id, report.id)}
                >
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.dismissButton]}
                  onPress={() => handleDismiss(report.id)}
                >
                  <Text style={styles.actionButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
  },
  reportCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  reportImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#000000',
    marginBottom: 12,
  },
  reportInfo: {
    marginBottom: 12,
  },
  reportReason: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#666666',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  dismissButton: {
    backgroundColor: '#666666',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
