import type { SVGProps } from 'react'

/**
 * Props for the Icon component
 */
export interface IconProps extends SVGProps<SVGSVGElement> {
	className?: string
	size?: number
}

export * from './assets/logo/logo'
export * from './assets/logo/logo_text'
export * from './assets/arrows/ArrowLeft'
export * from './assets/arrows/ArrowRight'
export * from './assets/arrows/Repeat'
