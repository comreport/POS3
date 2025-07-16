import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getTranslation } from '../utils/translations';

interface LanguageContextType {
  language: 'en' | 'my';
  setLanguage: (lang: 'en' | 'my') => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'en' | 'my'>('en'); // Default to English

  useEffect(() => {
    const savedLanguage = localStorage.getItem('pos_language') as 'en' | 'my';
    if (savedLanguage) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    // Font is now applied globally via CSS, no need for conditional application
  }, [language]);

  const setLanguage = (lang: 'en' | 'my') => {
    setLanguageState(lang);
    localStorage.setItem('pos_language', lang);
  };

  const t = (key: string, params?: Record<string, any>) => {
    return getTranslation(key, language, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};