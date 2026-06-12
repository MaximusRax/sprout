import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useState } from "react";
import {
  Dimensions,
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
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { svgPathProperties } from "svg-path-properties";
import { DefaultShapes } from "../constants/DefaultShapes";

const { width, height } = Dimensions.get("window");

interface Stroke {
  path: string;
  color: string;
}

const samplePointsFromPaths = (paths: string[], numPoints: number = 50) => {
  let points: { x: number; y: number }[] = [];
  paths.forEach((p) => {
    try {
      const properties = new svgPathProperties(p);
      const length = properties.getTotalLength();
      if (length === 0) return;
      const pointsPerStroke = Math.max(
        10,
        Math.floor(numPoints / paths.length),
      );
      for (let i = 0; i <= pointsPerStroke; i++) {
        const point = properties.getPointAtLength(
          (i / pointsPerStroke) * length,
        );
        points.push({ x: point.x, y: point.y });
      }
    } catch (e) {
      console.warn("Failed to parse path properties", e);
    }
  });
  return points;
};

const normalizePoints = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return points;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  const maxDim = Math.max(width, height) || 1;

  return points.map((p) => ({
    x: (p.x - centerX) / maxDim,
    y: (p.y - centerY) / maxDim,
  }));
};

const calculateScore = (
  userPoints: { x: number; y: number }[],
  targetPoints: { x: number; y: number }[],
) => {
  const normUser = normalizePoints(userPoints);
  const normTarget = normalizePoints(targetPoints);

  if (normUser.length === 0 || normTarget.length === 0) return 0;

  let totalMinDist = 0;
  normUser.forEach((u) => {
    let minDist = Infinity;
    normTarget.forEach((t) => {
      const dist = Math.sqrt(Math.pow(u.x - t.x, 2) + Math.pow(u.y - t.y, 2));
      if (dist < minDist) minDist = dist;
    });
    totalMinDist += minDist;
  });

  const avgDist = totalMinDist / normUser.length;
  const maxDist = 0.5; // Max acceptable average distance
  const score = Math.max(0, 100 - (avgDist / maxDist) * 100);
  return score;
};

