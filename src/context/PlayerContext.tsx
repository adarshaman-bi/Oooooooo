import React, { createContext, useContext, useState } from 'react';
import { Lecture } from '../types';

interface PlayerContextType {
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playlistQueue: string[];
  setPlaylistQueue: (queue: string[]) => void;
  activeLecture: Lecture | null;
  setActiveLecture: (lecture: Lecture | null) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playlistQueue, setPlaylistQueue] = useState<string[]>([]);
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);

  const handleSetActiveVideoId = (id: string | null) => {
    setActiveVideoId(id);
    if (id) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        activeVideoId,
        setActiveVideoId: handleSetActiveVideoId,
        isPlaying,
        setIsPlaying,
        playlistQueue,
        setPlaylistQueue,
        activeLecture,
        setActiveLecture
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
