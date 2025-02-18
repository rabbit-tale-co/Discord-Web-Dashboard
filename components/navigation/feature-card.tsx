// FeatureCard.tsx
import Link from "next/link";
import Image from "next/image";
import { SolidLogo, SolidArrowRight } from "@/components/icons";

export type Feature = {
	title: string;
	description: string;
	path?: string;
	image?: string;
	icon?: string;
	/** Optional CSS grid-area string so you can control its placement */
	gridArea?: string;
};

interface FeatureCardProps {
	feature: Feature;
	isFocused?: boolean;
	"data-menu-item"?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
	feature,
	isFocused,
	...rest
}) => {
	const isBig = Boolean(feature.image);
	return (
		<Link
			href={feature.path || "#"}
			className={`group relative rounded-lg overflow-hidden focus:outline-none ${
				isBig ? "min-h-[264px] w-full sm:w-[300px]" : "p-2.5"
			} ${isFocused ? "ring-2 ring-primary" : ""}`}
			style={feature.gridArea ? { gridArea: feature.gridArea } : {}}
			tabIndex={-1}
			{...rest}
		>
			{isBig ? (
				<>
					<div className="absolute inset-0 opacity-70 transition-transform duration-400 ease-out group-hover:scale-105 group-hover:opacity-100">
						<Image
							src={feature.image || "/placeholder.svg"}
							alt={feature.title}
							fill
							style={{ objectFit: "cover" }}
						/>
					</div>
					<div className="z-10 w-full self-end bg-gradient-to-t from-neutral-900 to-neutral-900/0 p-2.5 pr-11 pt-8">
						<p className="text-base font-semibold text-neutral-100">
							{feature.title}
						</p>
						<p className="text-sm font-normal text-white/65">
							{feature.description}
						</p>
					</div>
					<div className="absolute bottom-2 right-2 z-10 flex items-center justify-center rounded-full bg-white/10 text-neutral-100 transition-opacity group-hover:opacity-100">
						<SolidArrowRight size={22} />
					</div>
				</>
			) : (
				<div className="flex items-center gap-6">
					<div className="relative h-10 w-9">
						<div className="absolute left-1.5 top-0 rotate-[16deg] bg-neutral-400 group-hover:-translate-x-1 group-hover:-rotate-[8deg]" />
						<div className="relative flex items-center justify-center bg-neutral-100 text-neutral-700 group-hover:translate-x-1.5 group-hover:rotate-[16deg]">
							<SolidLogo size={20} />
						</div>
					</div>
					<div>
						<p className="text-base font-semibold text-neutral-100">
							{feature.title}
						</p>
						<p className="text-sm font-normal text-neutral-400">
							{feature.description}
						</p>
					</div>
				</div>
			)}
		</Link>
	);
};
