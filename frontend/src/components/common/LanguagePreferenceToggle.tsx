import React, { useState, useEffect } from 'react';
import { Languages, Check } from 'lucide-react';
import { apiClient } from '../../api/client';

interface LanguagePreferenceToggleProps {
  originalLanguage?: string;
  className?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  hi: 'Hindi',
  gu: 'Gujarati',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ar: 'Arabic',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
};

export const LanguagePreferenceToggle: React.FC<LanguagePreferenceToggleProps> = ({
  originalLanguage = 'hi',
  className = '',
}) => {
  const [preference, setPreference] = useState<'en' | 'original'>('en');
  const [isLoading, setIsLoading] = useState(false);

  const langName = LANGUAGE_NAMES[originalLanguage.toLowerCase()] || originalLanguage.toUpperCase();

  useEffect(() => {
    // Fetch initial preference from backend
    apiClient
      .get('/users/preferences')
      .then((res) => {
        if (res.data?.preferred_output_language === originalLanguage) {
          setPreference('original');
        }
      })
      .catch(() => {});
  }, [originalLanguage]);

  const handleToggle = async (choice: 'en' | 'original') => {
    setPreference(choice);
    setIsLoading(true);
    try {
      const targetLang = choice === 'original' ? originalLanguage : 'en';
      await apiClient.patch('/users/preferences', {
        preferred_output_language: targetLang,
      });
    } catch {
      // Ignore network errors in offline test mode
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
          <Languages className="w-4 h-4 text-indigo-500" />
          <span>Output Language</span>
        </div>
        <span className="text-[10px] text-indigo-500 font-medium">Multi-Language</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-lg border border-indigo-100 dark:border-indigo-900">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleToggle('en')}
          className={`flex items-center justify-center gap-1 py-1 px-2.5 rounded-md text-xs font-semibold transition-all ${
            preference === 'en'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          {preference === 'en' && <Check className="w-3 h-3" />}
          English
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleToggle('original')}
          className={`flex items-center justify-center gap-1 py-1 px-2.5 rounded-md text-xs font-semibold transition-all ${
            preference === 'original'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          {preference === 'original' && <Check className="w-3 h-3" />}
          {langName}
        </button>
      </div>
    </div>
  );
};
