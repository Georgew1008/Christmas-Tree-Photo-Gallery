
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTICLE_COUNT, TREE_HEIGHT, TREE_RADIUS, SCATTER_RADIUS } from '../constants';
import { ParticleData, ParticleType } from '../types';

interface PhotoParticlesProps {
  imageUrls: string[];
  scatterFactor: number; // 0 (Tree) to 1 (Scatter)
  rotationSpeed: number;
}

// Hook to handle particle animation logic
const useParticleAnimation = (
  meshRef: React.RefObject<THREE.InstancedMesh>, 
  particles: ParticleData[], 
  scatterFactor: number,
  orientation: 'billboard' | 'outward' | 'spin' = 'outward'
) => {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Store current positions for smooth transition
  const currentPositions = useRef<Float32Array | null>(null);

  useEffect(() => {
    // Initialize positions on mount or when particles change
    if (particles.length > 0) {
       currentPositions.current = new Float32Array(particles.length * 3);
       particles.forEach((p, i) => {
         currentPositions.current![i * 3] = p.treePos[0];
         currentPositions.current![i * 3 + 1] = p.treePos[1];
         currentPositions.current![i * 3 + 2] = p.treePos[2];
       });
    }
  }, [particles]);

  useFrame((state, delta) => {
    if (!meshRef.current || !currentPositions.current) return;

    const lerpSpeed = 4.0 * delta; 

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      const idx = i * 3;
      
      // Calculate target based on scatterFactor (Interpolation)
      const tx = particle.treePos[0] + (particle.scatterPos[0] - particle.treePos[0]) * scatterFactor;
      const ty = particle.treePos[1] + (particle.scatterPos[1] - particle.treePos[1]) * scatterFactor;
      const tz = particle.treePos[2] + (particle.scatterPos[2] - particle.treePos[2]) * scatterFactor;

      // Soft physics: Lerp current position towards target
      currentPositions.current[idx] += (tx - currentPositions.current[idx]) * lerpSpeed;
      currentPositions.current[idx+1] += (ty - currentPositions.current[idx+1]) * lerpSpeed;
      currentPositions.current[idx+2] += (tz - currentPositions.current[idx+2]) * lerpSpeed;

      const cx = currentPositions.current[idx];
      const cy = currentPositions.current[idx+1];
      const cz = currentPositions.current[idx+2];

      // Update dummy object
      dummy.position.set(cx, cy, cz);
      
      const time = state.clock.elapsedTime;

      // ROTATION LOGIC
      // Mix rotation behavior based on scatterFactor
      if (scatterFactor > 0.5) {
         // Tumble when scattered
         dummy.rotation.x = time * 0.2 + particle.id;
         dummy.rotation.y = time * 0.1 + particle.id;
         dummy.rotation.z = time * 0.05;
      } else {
        // Organized when gathered
        dummy.rotation.set(0,0,0); // Reset for clean lookAt
        if (orientation === 'outward') {
           // Face away from center (0, y, 0)
           dummy.lookAt(cx * 2, cy, cz * 2); 
        } else if (orientation === 'spin') {
           // Geometric ornaments spin slowly
           dummy.rotation.x = time * 0.5 + particle.id;
           dummy.rotation.y = time * 0.5 + particle.id;
        } else {
           dummy.lookAt(state.camera.position);
        }
      }
      
      // SCALE LOGIC
      let currentScale = particle.scale;
      
      // Special behavior for photos: Double size when scattered
      if (particle.type === ParticleType.PHOTO) {
        // Lerp from 1x (at scatter=0) to 2x (at scatter=1)
        currentScale = particle.scale * (1 + scatterFactor);
      }

      dummy.scale.setScalar(currentScale);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });
};

// --- Sub Components ---

