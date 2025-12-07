// contexts/EvilModeContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type EvilModeContextType = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  loading: boolean;
};

const EvilModeContext = createContext<EvilModeContextType>({
  enabled: false,
  setEnabled: () => {},
  loading: true,
});

const STORAGE_KEY = 'evil-mode-enabled';

export function EvilModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial value from storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw === 'true') setEnabledState(true);
      } catch (e) {
        console.warn('[EvilMode] Failed to load setting', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist changes
  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false').catch((e) =>
      console.warn('[EvilMode] Failed to persist setting', e)
    );
  };

  return (
    <EvilModeContext.Provider value={{ enabled, setEnabled, loading }}>
      {children}
    </EvilModeContext.Provider>
  );
}

export function useEvilMode() {
  return useContext(EvilModeContext);
}
