import { useContext } from 'react';
import { LanguageContext } from './context';

// const { t, lang, setLang } = useT();
export function useT() {
  return useContext(LanguageContext);
}
