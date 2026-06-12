import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const STROKE_COLORS = [
  "#000000",
  "#FF0000",
  "#0000FF",
  "#00FF00",
  "#FFFF00",
  "#800080",
  "#FF8C00",
  "#FF1493",
];
const BG_COLORS = [
  "#FFFFFF",
  "#ADD8E6",
  "#FFFACD",
  "#FFB6C1",
  "#E0FDFC",
  "#FFE5D9",
  "#D3F8E2",
  "#E8DFF5",
];

const Swatch = ({ color, isSelected, onPress, isSquare = false }: any) => {
  const scale = useSharedValue(isSelected ? 1.2 : 1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.2 : 1);
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.swatch,
          isSquare ? styles.swatchSquare : styles.swatchCircle,
          { backgroundColor: color },
          isSelected && styles.swatchSelected,
          animatedStyle,
        ]}
      />
    </TouchableOpacity>
  );
};

interface Stroke {
  path: string;
  color: string;
}

export default function CreateOutline() {
  const router = useRouter();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#000000");
  const [canvasBackground, setCanvasBackground] = useState<string>("#FFFFFF");

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onStart((e) => {
      setCurrentStroke({ path: `M ${e.x} ${e.y}`, color: selectedColor });
    })
    .onUpdate((e) => {
      setCurrentStroke((prev) =>
        prev ? { ...prev, path: `${prev.path} L ${e.x} ${e.y}` } : null,
      );
    })
    .onEnd(() => {
      setCurrentStroke((finalStroke) => {
        if (finalStroke && finalStroke.path) {
          setStrokes((prev) => [...prev, finalStroke]);
        }
        return null;
      });
    });

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
  };

  const handleSaveAndPlay = async () => {
    const finalStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    if (finalStrokes.length === 0) return;

    const outlineData = {
      id: Date.now().toString(),
      strokes: finalStrokes,
      backgroundColor: canvasBackground,
    };

    try {
      const existing = await AsyncStorage.getItem("custom_outlines");
      const outlines = existing ? JSON.parse(existing) : [];
      outlines.push(outlineData);
      await AsyncStorage.setItem("custom_outlines", JSON.stringify(outlines));

      router.push({
        pathname: "/camera-trace",
        params: { mode: "custom", customData: JSON.stringify(outlineData) },
      });
    } catch (e) {
      console.error("Failed to save outline", e);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Draw Your Own!</Text>

        <View
          style={[
            styles.canvasContainer,
            { backgroundColor: canvasBackground },
          ]}
        >
          <GestureDetector gesture={pan}>
            <View style={StyleSheet.absoluteFillObject} collapsable={false}>
              <Svg style={StyleSheet.absoluteFillObject}>
                {strokes.map((stroke, i) => (
                  <Path
                    key={i}
                    d={stroke.path}
                    stroke={stroke.color}
                    strokeWidth={8}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentStroke ? (
                  <Path
                    d={currentStroke.path}
                    stroke={currentStroke.color}
                    strokeWidth={8}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </Svg>
            </View>
          </GestureDetector>
        </View>

        <View style={styles.pickerSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatchRow}
          >
            {STROKE_COLORS.map((color) => (
              <Swatch
                key={color}
                color={color}
                isSelected={selectedColor === color}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatchRow}
          >
            {BG_COLORS.map((bg) => (
              <Swatch
                key={bg}
                color={bg}
                isSquare={true}
                isSelected={canvasBackground === bg}
                onPress={() => setCanvasBackground(bg)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleUndo}>
            <Text style={styles.buttonTextSmall}>↩️ Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#EF476F" }]}
            onPress={handleClear}
          >
            <Text style={styles.buttonTextSmall}>🗑️ Clear</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndPlay}>
          <Text style={styles.buttonText}>Save & Play 🚀</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0FDFC",
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "#118AB2",
    marginBottom: 10,
  },
  canvasContainer: {
    flex: 1,
    width: "100%",
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#118AB2",
    marginBottom: 10,
  },
  pickerSection: {
    width: "100%",
    height: 110,
    justifyContent: "center",
  },
  swatchRow: {
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 15,
  },
  swatch: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  swatchCircle: {
    borderRadius: 18,
  },
  swatchSquare: {
    borderRadius: 8,
  },
  swatchSelected: {
    borderColor: "#073B4C",
    borderWidth: 3,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: "#FFD166",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flex: 0.48,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#06D6A0",
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  buttonTextSmall: {
    fontSize: 20,
    fontWeight: "900",
    color: "#073B4C",
  },
  buttonText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
