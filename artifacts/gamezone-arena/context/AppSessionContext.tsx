import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getQuickQuizReward, type QuizReward } from '@/constants/quiz';

type AppSessionContextValue = {
  ready: boolean;
  hasSeenIntro: boolean;
  completeIntro: () => Promise<void>;
  progress: PlayerProgress;
  recordQuizResult: (score: number, totalQuestions: number) => QuizReward;
};

export type PlayerProgress = {
  xp: number;
  coins: number;
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  quizBestScore: number;
  dailyChallengeGames: number;
  achievementIds: string[];
};

const AppSessionContext = createContext<AppSessionContextValue | null>(null);
const INTRO_KEY = 'gamezone-arena:intro-complete';
const PROGRESS_KEY = 'gamezone-arena:player-progress';

const initialProgress: PlayerProgress = {
  xp: 0,
  coins: 0,
  gamesPlayed: 0,
  wins: 0,
  currentStreak: 0,
  quizBestScore: 0,
  dailyChallengeGames: 0,
  achievementIds: [],
};

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [progress, setProgress] = useState<PlayerProgress>(initialProgress);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(INTRO_KEY), AsyncStorage.getItem(PROGRESS_KEY)])
      .then(([introValue, progressValue]) => {
        setHasSeenIntro(introValue === 'true');
        if (progressValue) {
          try {
            setProgress({ ...initialProgress, ...JSON.parse(progressValue) });
          } catch {
            setProgress(initialProgress);
          }
        }
      })
      .finally(() => setReady(true));
  }, []);

  const recordQuizResult = (score: number, totalQuestions: number): QuizReward => {
    const reward = getQuickQuizReward(score, totalQuestions);
    setProgress((current) => {
      const next: PlayerProgress = {
        ...current,
        xp: current.xp + reward.xp,
        coins: current.coins + reward.coins,
        gamesPlayed: current.gamesPlayed + 1,
        wins: current.wins + (score >= Math.ceil(totalQuestions * 0.6) ? 1 : 0),
        currentStreak: current.currentStreak + 1,
        quizBestScore: Math.max(current.quizBestScore, score),
        dailyChallengeGames: Math.min(3, current.dailyChallengeGames + 1),
        achievementIds: [
          ...new Set([
            ...current.achievementIds,
            ...(score === totalQuestions ? ['perfect-quiz'] : []),
            ...(current.gamesPlayed === 0 ? ['first-run'] : []),
            ...(current.gamesPlayed + 1 >= 3 ? ['triple-threat'] : []),
          ]),
        ],
      };
      void AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      return next;
    });
    return reward;
  };

  const value = useMemo(
    () => ({
      ready,
      hasSeenIntro,
      completeIntro: async () => {
        setHasSeenIntro(true);
        await AsyncStorage.setItem(INTRO_KEY, 'true');
      },
      progress,
      recordQuizResult,
    }),
    [hasSeenIntro, progress, ready],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) throw new Error('useAppSession must be used inside AppSessionProvider');
  return context;
}