// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Grid, Palette, Star, Settings as SettingsIcon, Skull } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { profile } = useAuth();
  const evilEnabled = !!profile?.is_evil;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#333333',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#666666',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Wall',
          tabBarIcon: ({ size, color }) => <Grid size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="draw"
        options={{
          title: 'Draw',
          tabBarIcon: ({ size, color }) => <Palette size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="rate"
        options={{
          title: 'Rate',
          tabBarIcon: ({ size, color }) => <Star size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="evil"
        options={{
          title: 'Evil',
          // Remove from tabs + deep links when disabled
          href: evilEnabled ? undefined : null,
          tabBarIcon: ({ size, color }) =>
            evilEnabled ? <Skull size={size} color={color} /> : undefined,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <SettingsIcon size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
