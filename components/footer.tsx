import Link from 'next/link'
import { SolidLogo } from './icons'

export function Footer() {
	const botName = 'Tiny Rabbit'
	const brandName = 'Rabbit Tale Studio'
	const currentYear = new Date().getFullYear()

	const companyLinks = [
		{
			label: 'About Us',
			href: '/about',
		},
		{
			label: 'Contact',
			href: '/contact',
		},
		{
			label: 'Privacy Policy',
			href: '/privacy',
		},
	]

	const resourcesLinks = [
		{
			label: 'Documentation',
			href: '/docs',
		},
		{
			label: 'Support',
			href: '/support',
		},
		{
			label: 'Blog',
			href: '/blog',
		},
	]

	const communityLinks = [
		{
			label: 'Discord Server',
			href: '/discord',
		},
		{
			label: 'Twitter',
			href: '/twitter',
		},
		{
			label: 'GitHub',
			href: '/github',
		},
	]

	const footerLinks = [
		{ category: 'Company', links: companyLinks },
		{ category: 'Resources', links: resourcesLinks },
		{ category: 'Community', links: communityLinks },
	]

	return (
		<footer className='bg-primary text-primary-foreground py-10'>
			<div className='container max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between gap-8'>
				{/* Logo and copyright section */}
				<div className='mb-8 md:mb-0 flex flex-col items-center md:items-start justify-between text-center md:text-left'>
					<Link
						href='/'
						className='text-xl font-bold w-fit flex items-center gap-2 hover:opacity-80 transition-opacity'
					>
						<SolidLogo size={40} />
						{botName}
					</Link>
					<p className='text-sm mt-4 md:mt-2 text-primary-foreground/50'>
						© {currentYear} {brandName}. All rights reserved.
					</p>
				</div>

				{/* Links grid */}
				<div className='grid grid-cols-1 sm:grid-cols-3 gap-8 w-full md:w-auto'>
					{footerLinks.map(({ category, links }) => (
						<div
							key={category}
							className='text-center md:text-left min-w-[150px]'
						>
							<h4 className='font-semibold mb-4 text-lg md:text-base'>
								{category}
							</h4>
							<ul className='flex flex-col gap-3 items-center md:items-start'>
								{links.map((link) => (
									<li key={link.href} className='w-fit'>
										<Link
											href={link.href}
											className='text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors duration-300'
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</footer>
	)
}
