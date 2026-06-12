import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Path, Svg } from "react-native-svg";
import { DefaultShapes } from "../constants/DefaultShapes";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

type ShapeType = "circle" | "star" | "cat" | "apple" | "letterA" | "custom";

interface Stroke {
  path: string;
  color: string;
}

interface CustomOutline {
  id: string;
  strokes: Stroke[];
  backgroundColor: string;
}

interface ShapeButtonProps {
  shape: ShapeType;
  color: string;
  onPress: () => void;
  customOutline?: CustomOutline;
}

const ShapeButton = ({
  shape,
  color,
  onPress,
  customOutline,
}: ShapeButtonProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    // Scale down slightly when the child presses the shape
    scale.value = withSpring(0.85);
  };

  const handlePressOut = () => {
    // Spring back up when they release
    scale.value = withSpring(1);
  };

  const renderShape = () => {
    if (shape === "custom") {
      return customOutline ? (
        <>
          {customOutline.strokes.map((s, i) => (
            <Path
              key={i}
              d={s.path}
              stroke={s.color}
              strokeWidth={8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </>
      ) : null;
    }

    const pathData = DefaultShapes[shape];
    if (pathData) {
      return (
        <Path
          d={pathData}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    return null;
  };

  const customBg =
    shape === "custom" && customOutline?.backgroundColor
      ? customOutline.backgroundColor
      : "#FFFFFF";

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        styles.shapeWrapper,
        { backgroundColor: customBg },
        animatedStyle,
      ]}
    >
      <Svg
        width="100"
        height="100"
        viewBox={
          shape === "custom"
            ? `0 0 ${windowWidth} ${windowHeight}`
            : "0 0 100 100"
        }
      >
        {renderShape()}
      </Svg>
    </AnimatedPressable>
  );
};

export default function Home() {
  const router = useRouter();
  const [customOutlines, setCustomOutlines] = useState<CustomOutline[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadOutlines = async () => {
        try {
          const existing = await AsyncStorage.getItem("custom_outlines");
          if (existing) {
            const parsed = JSON.parse(existing);
            // Gracefully handle older versions where arrays of strings were saved
            const normalized = parsed.map((item: any) => {
              if (typeof item === "string") {
                return {
                  id: Date.now().toString() + Math.random(),
                  strokes: [{ path: item, color: "#9D4EDD" }],
                  backgroundColor: "#FFFFFF",
                };
              }
              // Backward compatibility for old `{ paths: [...], strokeColor }` shapes
              if (item.paths && !item.strokes) {
                return {
                  ...item,
                  strokes: item.paths.map((p: string) => ({
                    path: p,
                    color: item.strokeColor || "#9D4EDD",
                  })),
                };
              }
              return item;
            });
            setCustomOutlines(normalized);
          }
        } catch (e) {
          console.error("Failed to load custom outlines", e);
        }
      };
      loadOutlines();
    }, []),
  );

  const handleShapePress = (shape: ShapeType) => {
    router.push({
      pathname: "/camera-trace",
      params: { mode: "shape", shape },
    });
  };

  const handleFreeDrawPress = () => {
    router.push({
      pathname: "/camera-trace",
      params: { mode: "free-draw" },
    });
  };

  const handleCustomPress = (outline: CustomOutline) => {
    router.push({
      pathname: "/camera-trace",
      params: { mode: "custom", customData: JSON.stringify(outline) },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Pick a shape to trace</Text>

      <View style={styles.gridContainer}>
        <ShapeButton
          shape="circle"
          color="#EF476F"
          onPress={() => handleShapePress("circle")}
        />
        <ShapeButton
          shape="star"
          color="#FFD166"
          onPress={() => handleShapePress("star")}
        />
        <ShapeButton
          shape="cat"
          color="#06D6A0"
          onPress={() => handleShapePress("cat")}
        />
        <ShapeButton
          shape="apple"
          color="#118AB2"
          onPress={() => handleShapePress("apple")}
        />
        <ShapeButton
          shape="letterA"
          color="#9D4EDD"
          onPress={() => handleShapePress("letterA")}
        />
        {customOutlines.map((outline) => (
          <ShapeButton
            key={outline.id}
            shape="custom"
            color="#9D4EDD"
            customOutline={outline}
            onPress={() => handleCustomPress(outline)}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: "#FF9F1C", marginBottom: 15 },
        ]}
        activeOpacity={0.8}
        onPress={() => router.push("/create-outline")}
      >
        <Text style={styles.buttonText}>Draw Your Own! ➕</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={handleFreeDrawPress}
      >
        <Text style={styles.buttonText}>Free Draw 🎨</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0FDFC",
  },
  scrollContent: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 60, // Extra padding to allow scrolling comfortably past the bottom
  },
  title: {
    fontSize: 54,
    fontWeight: "900",
    color: "#EF476F",
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 26,
    fontWeight: "600",
    color: "#118AB2",
    textAlign: "center",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 30,
    marginVertical: 30,
  },
  shapeWrapper: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  button: {
    backgroundColor: "#9D4EDD",
    paddingVertical: 24,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    minWidth: 280,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
