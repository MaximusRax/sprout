import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFD166", // Bright playful yellow
        },
        headerTintColor: "#073B4C", // High contrast text for readability
        headerTitleStyle: {
          fontWeight: "900",
          fontSize: 28, // Large font for child-friendly UI
        },
        contentStyle: {
          backgroundColor: "#F8F9FA",
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="camera-trace" options={{ headerShown: false }} />
      <Stack.Screen
        name="create-outline"
        options={{ title: "Create Outline" }}
      />
    </Stack>
  );
}
