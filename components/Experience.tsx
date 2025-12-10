
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sparkles, Stars, Float, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import PhotoParticles from './PhotoParticles';

interface ExperienceProps {
  imageUrls: string[];
  rotationSpeed: number;
  scatterFactor: number;
}

const Experience: React.FC<ExperienceProps> = ({ imageUrls, rotationSpeed, scatterFactor }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 28], fov: 45 }}
      gl={{ 
        antialias: false,
        alpha: false, 
        toneMappingExposure: 1.1,
        powerPreference: "high-performance"
      }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#001A10']} /> 
      
      <fog attach="fog" args={['#001A10', 10, 70]} />

      <ambientLight intensity={0.3} />
      <pointLight position={[10, 15, 15]} intensity={2.5} color="#F2D06B" />
      <pointLight position={[-15, 5, -10]} intensity={2} color="#4A90E2" />
      <spotLight position={[0, -10, 10]} angle={1} intensity={1} color="#FFD700" />

      <Environment preset="city" />

      <Stars radius={120} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
      
      <Suspense fallback={null}>
        <PhotoParticles 
          imageUrls={imageUrls} 
          scatterFactor={scatterFactor}
          rotationSpeed={rotationSpeed}
        />
        
        {/* Sparkles scale based on scatterFactor */}
        <Sparkles 
          count={200} 
          scale={14 + scatterFactor * 16} 
          size={4} 
          speed={0.2} 
          opacity={0.8} 
          color="#F2D06B"
        />
        
        {/* Top Star */}
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
            {/* Star scales down as tree scatters */}
            <group scale={1 - scatterFactor * 0.9}>
                <mesh position={[0, 7.8, 0]} scale={1.5}>
                  <octahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial 
                    color="#F2D06B" 
                    emissive="#F2D06B"
                    emissiveIntensity={2}
                    metalness={1}
                    roughness={0} 
                  />
                  <pointLight distance={15} intensity={3} color="#F2D06B" decay={2} />
                </mesh>
                <mesh position={[0, 7.8, 0]} rotation={[0, 0, Math.PI / 4]} scale={2.0}>
                   <torusGeometry args={[1.2, 0.05, 16, 4]} />
                   <meshStandardMaterial color="#F2D06B" metalness={1} roughness={0} />
                </mesh>
            </group>
        </Float>
      </Suspense>

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.8}
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </EffectComposer>

      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={10} 
        maxDistance={60}
      />
    </Canvas>
  );
};

export default Experience;
