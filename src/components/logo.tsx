import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  subtitle?: string;
}

export function BrandLogo({
  className,
  showText = true,
  subtitle,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600 text-lg font-semibold text-white shadow-lg">
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 text-white">
          <path
            fill="currentColor"
            d="M11.2 2.2c.5-.3 1.1-.3 1.6 0l8.1 4.7c.5.3.8.8.8 1.3v9.4c0 .6-.3 1.1-.8 1.3l-8.1 4.7c-.5.3-1.1.3-1.6 0l-8.1-4.7c-.5-.3-.8-.8-.8-1.3V8.2c0-.6.3-1.1.8-1.3l8.1-4.7Zm.8 2.3-6.5 3.7v7.4l6.5 3.7 6.5-3.7V8.2l-6.5-3.7Z"
          />
        </svg>
      </span>
      {showText && (
        <div className="flex flex-col">
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            AI Study Buddy
          </span>
          {subtitle && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
