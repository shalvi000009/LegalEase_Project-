import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface PhoneInputProps {
  value: string | null;
  onChange: (phone: string | null) => void;
  error?: string;
}

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', name: 'US / Canada' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
];

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, error: externalError }) => {
  // Parse country code and national number from value
  const defaultCountry = COUNTRY_CODES.find((c) => value?.startsWith(c.code)) || COUNTRY_CODES[0];
  const defaultNum = value ? value.replace(defaultCountry.code, '').trim() : '';

  const [countryCode, setCountryCode] = useState(defaultCountry.code);
  const [phoneNumber, setPhoneNumber] = useState(defaultNum);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (value) {
      const found = COUNTRY_CODES.find((c) => value.startsWith(c.code));
      if (found) {
        setCountryCode(found.code);
        setPhoneNumber(value.replace(found.code, '').trim());
      } else {
        setPhoneNumber(value);
      }
    }
  }, [value]);

  const validatePhone = (num: string): boolean => {
    if (!num.trim()) {
      setValidationError(null);
      return true;
    }
    // Simple international phone format check (digits, spaces, hyphens, min 7 digits)
    const cleanDigits = num.replace(/[\s-]/g, '');
    if (!/^\d{7,14}$/.test(cleanDigits)) {
      setValidationError('Please enter a valid phone number (7 to 14 digits).');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPhoneNumber(raw);
    setIsVerified(false);

    if (validatePhone(raw)) {
      if (raw.trim()) {
        const fullPhone = `${countryCode} ${raw.trim()}`;
        onChange(fullPhone);
      } else {
        onChange(null);
      }
    } else {
      onChange(null);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    if (phoneNumber.trim() && validatePhone(phoneNumber)) {
      onChange(`${newCode} ${phoneNumber.trim()}`);
    }
  };

  const handleVerify = () => {
    if (!phoneNumber.trim()) {
      setValidationError('Please enter a phone number to verify.');
      return;
    }
    if (!validatePhone(phoneNumber)) return;

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      toast.success(`Verification code sent to ${countryCode} ${phoneNumber}. (Demo mode: Auto-verified!)`);
    }, 1200);
  };

  const displayError = validationError || externalError;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        Mobile Phone Number for SMS Reminders
      </label>

      <motion.div
        animate={displayError ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row items-stretch gap-2"
      >
        <div className="flex-1 flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden shadow-xs">
          {/* Country selector */}
          <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={countryCode}
              onChange={handleCountryChange}
              className="bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Input field */}
          <input
            type="tel"
            value={phoneNumber}
            onChange={handleNumChange}
            placeholder="555-0199"
            className="flex-1 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-transparent placeholder-slate-400 focus:outline-none"
          />

          {isVerified && (
            <div className="pr-3 flex items-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Verify button */}
        <button
          type="button"
          onClick={handleVerify}
          disabled={!phoneNumber.trim() || isVerifying || isVerified}
          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            isVerified
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 cursor-default'
              : phoneNumber.trim() && !displayError
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isVerifying ? 'Verifying...' : isVerified ? 'Verified' : 'Verify'}</span>
        </button>
      </motion.div>

      {displayError ? (
        <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium pt-0.5">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{displayError}</span>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">
          Standard SMS rates may apply. You will only receive contract reminder alerts.
        </p>
      )}
    </div>
  );
};
