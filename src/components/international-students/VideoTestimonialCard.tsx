import { useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Testimonial } from "@/hooks/useTestimonials";

export function VideoTestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();

  const videoUrl = testimonial.video_url;
  const isYouTube = videoUrl?.includes("youtube.com") || videoUrl?.includes("youtu.be");
  const isVimeo = videoUrl?.includes("vimeo.com");

  const getEmbedUrl = () => {
    if (isYouTube) {
      const youtubeId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (youtubeId) {
        return `https://www.youtube.com/embed/${youtubeId}?autoplay=${isPlaying ? 1 : 0}&mute=${
          isMuted ? 1 : 0
        }&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0`;
      }
    }
    if (isVimeo) {
      const vimeoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (vimeoId) {
        return `https://player.vimeo.com/video/${vimeoId}?autoplay=${isPlaying ? 1 : 0}&muted=${
          isMuted ? 1 : 0
        }&loop=1&controls=0&background=1`;
      }
    }
    return null;
  };

  const embedUrl = getEmbedUrl();

  const handlePlay = () => {
    if (embedUrl) {
      setIsPlaying(true);
    } else if (videoRef.current) {
      void videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (embedUrl) {
      setIsPlaying(false);
    } else if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) handlePause();
    else handlePlay();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (embedUrl) {
      setIsMuted(!isMuted);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 100);
    } else if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div
      className="relative h-[480px] overflow-hidden rounded-[28px] bg-black shadow-2xl group md:h-[520px]"
      onMouseEnter={() => !isMobile && handlePlay()}
      onMouseLeave={() => !isMobile && handlePause()}
      onClick={() => isMobile && togglePlay({ stopPropagation: () => {} } as React.MouseEvent)}
    >
      {embedUrl ? (
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <iframe
            src={embedUrl}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={testimonial.name}
            style={{
              pointerEvents: "none",
              width: "177.77777778vh",
              height: "56.25vw",
              minWidth: "100%",
              minHeight: "100%",
              border: "none",
            }}
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={testimonial.cover_image_url || undefined}
          loop
          muted={isMuted}
          playsInline
          className={`h-full w-full object-cover transition-all duration-700 ${
            isPlaying ? "grayscale-0" : "grayscale"
          }`}
        />
      )}

      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      <div
        className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 ${
          isPlaying ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md">
          <Play className="h-6 w-6 fill-white text-white" />
        </div>
      </div>

      {isPlaying && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute right-6 top-6 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/60"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}

      <div className="absolute bottom-8 left-8 right-8 z-20 space-y-1">
        <p className="font-display text-2xl font-black uppercase tracking-wide text-white">
          {testimonial.name}
        </p>
        <p className="text-sm font-medium text-white/70">{testimonial.result}</p>
      </div>
    </div>
  );
}
