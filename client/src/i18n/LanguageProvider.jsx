import { useCallback, useMemo, useState } from 'react';
import { LanguageContext } from './context';
import FIL from './fil';

const STORAGE_KEY = 'aquatrack_lang';

// English / Filipino switch. `t(text)` returns the Filipino wording when
// Filipino is on and the dictionary has it, otherwise the English text.
export default function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => (localStorage.getItem(STORAGE_KEY) === 'fil' ? 'fil' : 'en'));

  const setLang = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === 'fil' ? 'fil' : 'en';
    setLangState(next);
  }, []);

  const t = useCallback((text) => (lang === 'fil' && typeof text === 'string' && FIL[text]) || text, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
