
import React, { useEffect, useRef, useState } from 'react';
import Experience from './components/Experience';
import Overlay from './components/Overlay';
import { initHandTracking, detectGesture } from './services/handTracking';
import { DEFAULT_PHOTOS } from './constants';
import { GestureMode, AppState } from './types';
import { HandLandmarker } from '@mediapipe/tasks-vision';
import { saveImagesToDB, loadImagesFromDB, clearImagesFromDB } from './services/persistence';

const App: React.FC = () => {
  // App State
  const [appState, setAppState] = useState<AppState>(AppState.LOADING_ASSETS);
  const [imageUrls, setImageUrls] = useState<string[]>(DEFAULT_PHOTOS);
  
  // Interaction State (Passed to Canvas)
  const [gestureMode, setGestureMode] = useState<GestureMode>(GestureMode.TREE);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0);
  const [scatterFactor, setScatterFactor] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  
  // Refs for loop
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVideoTime = useRef<number>(-1);
  const requestRef = useRef<number>(0);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  
  // Smoothing refs
  const targetScatterFactor = useRef<number>(0);
  const currentScatterFactor = useRef<number>(0);

  // Initialize Hand Tracking & Load Persisted Photos
  useEffect(() => {
    const setupApp = async () => {
      try {
        setAppState(AppState.LOADING_ASSETS);
        
        // 1. Load persisted photos
        try {
          const savedUrls = await loadImagesFromDB();
          if (savedUrls.length > 0) {
            setImageUrls(savedUrls);
          }
        } catch (e) {
          console.warn("Could not load saved photos", e);
        }

        setAppState(AppState.LOADING_MODEL);
        
        // 2. Init Hand Tracking
        const landmarker = await initHandTracking();
        handLandmarkerRef.current = landmarker;

        // 3. Get webcam stream
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
           const stream = await navigator.mediaDevices.getUserMedia({ 
             video: { 
               width: 640,
               height: 480,
               facingMode: "user" 
             } 
           });
           
           if (videoRef.current) {
             videoRef.current.srcObject = stream;
             videoRef.current.addEventListener('loadeddata', predictWebcam);
             setIsTracking(true);
           }
        }
        setAppState(AppState.READY);
      } catch (err) {
        console.error("Camera/Tracking Error:", err);
        setAppState(AppState.ERROR);
        setAppState(AppState.READY);
      }
    };

    setupApp();

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revoke object URLs when they change or component unmounts
  useEffect(() => {
    return () => {
      imageUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imageUrls]);

  const predictWebcam = () => {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;

    if (video && landmarker && video.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = video.currentTime;
      
      const startTimeMs = performance.now();
      const results = landmarker.detectForVideo(video, startTimeMs);
      
      const { gesture, handX, scatterFactor: rawScatter } = detectGesture(results);
      
      // Update basic state
      setGestureMode(gesture || GestureMode.TREE);
      
      // Update Smoothing Targets
      if (rawScatter !== undefined) {
         targetScatterFactor.current = rawScatter;
      } else {
         // Fallback if no hand detected: gradually close tree
         targetScatterFactor.current = 0;
      }
      
      // Rotation logic
      const x = handX !== undefined ? handX : 0.5;
      let speed = 0;
      if (x < 0.4) speed = (x - 0.4) * 2.5; 
      if (x > 0.6) speed = (x - 0.6) * 2.5;
      speed = Math.max(-1, Math.min(1, speed));
      setRotationSpeed(speed);
    }
    
    // Smooth the scatter factor (Linear Interpolation)
    currentScatterFactor.current += (targetScatterFactor.current - currentScatterFactor.current) * 0.1;
    
    // Update React State for the scene
    setScatterFactor(currentScatterFactor.current);

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // 1. Save to DB
    await saveImagesToDB(fileArray);

    // 2. Generate URLs for current session immediately
    const newUrls: string[] = [];
    fileArray.forEach(file => {
      const url = URL.createObjectURL(file);
      newUrls.push(url);
    });
    
    // Append to existing
    setImageUrls(prev => [...prev, ...newUrls]);
  };

  const handleClearPhotos = async () => {
     await clearImagesFromDB();
     setImageUrls([]);
  };

  return (
    <div className="relative w-full h-full bg-black">
      <Overlay 
        onUpload={handlePhotoUpload}
        onClear={handleClearPhotos}
        gestureMode={gestureMode}
        rotationSpeed={rotationSpeed}
        isTracking={isTracking}
        videoRef={videoRef}
        isLoading={appState !== AppState.READY && appState !== AppState.ERROR}
      />
      
      <Experience 
        imageUrls={imageUrls}
        rotationSpeed={rotationSpeed}
        scatterFactor={scatterFactor}
      />
    </div>
  );
};

export default App;
