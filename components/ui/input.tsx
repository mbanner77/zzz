"use client";

import { JSX } from "react";

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "date" | "datetime-local" | "time";
  label?: string;
  error?: string;
  className?: string;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  label,
  error,
  className = "",
}: InputProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="block text-sm font-medium text-zinc-400">
          {label}
        </label>
      ) : null}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-zinc-900 border rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
          error ? "border-red-500" : "border-zinc-800 focus:border-blue-500"
        } ${className}`}
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}