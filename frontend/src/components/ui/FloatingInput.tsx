'use client';

interface FloatingInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}

export default function FloatingInput({ id, label, value, onChange, helperText }: FloatingInputProps) {
  const isFilled = value.length > 0;

  return (
    <div className="self-stretch relative inline-flex flex-col justify-start items-start gap-1">
      <div className="self-stretch h-10 px-2.5 py-3 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2 focus-within:outline-stroke-accent-secondary transition-colors">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isFilled ? '' : label}
          className="flex-1 text-text-primary text-sm font-normal leading-4 line-clamp-1 bg-transparent outline-none placeholder:text-text-tertiary"
        />
      </div>
      {isFilled && (
        <div className="px-1 left-[6px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
          <span className="text-text-tertiary text-xs font-normal leading-4">{label}</span>
        </div>
      )}
      {helperText && (
        <span className="text-text-tertiary text-xs font-light leading-4">{helperText}</span>
      )}
    </div>
  );
}
