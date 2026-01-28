import { useRef, useEffect, useState } from 'react';

interface RoboticGripperProps {
  pressure: number; // 0-20 PSI (video mapping)
  freezeVideo?: boolean; // when true, video stays at "closed" and doesn't update until pressure <= 20 again
  showReducePressure?: boolean; // when true, show "Reduce pressure" in top-left of animation
  videoSrc?: string; // Path to video file (defaults to /gripper-animation.mp4)
}

const RoboticGripper: React.FC<RoboticGripperProps> = ({ 
  pressure, 
  freezeVideo = false,
  showReducePressure = false,
  videoSrc = '/gripper-animation.mp4' 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const prevPressureRef = useRef<number>(pressure);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const targetTimeRef = useRef<number>(0);
  
  const maxPressure = 20;
  
  // Handle video loaded metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setIsVideoLoaded(true);
      const pressureRatio = Math.min(Math.max(pressure / maxPressure, 0), 1);
      const targetTime = pressureRatio * videoRef.current.duration;
      videoRef.current.currentTime = targetTime;
      targetTimeRef.current = targetTime;
    }
  };
  
  // When entering "freeze" (pressure > 20), seek to end once; video stays closed until pressure <= 20
  useEffect(() => {
    if (!videoRef.current || !isVideoLoaded || videoDuration === 0 || !freezeVideo) return;
    videoRef.current.currentTime = videoDuration;
    targetTimeRef.current = videoDuration;
  }, [freezeVideo, isVideoLoaded, videoDuration]);
  
  // Update video position based on pressure (skipped when freezeVideo – pressure > 20)
  useEffect(() => {
    if (!videoRef.current || !isVideoLoaded || videoDuration === 0 || freezeVideo) return;
    
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastUpdateTimeRef.current) / 1000;
    lastUpdateTimeRef.current = currentTime;
    
    const pressureDelta = pressure - prevPressureRef.current;
    const pressureChangeRate = Math.abs(deltaTime > 0 ? pressureDelta / deltaTime : 0);
    prevPressureRef.current = pressure;
    
    const pressureRatio = Math.min(Math.max(pressure / maxPressure, 0), 1);
    const targetTime = pressureRatio * videoDuration;
    targetTimeRef.current = targetTime;
    
    const basePlaybackRate = 1.0;
    const maxChangeRate = 10;
    const speedMultiplier = Math.min(1 + (pressureChangeRate / maxChangeRate), 2);
    const playbackRate = basePlaybackRate * speedMultiplier;
    
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      const currentVideoTime = videoRef.current.currentTime;
      const timeDifference = targetTime - currentVideoTime;
      if (Math.abs(timeDifference) > 0.1) {
        videoRef.current.currentTime = targetTime;
      } else {
        const smoothStep = timeDifference * 0.3;
        videoRef.current.currentTime = currentVideoTime + smoothStep;
      }
    }
  }, [pressure, isVideoLoaded, videoDuration, freezeVideo]);
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <video
        ref={videoRef}
        src={videoSrc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
        onLoadedMetadata={handleLoadedMetadata}
        playsInline
        muted
        preload="auto"
      />
      {!isVideoLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '14px',
        }}>
          Loading video...
        </div>
      )}
      {showReducePressure && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              color: 'white',
              fontSize: '1.125rem',
              backgroundColor: '#ef4444',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            }}
          >
            Reduce pressure
          </div>
        </div>
      )}
    </div>
  );
};

export default RoboticGripper;
