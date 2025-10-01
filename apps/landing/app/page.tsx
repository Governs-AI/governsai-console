"use client";

import { useEffect, useRef, useState } from "react";

function GovernsAIComingSoon() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Default to unmuted
  const [showError, setShowError] = useState(false);
  const [hasAutoToggled, setHasAutoToggled] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsLoaded(true);
    };

    const handleError = () => {
      setShowError(true);
    };

    const handleEnded = () => {
      video.currentTime = 0;
      video.play();
    };

    const playVideo = () => {
      // Ensure video starts muted for autoplay compliance
      video.muted = true;
      setIsMuted(true);

      video.play().catch((e) => {
        console.log("Autoplay prevented:", e);
      });
    };

    const autoToggleSound = () => {
      if (!hasAutoToggled && video) {
        // Auto-toggle sound after a short delay
        setTimeout(() => {
          try {
            video.muted = false;
            setIsMuted(false);
            setHasAutoToggled(true);
            console.log("Auto-unmuted video");
          } catch (error) {
            console.log("Could not auto-unmute video:", error);
          }
        }, 2000); // 2 second delay
      }
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);

    playVideo();
    autoToggleSound();

    const handleClick = () => {
      playVideo();
      // Also try to unmute on user interaction
      if (video && isMuted) {
        video.muted = false;
        setIsMuted(false);
        setHasAutoToggled(true);
      }
    };

    document.addEventListener("click", handleClick, { once: true });

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
      {/* Video Container */}
      <div className="fixed inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted={isMuted}
          loop
          playsInline
          className="h-screen w-screen opacity-[0.99]"
        >
          <source src="/gvai.mp4" type="video/mp4" />
          <source src="/gvai.webm" type="video/webm" />
        </video>
      </div>

      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 pointer-events-none z-10" />

      {/* Gradient Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.4) 100%)",
        }}
      />

      {/* Loading Indicator */}
      {/* {!isLoaded && !showError && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-white text-base tracking-wider animate-pulse">
          Loading...
        </div>
      )} */}

      {showError && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-white text-base tracking-wider opacity-100">
          Video unavailable - Please add your Governs AI video file
        </div>
      )}

      {/* Sound Toggle - Commented out as in original */}
      <button
        onClick={toggleSound}
        className="fixed top-[5vh] right-[5vw] z-30 bg-white/10 border border-white/20 text-white px-4 py-3 rounded-full cursor-pointer text-sm tracking-wider transition-all duration-300 hover:bg-white/20 hover:scale-105 backdrop-blur-md md:top-[3vh] md:right-[3vw] md:px-3.5 md:py-2.5 md:text-xs"
      >
        {isMuted ? "🔇" : "🔊"}
      </button>

      {/* Content */}
      <div className="fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-20 text-center text-white opacity-0 animate-fadeInUp md:bottom-[10vh]">
        <div className="relative overflow-hidden text-[clamp(1.5rem,4vw,3rem)] font-light tracking-[0.2em] uppercase mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
          <span className="relative">
            Governs AI
            <span
              className="absolute top-0 left-0 w-full h-full animate-shine"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 80%, transparent 100%)",
                animationDelay: "6s",
              }}
            />
          </span>
        </div>
        {/* <div className="text-[clamp(0.8rem,2vw,1.2rem)] font-extralight tracking-[0.1em] opacity-80 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          Coming Soon
        </div> */}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes shine {
          0% {
            left: -100%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 2s ease-out 3s forwards;
        }

        .animate-shine {
          animation: shine 1s ease-in-out 0s forwards;
          animation-delay: 6s;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  return <GovernsAIComingSoon />;
}