const PhotoInstancedMesh: React.FC<{
  texture: THREE.Texture;
  particles: ParticleData[];
  scatterFactor: number;
}> = ({ texture, particles, scatterFactor }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  useParticleAnimation(meshRef, particles, scatterFactor, 'outward');

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      <planeGeometry args={[0.9, 0.9]} /> 
      {/* 
        Fix Z-fighting: Use polygonOffset to force the photo layer to be drawn 
        "in front" of the frame layer in the depth buffer.
      */}
      <meshBasicMaterial 
        map={texture} 
        side={THREE.DoubleSide} 
        polygonOffset
        polygonOffsetFactor={-5}
      />
    </instancedMesh>
  );
}

const PolaroidFrameMesh: React.FC<{
  particles: ParticleData[];
  scatterFactor: number;
}> = ({ particles, scatterFactor }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  useParticleAnimation(meshRef, particles, scatterFactor, 'outward');

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      <planeGeometry args={[1.05, 1.2]} /> 
      {/* 
         Fix Z-fighting: Push the frame "back" in the depth buffer.
      */}
      <meshStandardMaterial 
        color="#F0F0F0" 
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0}
        polygonOffset
        polygonOffsetFactor={5}
      />
    </instancedMesh>
  );
}

const GeometryInstancedMesh: React.FC<{
  particles: ParticleData[];
  scatterFactor: number;
  orientation?: 'billboard' | 'outward' | 'spin';
  children: React.ReactNode;
}> = ({ particles, scatterFactor, orientation, children }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  useParticleAnimation(meshRef, particles, scatterFactor, orientation);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      {children}
    </instancedMesh>
  );
}

// Separate component for Photos to safely use useLoader conditionally
const PhotoLayers: React.FC<{
    imageUrls: string[];
    photos: ParticleData[];
    scatterFactor: number;
}> = ({ imageUrls, photos, scatterFactor }) => {
    // Only called when imageUrls is not empty
    const textures = useLoader(THREE.TextureLoader, imageUrls);
    
    // Ensure textures is always an array (useLoader can return single texture if one URL passed)
    const textureArray = useMemo(() => Array.isArray(textures) ? textures : [textures], [textures]);

    // Group Photos by Texture
    const photosByTexture = useMemo(() => {
        const grouped: ParticleData[][] = Array.from({ length: imageUrls.length }, () => []);
        photos.forEach(p => {
             // Safety check for index bounds
             if(grouped[p.textureIndex]) {
                 grouped[p.textureIndex].push(p);
             }
        });
        return grouped;
    }, [photos, imageUrls.length]);

    return (
        <>
        {photosByTexture.map((groupParticles, index) => {
            if (groupParticles.length === 0) return null;
            return (
              <React.Fragment key={`photo-group-${index}`}>
                 <PhotoInstancedMesh 
                   texture={textureArray[index]} 
                   particles={groupParticles} 
                   scatterFactor={scatterFactor}
                 />
                 <PolaroidFrameMesh 
                   particles={groupParticles}
                   scatterFactor={scatterFactor}
                 />
              </React.Fragment>
            );
          })}
        </>
    )
}


