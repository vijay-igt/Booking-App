import React from 'react';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  hint,
  error,
  icon,
  id,
  className = '',
  ...props
}) => {
  const inputId = id ?? props.name ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold tracking-wide text-[var(--text-secondary)] uppercase"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] flex items-center justify-center">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`premium-input w-full ${icon ? 'pl-11' : ''} ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
};
