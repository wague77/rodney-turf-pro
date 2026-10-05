import Image from "next/image";
import rodneyLogo from "@/assets/rodney-turf-logo-concept-1.png";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className = "", priority = false }: BrandLogoProps) {
  return (
    <Image
      src={rodneyLogo}
      alt="Rodney Turf Pro"
      width={1536}
      height={768}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}