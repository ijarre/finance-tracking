import { cn } from "@/lib/utils";

interface LoadingStateProps {
  className?: string;
  text?: string;
}

export function LoadingState({
  className,
  text = "Loading...",
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 space-y-4 min-h-[200px]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <div className="w-4 h-4 rounded-full bg-secondary animate-bounce [animation-delay:-0.15s]" />
        <div className="w-4 h-4 rounded-full bg-tertiary animate-bounce" />
      </div>
      <p className="text-muted-foreground font-medium animate-pulse">{text}</p>
    </div>
  );
}