export default function CameraTrace() {
  const router = useRouter();
  // Retrieve the parameters passed from the Home screen
  const { mode, shape, customData } = useLocalSearchParams<{
    mode: string;
    shape?: string;
    customData?: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [scoreResult, setScoreResult] = useState<number | null>(null);
  const [isDrawingLocked, setIsDrawingLocked] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);

  const isFreeDraw = mode === "free-draw";
  const isCustom = mode === "custom";

  const canvasBackground =
    isCustom && parsedCustomData?.backgroundColor
      ? parsedCustomData.backgroundColor
      : "#FFFBEB";

  let parsedCustomData: any = null;
  if (isCustom && customData) {
    try {
      parsedCustomData = JSON.parse(customData);
    } catch (e) {}
  }

  // Reanimated shared value for the pulsing celebration effect
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (scoreResult !== null) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1, // Infinite repeat
        true, // Reverse
      );
    } else {
      pulse.value = 1; // Reset when not in success state
    }
  }, [scoreResult]);

  const animatedCelebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handleDone = () => {
    setIsDrawingLocked(true);

    // Free-draw guarantees a win as long as they tapped Done!
    if (isFreeDraw) {
      setScoreResult(100);
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      const allPaths = strokes.map((s) => s.path);
      if (currentStroke?.path) allPaths.push(currentStroke.path);

      let targetPaths: string[] = [];
      if (isCustom && parsedCustomData) {
        targetPaths = parsedCustomData.strokes.map((s: Stroke) => s.path);
      } else if (shape && DefaultShapes[shape]) {
        targetPaths = [DefaultShapes[shape]];
      }

      const userPoints = samplePointsFromPaths(allPaths, 100);
      const targetPoints = samplePointsFromPaths(targetPaths, 100);

      if (userPoints.length < 10) {
        setScoreResult(20);
      } else {
        const score = calculateScore(userPoints, targetPoints);
        setScoreResult(score);
      }
      setIsCalculating(false);
    }, 100); // Small delay to let the UI render the loading state
  };

  // Setup standard PanGesture to handle user drawing.
  // runOnJS(true) ensures standard React states are updated without Reanimated worklet errors.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onStart((e) => {
      if (isDrawingLocked) return;
      setCurrentStroke({ path: `M ${e.x} ${e.y}`, color: "#39FF14" });
    })
    .onUpdate((e) => {
      if (isDrawingLocked) return;
      setCurrentStroke((prev) =>
        prev ? { ...prev, path: `${prev.path} L ${e.x} ${e.y}` } : null,
      );
    })
    .onEnd(() => {
      if (isDrawingLocked) return;
      setCurrentStroke((finalStroke) => {
        if (finalStroke && finalStroke.path) {
          setStrokes((prev) => [...prev, finalStroke]);
        }
        return null;
      });
    });

  // Show a blank loading state while checking camera permissions
  if (isCameraMode && !permission) {
    return <View style={styles.container} />;
  }

  // Child-friendly fallback UI if camera access is missing
  if (isCameraMode && !permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.instructions}>We need your camera to play.</Text>

        <TouchableOpacity
          style={styles.permissionButton}
          activeOpacity={0.8}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Allow Camera 📷</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => setIsCameraMode(false)}
        >
          <Text style={styles.buttonText}>⬅️ Use Canvas Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Celebration screen rendered upon matching success
  if (scoreResult !== null) {
    let message = "";
    let icon = "";
    let isGold = false;

    if (scoreResult < 50) {
      message = "Nice Try!\nLet's Practice Again!";
      icon = "💪";
    } else if (scoreResult <= 80) {
      message = "Great Job!\nYou earned ⭐ 1 Star";
      icon = "⭐";
    } else {
      message = "Amazing!\nYou earned 🏆 Gold Badge";
      icon = "🏆";
      isGold = true;
    }

    return (
      <View style={styles.successContainer}>
        {isGold && (
          <LottieView
            source={{
              uri: "https://lottie.host/294b684d-d6b4-4116-ab35-85846f4e4b52/t4kE2wN3lJ.json",
            }}
            autoPlay
            loop
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            pointerEvents="none"
          />
        )}
        <Animated.View
          style={[styles.celebrationContent, animatedCelebrationStyle]}
        >
          <Text style={styles.successIcon}>{icon}</Text>
          <Text style={styles.successTitle}>{message}</Text>
        </Animated.View>

        <TouchableOpacity
          style={styles.playAgainButton}
          activeOpacity={0.8}
          onPress={() => {
            setScoreResult(null);
            setStrokes([]);
            setCurrentStroke(null);
            setIsDrawingLocked(false);
            router.push("/");
          }}
        >
          <Text style={styles.buttonText}>Ready for another adventure? 🚀</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Generates a thick, semi-transparent white outline of the chosen shape
  const renderOverlayShape = (isCelebration = false) => {
    if (isFreeDraw) return null;

    const commonProps = {
      stroke: isCelebration ? "#118AB2" : "#E0E0E0",
      strokeWidth: isCelebration ? 8 : 3,
      fill: isCelebration ? "#E0FDFC" : "none",
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      ...(isCelebration ? {} : { strokeDasharray: "15, 15" }),
    };

    if (isCustom && parsedCustomData) {
      // Safely check if customData contains the new 'strokes' array
      const strokeArray = parsedCustomData.strokes || [];
      return (
        <>
          {strokeArray.map((s: Stroke, i: number) => {
            const safePath =
              s.path && s.path.trim().startsWith("M")
                ? s.path
                : "M 10 10 H 90 V 90 H 10 Z";
            if (safePath === "M 10 10 H 90 V 90 H 10 Z") {
              console.warn("Malformed custom path data detected");
            }
            return (
              <Path
                key={i}
                d={safePath}
                stroke={isCelebration ? s.color : "#E0E0E0"}
                strokeWidth={isCelebration ? 8 : 3}
                fill={
                  isCelebration
                    ? parsedCustomData.backgroundColor || "#E0FDFC"
                    : "none"
                }
                strokeLinecap="round"
                strokeLinejoin="round"
                {...(isCelebration ? {} : { strokeDasharray: "15, 15" })}
              />
            );
          })}
        </>
      );
    }

    if (!shape) return null;

    let pathData = DefaultShapes[shape];
    if (!pathData || !pathData.trim().startsWith("M")) {
      console.warn("Malformed or missing SVG path data. Using fallback shape.");
      pathData = "M 10 10 H 90 V 90 H 10 Z";
    }

    return <Path d={pathData} {...commonProps} />;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Background Layer */}
        <View style={StyleSheet.absoluteFill}>
          {isCameraMode ? (
            <CameraView style={StyleSheet.absoluteFill} facing="back" />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: canvasBackground },
              ]}
            />
          )}
        </View>

        {/* Tracing Area Wrapper - absolutely centered */}
        <View style={styles.tracingWrapper} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <View
              style={[
                styles.tracingBox,
                isFreeDraw && { width: "100%", height: "100%", borderWidth: 0 },
              ]}
              collapsable={false}
            >
              {/* Target Shape (Bottom Layer) */}
              {!isFreeDraw && (
                <View
                  style={{
                    ...StyleSheet.absoluteFill,
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1,
                    opacity: isCameraMode ? 0.6 : 1.0,
                  }}
                  pointerEvents="none"
                >
                  <Svg
                    width="100%"
                    height="100%"
                    viewBox={
                      isCustom ? `0 0 ${width} ${height}` : "0 0 100 100"
                    }
                    style={{ backgroundColor: "transparent" }}
                  >
                    {renderOverlayShape()}
                  </Svg>
                </View>
              )}

              {/* Active Drawing SVG (Top Layer) */}
              <Svg
                width="100%"
                height="100%"
                viewBox={isFreeDraw ? `0 0 ${width} ${height}` : "0 0 300 300"}
                style={{
                  position: "absolute",
                  zIndex: 10,
                  backgroundColor: "transparent",
                }}
              >
                {strokes.map((s, i) => (
                  <Path
                    key={i}
                    d={s.path}
                    stroke={s.color}
                    strokeWidth={14}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentStroke ? (
                  <Path
                    d={currentStroke.path}
                    stroke={currentStroke.color}
                    strokeWidth={14}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </Svg>
            </View>
          </GestureDetector>
        </View>

        {/* Floating Done Button */}
        {!isDrawingLocked && (
          <TouchableOpacity
            style={styles.floatingDoneButton}
            activeOpacity={0.8}
            onPress={handleDone}
          >
            <Text style={styles.buttonTextSmall}>Check My Drawing! ✅</Text>
          </TouchableOpacity>
        )}

        {isCalculating && (
          <View style={styles.calculatingOverlay}>
            <Text style={styles.calculatingText}>Calculating... 🤔</Text>
          </View>
        )}

        {/* Safe UI Overlay (Back button and Instructions) */}
        {/* box-none allows touches to pass through the blank space to the drawing canvas */}
        <View style={styles.uiOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.floatingBackButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonTextSmall}>⬅️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingToggleButton}
            activeOpacity={0.8}
            onPress={() => setIsCameraMode(!isCameraMode)}
          >
            <Text style={styles.buttonTextSmall}>
              {isCameraMode ? "📷" : "🎨"}
            </Text>
          </TouchableOpacity>

          <View pointerEvents="none" style={styles.header}>
            <Text style={styles.titleOverlay}>
              {isFreeDraw
                ? "Draw whatever you like!"
                : isCustom
                  ? "Trace your drawing!"
                  : `Trace the ${shape}!`}
            </Text>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#FFE5D9", // Soft peach background
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "#118AB2", // Bright blue
    marginBottom: 10,
    textAlign: "center",
  },
  instructions: {
    fontSize: 24,
    fontWeight: "600",
    color: "#073B4C", // Dark contrasting text
    marginBottom: 30,
    textAlign: "center",
  },
  tracingWrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  tracingBox: {
    width: 300,
    height: 300,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 2,
    borderRadius: 20,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  uiOverlay: {
    ...StyleSheet.absoluteFill,
    padding: 20,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60, // Gives safe area at top
    paddingBottom: 40, // Gives space at bottom
  },
  header: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  titleOverlay: {
    fontSize: 26,
    fontWeight: "900",
    color: "#EF476F", // Playful pink
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#06D6A0", // Playful green
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    backgroundColor: "#FFD166", // Bright yellow
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 30,
    minWidth: 220,
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  floatingDoneButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#06D6A0",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 40,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 20,
  },
  floatingBackButton: {
    position: "absolute",
    top: 60,
    left: 20,
    backgroundColor: "#FFD166",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 20,
  },
  floatingToggleButton: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#9D4EDD",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 20,
  },
  buttonTextSmall: {
    fontSize: 22,
    fontWeight: "900",
    color: "#073B4C",
  },
  calculatingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  calculatingText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#118AB2",
  },
  successContainer: {
    flex: 1,
    backgroundColor: "#FFD166", // Bright solid celebration yellow
    alignItems: "center",
    justifyContent: "space-evenly",
    padding: 20,
  },
  celebrationContent: {
    alignItems: "center",
  },
  successIcon: {
    fontSize: 100,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 55,
    fontWeight: "900",
    color: "#EF476F", // Playful Pink
    marginBottom: 40,
    textAlign: "center",
  },
  playAgainButton: {
    backgroundColor: "#118AB2", // Bright Blue
    paddingVertical: 24,
    paddingHorizontal: 40,
    borderRadius: 40,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#073B4C",
  },
});
