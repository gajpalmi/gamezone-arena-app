import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AppSessionContextValue = {
  ready: boolean;
  hasSeenIntro: boolean;
  completeIntro: () => Promise<void>;
};

const AppSessionContext = createContext<AppSessionContextValue | null>(null);
const INTRO_KEY = 'gamezone-arena:intro-complete';

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(INTRO_KEY)
      .then((value) => setHasSeenIntro(value === 'true'))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      hasSeenIntro,
      completeIntro: async () => {
        setHasSeenIntro(true);
        await AsyncStorage.setItem(INTRO_KEY, 'true');
      },
    }),
    [hasSeenIntro, ready],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) throw new Error('useAppSession must be used inside AppSessionProvider');
  return context;
}