'use client';

import { useRouter } from 'next/navigation';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import Icon from '@/components/ui/Icon';

export default function FloatingVideoPlayer() {
  const { video, isMinimized, expand, closeVideo } = useVideoPlayer();
  const router = useRouter();

  if (!video || !isMinimized) return null;

  const handleExpand = () => {
    expand();
    router.push(video.fullPagePath);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] w-[400px] rounded-xl overflow-hidden shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.4)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary animate-slideUp">
      {/* Header */}
      <div className="px-3 py-2 bg-[#1a1a2e] flex items-center gap-2">
        <span className="flex-1 text-text-white text-xs font-medium leading-4 truncate">
          {video.title}
        </span>
        <div className="flex items-center gap-1">
          {/* Expand */}
          <button
            onClick={handleExpand}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Expandir"
          >
            <Icon name="open_in_full" size={16} className="text-icon-white" />
          </button>
          {/* Close */}
          <button
            onClick={closeVideo}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Cerrar"
          >
            <Icon name="close" size={16} className="text-icon-white" />
          </button>
        </div>
      </div>

      {/* Video iframe */}
      <div className="aspect-video bg-black">
        <iframe
          src={video.videoUrl}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={video.title}
        />
      </div>
    </div>
  );
}
