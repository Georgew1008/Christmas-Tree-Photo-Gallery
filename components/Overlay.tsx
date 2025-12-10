
import React, { useRef } from 'react';
import { GestureMode } from '../types';

interface OverlayProps {
  onUpload: (files: FileList | null) => void;
  onClear: () => void;
  gestureMode: GestureMode;
  rotationSpeed: number;
  isTracking: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  isLoading: boolean;
}

// Augment input props to allow webkitdirectory
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

const Overlay: React.FC<OverlayProps> = ({ 
  onUpload, 
  onClear,
  gestureMode, 
  rotationSpeed, 
  isTracking, 
  videoRef,
  isLoading
}) => {
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 md:p-10 z-10 font-serif select-none">
      
      {/* Decorative Border Frame */}
      <div className="absolute inset-4 border border-[#F2D06B]/20 pointer-events-none rounded-sm"></div>
      <div className="absolute inset-5 border border-[#F2D06B]/10 pointer-events-none rounded-sm"></div>

      {/* Header & Webcam */}
      <div className="flex justify-between items-start pointer-events-auto z-20">
        <div className="relative">
          <div className="absolute -left-4 -top-2 w-1 h-20 bg-gradient-to-b from-[#F2D06B] to-transparent opacity-50"></div>
          <h1 className="text-4xl md:text-6xl font-bold text-[#F2D06B] drop-shadow-[0_0_15px_rgba(242,208,107,0.4)] tracking-wider" style={{ fontFamily: '"Playfair Display", serif' }}>
            CHRISTMAS TREE
          </h1>
          <p className="text-xs md:text-sm tracking-[0.3em] text-[#A8C5B5] mt-2 uppercase font-light border-t border-[#F2D06B]/30 pt-2 inline-block">
            INTERACTIVE MEMORIES
          </p>
        </div>
        
        {/* Webcam Preview */}
        <div className="relative group">
          <div className="absolute inset-0 bg-[#F2D06B] transform rotate-3 opacity-20 group-hover:rotate-6 transition-transform"></div>
          <div className="relative w-32 h-24 md:w-44 md:h-32 bg-[#001A10] border-2 border-[#F2D06B] shadow-[0_0_20px_rgba(242,208,107,0.2)] overflow-hidden">
             <video 
               ref={videoRef}
               className={`w-full h-full object-cover transform -scale-x-100 ${isTracking ? 'opacity-80 sepia-[0.3]' : 'opacity-20'}`}
               autoPlay 
               playsInline 
               muted 
             />
             {!isTracking && !isLoading && (
               <div className="absolute inset-0 flex items-center justify-center text-center p-2">
                 <span className="text-xs text-[#F2D06B] font-semibold tracking-widest">CAMERA OFF</span>
               </div>
             )}
             {isLoading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                     <div className="w-8 h-8 border-2 border-[#F2D06B] border-t-transparent rounded-full animate-spin"></div>
                 </div>
             )}
          </div>
          {isTracking && (
             <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-[#001A10] border border-[#F2D06B] px-3 py-1">
                <span className="text-[9px] text-[#F2D06B] tracking-[0.2em] font-bold uppercase whitespace-nowrap">
                   {gestureMode === 'TREE' ? '• GATHERED •' : '• SCATTER •'}
                </span>
             </div>
           )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col md:flex-row gap-8 items-end justify-between pointer-events-auto z-20">
        
        <div className="bg-[#001A10]/80 backdrop-blur-md p-6 border-l-2 border-[#F2D06B] shadow-2xl max-w-sm">
           <h3 className="text-[#F2D06B] text-xs tracking-[0.2em] mb-4 uppercase border-b border-[#F2D06B]/20 pb-2">Control Guide</h3>
           <div className="space-y-3 text-sm font-light text-[#E0E0E0]">
              <div className="flex items-center gap-4">
                 <div className="w-1 h-1 bg-[#F2D06B] rotate-45"></div>
                 <span><strong className="text-white font-normal">Open Hand</strong> to Scatter</span>
              </div>
              <div className="flex items-center gap-4">
                 <div className="w-1 h-1 bg-[#F2D06B] rotate-45"></div>
                 <span><strong className="text-white font-normal">Closed Fist</strong> to Gather</span>
              </div>
              <div className="flex items-center gap-4">
                 <div className="w-1 h-1 bg-[#F2D06B] rotate-45"></div>
                 <span><strong className="text-white font-normal">Move L/R</strong> to Rotate</span>
              </div>
           </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
            {/* Clear Button */}
            <button 
                onClick={onClear}
                className="group relative bg-[#1A0000] border border-[#C72C35] px-6 py-4 hover:bg-[#2A0000] transition-colors flex items-center gap-3 shadow-lg"
            >
                <div className="absolute inset-0 bg-[#C72C35] opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <i className="fas fa-trash text-[#C72C35] text-lg"></i>
                <span className="text-[#C72C35] font-bold tracking-[0.2em] text-xs uppercase">Clear Gallery</span>
            </button>

            {/* Upload Button */}
            <label className="cursor-pointer group relative">
            <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => onUpload(e.target.files)}
            />
            <div className="absolute inset-0 bg-[#F2D06B] transform translate-x-1 translate-y-1 transition-transform group-hover:translate-x-2 group-hover:translate-y-2 opacity-40"></div>
            
            <div className="relative bg-[#002A1C] border border-[#F2D06B] px-10 py-4 hover:bg-[#003825] transition-colors flex items-center gap-4 shadow-lg">
                <i className="fas fa-images text-[#F2D06B] text-lg"></i>
                <span className="text-[#F2D06B] font-bold tracking-[0.2em] text-sm uppercase">Upload Photos</span>
            </div>
            </label>
        </div>
      </div>
    </div>
  );
};

export default Overlay;
