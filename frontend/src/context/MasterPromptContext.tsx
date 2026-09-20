'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface MasterPromptContextValue {
  userRules: string;
  setUserRules: (v: string) => void;
}

const MasterPromptContext = createContext<MasterPromptContextValue>({
  userRules: '',
  setUserRules: () => {},
});

const STORAGE_KEY = 'aija_master_rules';

export function MasterPromptProvider({ children }: { children: ReactNode }) {
  const [userRules, setUserRulesState] = useState('');

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUserRulesState(saved);
    } catch {}
  }, []);

  const setUserRules = (v: string) => {
    setUserRulesState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {}
  };

  return (
    <MasterPromptContext.Provider value={{ userRules, setUserRules }}>
      {children}
    </MasterPromptContext.Provider>
  );
}

export function useMasterPrompt() {
  return useContext(MasterPromptContext);
}
