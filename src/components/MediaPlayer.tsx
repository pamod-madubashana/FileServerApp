import { useEffect, useRef } from "react";
import "plyr/dist/plyr.css";

interface MediaPlayerProps {
  mediaUrl: string;
  fileName: string;
  fileType: "video" | "audio" | "voice";
  onClose: () => void;
}

export const MediaPlayer = ({ mediaUrl, fileName, fileType, onClose }: MediaPlayerProps) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const plyrInstance = useRef<any>(null);

  useEffect(() => {
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
            
            // Initialize Plyr
            plyrInstance.current = new PlyrConstructor(mediaElement, {
              controls: [
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
              settings: ['captions', 'quality', 'speed', 'loop'],
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
                enabled: true,
                fallback: true,
                iosNative: true
              },
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
          } catch (error) {
            console.error('Error initializing Plyr:', error);
          }
        }, 200);
      } catch (error) {
        console.error('Failed to load Plyr:', error);
      }
    };
    
    initPlayer();
    
    return () => {
      isMounted = false;
      if (plyrInstance.current) {
        plyrInstance.current.destroy();
        plyrInstance.current = null;
      }
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
      }
    };
  }, [mediaUrl, fileName, fileType]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
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
          maxWidth: fileType === 'video' ? '90vw' : '600px',
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