import { useLanguage } from '../context/LanguageContext';
import { languageOptions } from '../i18n';

const LanguageSwitcher = ({ compact = false }) => {
  const { language, changeLanguage, t } = useLanguage();

  if (compact) {
    return (
      <select 
        className="lang-select" 
        value={language} 
        onChange={(e) => changeLanguage(e.target.value)}
        aria-label={t('selectLanguage')}
      >
        {languageOptions.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label} ({opt.nativeLabel})
          </option>
        ))}
      </select>
    );
  }

  // Button group for settings page (if needed later)
  return (
    <div className="lang-switcher-group">
      <h4>{t('switchLanguage')}</h4>
      <div className="btn-group">
        {languageOptions.map((opt) => (
          <button
            key={opt.code}
            className={`btn ${language === opt.code ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => changeLanguage(opt.code)}
          >
            {opt.nativeLabel}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
