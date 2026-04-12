import { createContext, useState, useEffect, useContext } from 'react';
import API from '../utils/api';
import { translations } from '../i18n';
import { useAuth } from './AuthContext';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Default to localStorage or 'en'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('migrahealth_lang') || 'en';
  });

  // Sync from user profile on login
  useEffect(() => {
    if (user && user.language) {
      setLanguage(user.language);
      localStorage.setItem('migrahealth_lang', user.language);
    }
  }, [user]);

  const changeLanguage = (code) => {
    setLanguage(code);
    localStorage.setItem('migrahealth_lang', code);
    
    // Background sync with profile if logged in
    if (user) {
      API.put('/patients/profile', { language: code }).catch(err => {
        console.error('Failed to sync language choice', err);
      });
    }
  };

  const t = (key) => {
    // If the key exists in current language, return it. Else fallback to English.
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
