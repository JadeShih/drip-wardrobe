import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#9CE41C',
        tabBarInactiveTintColor: '#444444',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="hanger" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.addBtn}>
              <IconSymbol size={22} name="plus" color="#0a0a0a" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#111111',
    borderTopColor: '#1a1a1a',
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
    paddingTop: 12,
  },
  addBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#9CE41C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});
