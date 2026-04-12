import { useState } from 'react';
import API from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const TranslateButton = ({ originalText, onTranslated }) => {
  const { language, t } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const [showingTranslated, setShowingTranslated] = useState(false);

  // Hidden when English is selected, but optionally could remain if source wasn't English.
  // The requirements say: "hidden when language is 'en'"
  if (language === 'en') return null;

  const handleTranslateToggle = async () => {
    // If we've already fetched it, just toggle
    if (translatedText) {
      const displayNow = !showingTranslated;
      setShowingTranslated(displayNow);
      onTranslated(displayNow ? translatedText : originalText);
      return;
    }

    // Need to fetch translation
    setIsTranslating(true);
    try {
      const res = await API.post('/translate', {
        text: originalText,
        targetLang: language
      });
      const newText = res.data.data;
      setTranslatedText(newText);
      setShowingTranslated(true);
      onTranslated(newText);
    } catch (err) {
      console.error('Translation error', err);
      // Fallback
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <button 
      className="btn btn-ghost btn-sm translate-btn" 
      onClick={handleTranslateToggle}
      disabled={isTranslating}
      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginLeft: '0.5rem' }}
    >
      {isTranslating ? `🔄 ${t('translating')}` : 
         showingTranslated ? `👁️ ${t('showOriginal')}` : `🌐 ${t('translate')}`}
    </button>
  );
};

export default TranslateButton;
