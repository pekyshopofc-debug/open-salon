import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  photoUrl?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-16 w-16 text-xl",
};

export function Avatar({ name, photoUrl, color, size = "md", className }: AvatarProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold text-white",
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor: color || "#7c3aed" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
