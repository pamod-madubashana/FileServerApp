import { useEffect, useRef, useState } from "react";
import "plyr/dist/plyr.css";
import { FileAudio } from "lucide-react";

interface MediaPlayerProps {
  mediaUrl: string;
  fileName: string;
  fileType: "video" | "audio" | "voice";
  startPosition?: { x: number; y: number; width: number; height: number };
  onClose: () => void;
}

export const MediaPlayer = ({ mediaUrl, fileName, fileType, startPosition, onClose }: MediaPlayerProps) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const plyrInstance = useRef<any>(null);
  const [isVisible, setIsVisible] = useState(false); // Start hidden for open animation
  const [isAnimating, setIsAnimating] = useState(!!startPosition);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger open animation after component mounts
    setIsVisible(true);
    
    let isMounted = true;
    
    const initPlayer = async () => {
      try {
        // Dynamically import Plyr
        const PlyrModule = await import("plyr");
        const Plyr = 'default' in PlyrModule ? PlyrModule.default : PlyrModule;
        
        if (!isMounted || !playerContainerRef.current) return;
        
        // Clean up existing player
        if (plyrInstance.current) {
          plyrInstance.current.destroy();
          plyrInstance.current = null;
        }
        
        // Clear container
        playerContainerRef.current.innerHTML = '';
        
        // Create a div wrapper for Plyr
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.maxHeight = '70vh';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        
        // Create media element with attributes that prevent default player
        const mediaElement = document.createElement(fileType === 'video' ? 'video' : 'audio');
        mediaElement.controls = false; // Disable default controls
        mediaElement.preload = "none"; // Prevent automatic loading
        mediaElement.style.width = '100%';
        mediaElement.style.height = '100%';
        mediaElement.style.maxHeight = '100%';
        mediaElement.style.objectFit = 'contain';
        
        // Add Plyr-specific attributes
        if (fileType === 'video') {
          mediaElement.setAttribute('playsinline', '');
          (mediaElement as HTMLVideoElement).playsInline = true;
        }
        
        // Add source
        const source = document.createElement('source');
        source.src = mediaUrl;
        
        // Set MIME type based on file extension
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        if (fileType === 'video') {
          switch (extension) {
            case 'webm': source.type = 'video/webm'; break;
            case 'ogg': source.type = 'video/ogg'; break;
            default: source.type = 'video/mp4';
          }
        } else {
          switch (extension) {
            case 'wav': source.type = 'audio/wav'; break;
            case 'ogg': source.type = 'audio/ogg'; break;
            default: source.type = 'audio/mpeg';
          }
        }
        
        mediaElement.appendChild(source);
        wrapper.appendChild(mediaElement);
        playerContainerRef.current.appendChild(wrapper);
        
        // Initialize Plyr after a short delay
        setTimeout(() => {
          if (!isMounted || !wrapper.contains(mediaElement)) return;
          
          try {
            // Type assertion for TypeScript
            const PlyrConstructor = Plyr as new (...args: any[]) => any;
            
            // Initialize Plyr with different settings for audio/voice vs video
            const isAudio = fileType === "audio" || fileType === "voice";
            
            plyrInstance.current = new PlyrConstructor(mediaElement, {
              controls: isAudio 
                ? ['play', 'progress'] // Play button and timeline for audio/voice
                : [ // Full controls for video
                  'play-large',
                  'play',
                  'progress',
                  'current-time',
                  'duration',
                  'mute',
                  'volume',
                  'captions',
                  'settings',
                  'pip',
                  'airplay',
                  'download',
                  'fullscreen'
                ],
              settings: isAudio ? [] : ['captions', 'quality', 'speed', 'loop'],
              ratio: '16:9',
              quality: {
                default: 576,
                options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240]
              },
              captions: {
                active: true,
                language: 'auto',
                update: true
              },
              tooltips: {
                controls: true,
                seek: true
              },
              keyboard: {
                focused: true,
                global: true
              },
              fullscreen: {
                enabled: !isAudio, // Disable fullscreen for audio/voice
                fallback: true,
                iosNative: true
              },
              autopause: false, // Don't pause when another player starts
              autoplay: isAudio, // Auto-play for audio/voice only
              i18n: {
                restart: 'Restart',
                rewind: 'Rewind {seektime}s',
                play: 'Play',
                pause: 'Pause',
                fastForward: 'Forward {seektime}s',
                seek: 'Seek',
                seekLabel: '{currentTime} of {duration}',
                played: 'Played',
                buffered: 'Buffered',
                currentTime: 'Current time',
                duration: 'Duration',
                volume: 'Volume',
                mute: 'Mute',
                unmute: 'Unmute',
                enableCaptions: 'Enable captions',
                disableCaptions: 'Disable captions',
                download: 'Download',
                enterFullscreen: 'Enter fullscreen',
                exitFullscreen: 'Exit fullscreen',
                frameTitle: 'Player for {title}',
                captions: 'Captions',
                settings: 'Settings',
                pip: 'PIP',
                menuBack: 'Go back to previous menu',
                speed: 'Speed',
                normal: 'Normal',
                quality: 'Quality',
                loop: 'Loop'
              }
            });
            
            // Add event listeners
            plyrInstance.current.on('error', (error: any) => {
              console.error('Plyr error:', error);
            });
            
            // Auto-play for audio/voice
            if (isAudio) {
              // Ensure the player is ready before playing
              mediaElement.addEventListener('canplay', () => {
                if (plyrInstance.current && !plyrInstance.current.playing) {
                  plyrInstance.current.play();
                }
              });
              
              // Try to play immediately as well
              setTimeout(() => {
                if (plyrInstance.current && !plyrInstance.current.playing) {
                  plyrInstance.current.play().catch(e => {
                    console.warn('Autoplay failed:', e);
                  });
                }
              }, 100);
              
              // Auto-close widget when playback ends
              plyrInstance.current.on('ended', () => {
                if (isMounted) {
                  // Keep the widget visible for 5 seconds before closing
                  closeTimerRef.current = setTimeout(() => {
                    handleClose();
                  }, 5000); // 5 seconds delay
                }
              });
            }
          } catch (error) {
            console.error('Error initializing Plyr:', error);
          }
        }, 200);
      } catch (error) {
        console.error('Failed to load Plyr:', error);
      }
    };
    
    initPlayer();
    
    // Start animation after a brief moment to allow rendering
    if (startPosition) {
      const animationTimeout = setTimeout(() => {
        setIsAnimating(false);
      }, 50);
      
      return () => {
        isMounted = false;
        clearTimeout(animationTimeout);
        // Clear the timeout if component unmounts
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
        }
        if (plyrInstance.current) {
          plyrInstance.current.stop(); // Stop playback on unmount
          plyrInstance.current.destroy();
          plyrInstance.current = null;
        }
        if (playerContainerRef.current) {
          playerContainerRef.current.innerHTML = '';
        }
      };
    }
    
    return () => {
      isMounted = false;
      // Clear the timeout if component unmounts
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      if (plyrInstance.current) {
        plyrInstance.current.stop(); // Stop playback on unmount
        plyrInstance.current.destroy();
        plyrInstance.current = null;
      }
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
      }
    };
  }, [mediaUrl, fileName, fileType, onClose, startPosition]);

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    // Clear any pending close timers
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    
    // Start the dropdown animation
    setIsVisible(false);
    
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 300); // Match the duration of the CSS transition
  };

  // For audio and voice messages, render as a floating widget in the bottom right
  const isAudio = fileType === "audio" || fileType === "voice";
  
  if (isAudio) {
    // If we have a start position, render the animation element
    if (startPosition && isAnimating) {
      return (
        <>
          {/* Animation element that moves from icon to player position */}
          <div 
            ref={animationRef}
            className="fixed backdrop-blur-lg bg-black/30 border border-white/10 rounded-xl shadow-2xl z-50 flex items-center justify-center pointer-events-none"
            style={{
              left: `${startPosition.x}px`,
              top: `${startPosition.y}px`,
              width: `${startPosition.width}px`,
              height: `${startPosition.height}px`,
              transition: 'all 0.3s ease-out',
              transform: 'translate(0, 0)',
              opacity: 1,
            }}
          >
            <FileAudio className="w-1/2 h-1/2 text-white" />
          </div>
          
          {/* Actual player that appears after animation */}
          <div 
            className={`fixed bottom-4 right-4 w-80 backdrop-blur-lg bg-black/30 border border-white/10 rounded-xl shadow-2xl z-50 transition-all duration-300 ease-in-out`}
            style={{
              transition: 'all 0.3s ease-out 0.1s',
              opacity: isAnimating ? 0 : (isVisible ? 1 : 0),
              transform: isAnimating ? 'translateY(0)' : (isVisible ? 'translateY(0)' : 'translateY(100%)'),
            }}
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="text-white text-sm font-medium truncate">{fileName}</div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors ml-2"
                aria-label="Close player"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            
            <div 
              ref={playerContainerRef}
              className="p-3"
              style={{ 
                minHeight: '60px'
              }}
            />
            
            <style>{`
              .plyr {
                width: 100% !important;
                max-width: 100% !important;
              }
              .plyr__controls {
                background: transparent !important;
                padding: 0 !important;
                padding-right: 5px !important; /* Reduce padding to prevent overflow */
              }
              .plyr__control {
                color: white !important;
                border-radius: 50% !important; /* Make play button circular */
                background: #3b82f6 !important; /* Blue background color */
                width: 32px !important;
                height: 32px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .plyr__control:hover {
                background: #2563eb !important; /* Darker blue on hover */
              }
              .plyr__progress {
                margin: 0 !important;
                margin-right: 5px !important; /* Add small margin to prevent overflow */
              }
              .plyr__time {
                color: white !important;
                font-size: 0.75rem !important;
              }
              audio {
                width: 100% !important;
              }
            `}</style>
          </div>
        </>
      );
    }
    
    // Regular player with dropdown open animation
    return (
      <div className={`fixed bottom-4 right-4 w-80 backdrop-blur-lg bg-black/30 border border-white/10 rounded-xl shadow-2xl z-50 transition-all duration-300 ease-in-out`}
        style={{
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          opacity: isVisible ? 1 : 0,
        }}
      >
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="text-white text-sm font-medium truncate">{fileName}</div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors ml-2"
            aria-label="Close player"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        <div 
          ref={playerContainerRef}
          className="p-3"
          style={{ 
            minHeight: '60px'
          }}
        />
        
        <style>{`
          .plyr {
            width: 100% !important;
            max-width: 100% !important;
          }
          .plyr__controls {
            background: transparent !important;
            padding: 0 !important;
            padding-right: 5px !important; /* Reduce padding to prevent overflow */
          }
          .plyr__control {
            color: white !important;
            border-radius: 50% !important; /* Make play button circular */
            background: #3b82f6 !important; /* Blue background color */
            width: 32px !important;
            height: 32px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .plyr__control:hover {
            background: #2563eb !important; /* Darker blue on hover */
          }
          .plyr__progress {
            margin: 0 !important;
            margin-right: 5px !important; /* Add small margin to prevent overflow */
          }
          .plyr__time {
            color: white !important;
            font-size: 0.75rem !important;
          }
          audio {
            width: 100% !important;
          }
        `}</style>
      </div>
    );
  }

  // For video, keep the full-screen view
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-300 transition-colors bg-black/30 backdrop-blur rounded-full p-2"
          aria-label="Close player"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      
      <div className="absolute top-4 left-4 text-white text-lg font-semibold z-10">
        {fileName}
      </div>
      
      <div 
        ref={playerContainerRef}
        className="flex items-center justify-center w-full h-full"
        style={{ 
          padding: '2rem',
          maxHeight: '90vh',
          maxWidth: '90vw',
          margin: '0 auto'
        }}
      />
      
      <style>{`
        .plyr {
          width: 100% !important;
          max-height: 70vh !important;
          height: auto !important;
        }
        .plyr__video-wrapper {
          height: auto !important;
          max-height: 70vh !important;
        }
        .plyr__video-embed, .plyr__video-wrapper--fixed-ratio {
          height: auto !important;
          max-height: 70vh !important;
        }
        video {
          width: 100% !important;
          height: auto !important;
          max-height: 70vh !important;
          object-fit: contain !important;
        }
        audio {
          width: 100% !important;
        }
      `}</style>
    </div>
  );
};