const PhotoParticles: React.FC<PhotoParticlesProps> = ({ imageUrls, scatterFactor, rotationSpeed }) => {
  
  const { photos, goldOrnaments, greenOrnaments, redOrnaments } = useMemo(() => {
    const photoList: ParticleData[] = [];
    const goldList: ParticleData[] = [];
    const greenList: ParticleData[] = [];
    const redList: ParticleData[] = [];
    
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const hasPhotos = imageUrls.length > 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Shape Calcs
      const y = (i / PARTICLE_COUNT) * TREE_HEIGHT - (TREE_HEIGHT / 2);
      const radiusAtY = ((TREE_HEIGHT / 2 - y) / TREE_HEIGHT) * TREE_RADIUS; 
      const theta = 2 * Math.PI * i * goldenRatio;
      
      const treeX = radiusAtY * Math.cos(theta);
      const treeZ = radiusAtY * Math.sin(theta);
      
      // Scatter Calcs
      const u = Math.random();
      const v = Math.random();
      const thetaScatter = 2 * Math.PI * u;
      const phiScatter = Math.acos(2 * v - 1);
      const rScatter = SCATTER_RADIUS * (0.6 + Math.random() * 0.6);
      
      const scatterX = rScatter * Math.sin(phiScatter) * Math.cos(thetaScatter);
      const scatterY = rScatter * Math.sin(phiScatter) * Math.sin(thetaScatter);
      const scatterZ = rScatter * Math.cos(phiScatter);

      const baseData: ParticleData = {
        id: i,
        textureIndex: hasPhotos ? i % imageUrls.length : 0, 
        scale: 1, 
        treePos: [treeX, y, treeZ],
        scatterPos: [scatterX, scatterY, scatterZ],
        type: ParticleType.GOLD // Default
      };

      const typeRand = Math.random();
      
      // If we have photos, allocate 60% to photos.
      if (typeRand < 0.6) {
        if (hasPhotos) {
          baseData.type = ParticleType.PHOTO;
          baseData.scale = 0.8 + Math.random() * 0.4;
          photoList.push(baseData);
        } else {
           // No photos uploaded yet. Fill with Gold/Red.
           baseData.type = ParticleType.GOLD;
           baseData.scale = 0.2 + Math.random() * 0.2;
           goldList.push(baseData);
        }
      } else if (typeRand < 0.75) {
        // Gold 15%
        baseData.type = ParticleType.GOLD;
        baseData.scale = 0.25 + Math.random() * 0.25;
        goldList.push(baseData);
      } else if (typeRand < 0.85) {
        // Green 10%
        baseData.type = ParticleType.GREEN;
        baseData.scale = 0.25 + Math.random() * 0.25;
        greenList.push(baseData);
      } else {
        // Red 15% (New Layer)
        baseData.type = ParticleType.RED;
        baseData.scale = 0.25 + Math.random() * 0.25;
        redList.push(baseData);
      }
    }
    
    return { photos: photoList, goldOrnaments: goldList, greenOrnaments: greenList, redOrnaments: redList };
  }, [imageUrls.length]); // Re-run when URL count changes

  const groupRef = useRef<THREE.Group>(null);
  const currentRotationSpeed = useRef(0);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetSpeed = rotationSpeed * 2.5;
      currentRotationSpeed.current += (targetSpeed - currentRotationSpeed.current) * 0.1;
      const baseSpeed = 0.1; 
      groupRef.current.rotation.y += (baseSpeed + currentRotationSpeed.current) * delta;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. RENDER PHOTOS (Conditionally, only if we have URLs) */}
      {imageUrls.length > 0 && (
         <PhotoLayers 
            imageUrls={imageUrls} 
            photos={photos} 
            scatterFactor={scatterFactor} 
         />
      )}

      {/* 2. GOLD ORNAMENTS (Icosahedron) */}
      <GeometryInstancedMesh 
        particles={goldOrnaments}
        scatterFactor={scatterFactor}
        orientation="spin"
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color="#F2D06B" 
          metalness={1.0} 
          roughness={0.1} 
          envMapIntensity={2.0}
        />
      </GeometryInstancedMesh>

      {/* 3. GREEN ORNAMENTS (Octahedron) */}
      <GeometryInstancedMesh 
        particles={greenOrnaments}
        scatterFactor={scatterFactor}
        orientation="spin"
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color="#004d2e" 
          metalness={0.2}
          roughness={0.6}
          envMapIntensity={0.5}
        />
      </GeometryInstancedMesh>

      {/* 4. RED ORNAMENTS (Dodecahedron - New Layer) */}
      <GeometryInstancedMesh 
        particles={redOrnaments}
        scatterFactor={scatterFactor}
        orientation="spin"
      >
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial 
          color="#C72C35" 
          metalness={0.6}
          roughness={0.2}
          envMapIntensity={1.2}
        />
      </GeometryInstancedMesh>
    </group>
  );
};

export default PhotoParticles;
