import { Button } from "./ui/button";
import Link from "next/link";
import { SolidDiscord, SolidLogo } from "./icons";

export function CTA() {
	return (
		<section id="cta" data-theme="dark" className="w-full bg-[#5865F2] py-16">
			<div className="container mx-auto text-center">
				<h2 className="text-3xl font-bold mb-6 text-white">
					Ready to Boost Your Discord Server?
				</h2>
				<Button asChild variant="secondary" size="xl">
					<Link href="/dashboard">
						Add to Discord
						<SolidLogo />
					</Link>
				</Button>
			</div>
		</section>
	);
}
