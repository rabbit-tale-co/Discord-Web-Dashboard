import { IconProps } from "./index";

export const Icon = ({ type, size = 24, className }: { type: string } & IconProps) => {
  switch(type) {
    case 'arrow-right':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
          <path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6l-1.41-1.41z"/>
        </svg>
      );
    case 'logo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
          {/* Your logo path here */}
        </svg>
      );
    default:
      return null;
  }
}
