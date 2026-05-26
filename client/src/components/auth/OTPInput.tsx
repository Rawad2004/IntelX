"use client";

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export default function OTPInput({ 
  length = 6, 
  onComplete, 
  disabled = false,
  error = false 
}: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Check if complete
  useEffect(() => {
    const code = values.join("");
    if (code.length === length && !values.includes("")) {
      onComplete(code);
    }
  }, [values, length, onComplete]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    // Move to next input
    if (digit && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      
      const newValues = [...values];
      
      if (values[index]) {
        // Clear current
        newValues[index] = "";
        setValues(newValues);
      } else if (index > 0) {
        // Move to previous and clear
        newValues[index - 1] = "";
        setValues(newValues);
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    
    if (pastedData) {
      const newValues = [...values];
      pastedData.split("").forEach((char, i) => {
        if (i < length) newValues[i] = char;
      });
      setValues(newValues);
      
      // Focus last filled or next empty
      const lastIndex = Math.min(pastedData.length, length) - 1;
      focusInput(lastIndex < length - 1 ? lastIndex + 1 : lastIndex);
    }
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`
            h-12 w-10 sm:h-14 sm:w-12 
            rounded-xl text-center text-xl font-bold
            transition-all duration-150
            focus:outline-none focus:ring-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${error 
              ? "border-red-500/50 bg-red-500/10 text-red-400 focus:ring-red-500/50" 
              : "border-white/10 bg-white/5 text-white focus:border-violet-500/50 focus:ring-violet-500/30"
            }
          `}
          style={{
            border: error ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </div>
  );
}