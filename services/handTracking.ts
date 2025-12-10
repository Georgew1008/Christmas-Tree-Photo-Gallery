
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { VISION_MODEL_URL } from "../constants"; 
import { GestureMode as GestureModeEnum, HandData } from "../types"; 

// Singleton instance to prevent multiple loads
let handLandmarker: HandLandmarker | null = null;

export const initHandTracking = async (): Promise<HandLandmarker> => {
  if (handLandmarker) return handLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: VISION_MODEL_URL,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });

  return handLandmarker;
};

export const detectGesture = (result: HandLandmarkerResult): Partial<HandData> => {
  if (!result.landmarks || result.landmarks.length === 0) {
    return { 
      gesture: GestureModeEnum.TREE, 
      handX: 0.5, 
      scatterFactor: 0 
    };
  }

  const landmarks = result.landmarks[0];
  
  // Calculate bounding box and average X
  let sumX = 0;
  landmarks.forEach(lm => sumX += lm.x);
  const avgX = sumX / landmarks.length;

  // Calculate Openness (Continuous)
  const wrist = landmarks[0];
  const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
  
  // Reference size: Wrist to Middle Finger MCP (Index 9)
  const palmSize = Math.sqrt(
    Math.pow(landmarks[9].x - wrist.x, 2) + 
    Math.pow(landmarks[9].y - wrist.y, 2)
  );

  let totalRatio = 0;
  tips.forEach(tipIdx => {
    const tip = landmarks[tipIdx];
    const distance = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
    totalRatio += distance / palmSize;
  });
  
  const avgRatio = totalRatio / tips.length;
  
  // Thumb check
  const thumbTip = landmarks[4];
  const thumbDist = Math.sqrt(Math.pow(thumbTip.x - wrist.x, 2) + Math.pow(thumbTip.y - wrist.y, 2));
  const thumbRatio = thumbDist / palmSize;

  // Heuristic mapping
  // Closed fist avgRatio is approx ~0.5 - 0.8
  // Open hand avgRatio is approx ~1.5 - 2.0
  // Thumb adds weight
  
  const combinedMetric = (avgRatio * 0.8) + (thumbRatio * 0.2);
  
  // Map 0.8 (closed) to 1.6 (open) to 0.0 - 1.0 range
  const lowerBound = 0.9;
  const upperBound = 1.7;
  
  let openFactor = (combinedMetric - lowerBound) / (upperBound - lowerBound);
  openFactor = Math.max(0, Math.min(1, openFactor)); // Clamp

  return {
    gesture: openFactor > 0.5 ? GestureModeEnum.SCATTER : GestureModeEnum.TREE,
    handX: 1 - avgX, // Mirror
    scatterFactor: openFactor
  };
};
