import { Tabs } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
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
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '主頁',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: '衣櫃',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="hanger" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '新增',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.addBtn, focused ? styles.addBtnActive : styles.addBtnInactive]}>
              <IconSymbol size={20} name="plus" color={focused ? '#0a0a0a' : '#444444'} />
            </View>
          ),
          tabBarLabel: ({ color }) => (
            <Text style={[styles.label, { color }]}>新增</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '個人',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="person.fill" color={color} />,
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
    height: 84,
    paddingBottom: 18,
    paddingTop: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addBtnActive: { backgroundColor: '#9CE41C' },
  addBtnInactive: { backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#333333' },
});
