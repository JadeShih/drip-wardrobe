import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="style-quiz" />
      <Stack.Screen name="style-result" />
      <Stack.Screen name="profile-info" />
      <Stack.Screen name="body-photo" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
