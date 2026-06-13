# Trace & Learn Adventure - Sprout

Trace & Learn Adventure is an interactive AR tracing and matching game designed specifically for children ages 3-8. By overlaying interactive drawing canvases on a live camera feed, it helps develop early motor skills and hand-eye coordination through engaging, real-world exploration.

## Fulfilling the Evaluation Tasks

### Task 01: 5-minute engagement loop

The app's core loop is perfectly tailored to the attention span of a 3-year-old: **Choose Activity -> Practice Draw -> AR Camera Trace -> Get Score**. This sequence offers immediate gratification while keeping the cognitive load light enough to easily complete within a 5-minute session. When the time or session naturally winds down, the app gently prompts the child to save their artwork to the gallery and take a restful break.

### Task 02: Mini interactive screen

The 'Home' gallery and 'Create Outline' screens serve as our interactive playgrounds. Built with playful animations, bouncing UI elements, scaling shapes, and delightful auditory feedback, these screens are highly tactile and responsive, purposefully tuned for the motor skills and expectations of ages 3-5.

### Task 03: Diagnose a drop-off problem

Investigate First: Check app analytics (events before exit) to see if they drop off during loading, permissions, or a specific drawing step. Test on low-end devices for lag. Interview 3-5 parents/kids observing their sessions.

Build/Test: If the camera permission blocks them, build a soft-prompt tutorial. If drawing is too hard, test a 'forgiving mode' with a wider safe radius. If bored, test immediate audio feedback ('Wow!') mid-drawing.

Measure Success: Track the completion rate of the core 5-minute loop. Success is a statistically significant increase in users reaching the final 'Reward' screen compared to the baseline.

### Task 04: Live device-integration feature

The `CameraTrace` screen acts as our device-integrated showcase. Utilizing `expo-camera` for a live background, the application allows the child to trace real-world matched objects.

[Insert Link to 2-min Demo Video Here]

---

## Technical Stack & Optimizations

Built with a modern, performant React Native stack to ensure fluid 60fps interactions:

- `expo`
- `react-native-reanimated`
- `react-native-gesture-handler`
- `react-native-svg`
- `expo-camera`
- `@shopify/react-native-skia`

**Optimizations:** To guarantee smooth performance even on touch-sensitive and mid-range Android devices, the app relies on normalized point-math for scoring rather than heavy, memory-intensive pixel processing algorithms.

---

## Installation & Running Locally

1. Clone the repository:

   ```bash
   git clone <https://github.com/maximusrax/sprout.git>
   cd sprout
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the app:
   ```bash
   npx expo start
   ```

_Scan the QR code with Expo Go (iOS/Android) or press `a` or `i` to open in an emulator._
