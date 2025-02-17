import type React from 'react'
import type { IconProps } from '@/components/icons/index'

export const SolidLogo: React.FC<IconProps> = ({ className, size }) => (
	<svg
		width={size}
		height={size}
		viewBox='0 0 24 24'
		fill='none'
		xmlns='http://www.w3.org/2000/svg'
		className={className}
		aria-label='Rabbit Tale Studio'
		aria-hidden='true'
	>
		<path
			fillRule='evenodd'
			clipRule='evenodd'
			d='M15.681 12.732a.716.716 0 0 1-.226-1.139A15.765 15.765 0 0 0 18.2 7.521a4.111 4.111 0 0 0-1.147-4.943.794.794 0 0 0-1.214.287l-3.403 7.283-.76 1.627a.795.795 0 0 1-.72.458h-.005a.796.796 0 0 1-.77-.997 18.24 18.24 0 0 0 .576-4.558 4.758 4.758 0 0 0-3.81-4.662.794.794 0 0 0-.947.78v16.157A3.047 3.047 0 0 0 9.047 22h5.403a4.364 4.364 0 0 0 4.364-4.364 5.402 5.402 0 0 0-3.133-4.904Zm-5.634 5.658a.856.856 0 0 1-.775-1.218 2.9 2.9 0 0 1 5.263 0 .856.856 0 0 1-.775 1.218h-3.713Z'
			fill='currentColor'
		/>
	</svg>
)
