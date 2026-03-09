'use client';

import { createContext, useContext, useState, useCallback } from 'react';

export interface VideoInfo {
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
  /** The DOM element where the iframe should be positioned in full-page mode */
  containerElement: HTMLDivElement | null;
  /** Register a container element (called by video page on mount) */
  registerContainer: (el: HTMLDivElement) => void;
  /** Unregister the container (called by video page on unmount) */
  unregisterContainer: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | null>(null);

export function VideoPlayerProvider({ children }: { children: React.ReactNode }) {
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);

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

  const registerContainer = useCallback((el: HTMLDivElement) => {
    setContainerElement(el);
  }, []);

  const unregisterContainer = useCallback(() => {
    setContainerElement(null);
  }, []);

  return (
    <VideoPlayerContext.Provider
      value={{
        video, isMinimized, playVideo, minimize, expand, closeVideo,
        containerElement, registerContainer, unregisterContainer,
      }}
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
