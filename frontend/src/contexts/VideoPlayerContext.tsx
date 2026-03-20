'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface VideoInfo {
  eventId: string;
  videoUrl: string;
  title: string;
  subtitle: string;
  returnPath: string;
  fullPagePath: string;
}

interface VideoPlayerContextType {
  /** Current video info, null if no video is active */
  video: VideoInfo | null;
  /** Whether the video is in mini (floating) mode */
  isMinimized: boolean;
  /** Start playing a video (navigates to full page) */
  playVideo: (info: VideoInfo) => void;
  /** Minimize to floating mini player */
  minimize: () => void;
  /** Expand back to full page */
  expand: () => void;
  /** Close the video entirely */
  closeVideo: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | null>(null);

export function VideoPlayerProvider({ children }: { children: React.ReactNode }) {
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const playVideo = useCallback((info: VideoInfo) => {
    setVideo(info);
    setIsMinimized(false);
  }, []);

  const minimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const expand = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const closeVideo = useCallback(() => {
    setVideo(null);
    setIsMinimized(false);
  }, []);

  return (
    <VideoPlayerContext.Provider
      value={{ video, isMinimized, playVideo, minimize, expand, closeVideo }}
    >
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayer() {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within VideoPlayerProvider');
  }
  return context;
}
