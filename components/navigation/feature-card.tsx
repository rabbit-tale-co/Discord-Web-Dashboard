// FeatureCard.tsx
import Link from "next/link";
import Image from "next/image";
import type { Item, NavItem } from "@/types/navigation";
import { SolidArrowRight, SolidLogo } from "@/components/icons";

interface FeatureCardProps {
	item: NavItem;
	isFocused: boolean;
	"data-menu-item"?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
	item,
	isFocused,
	...props
}) => {
	if (item.type === "large") {
		return (
			<Link
				href={item.url || "#"}
				className="group relative flex items-center overflow-hidden rounded-lg bg-neutral-900 hover:bg-neutral-800 focus:bg-neutral-800 animate-fadeSm"
				style={{
					width:
						item.type === "large" && item.minWidth
							? `${item.minWidth}px`
							: "280px",
					minHeight: item.minHeight || "264px",
				}}
				{...props}
			>
				<div className="absolute inset-0 opacity-70 transition-transform duration-400 ease-out group-hover:scale-105 group-hover:opacity-100">
					{item.image ? (
						<Image
							src={item.image}
							alt={item.title}
							fill
							style={{ objectFit: "cover" }}
						/>
					) : (
						<div className="flex h-full items-center justify-center bg-neutral-900">
							<SolidLogo
								size={120}
								className="text-primary-foreground opacity-50"
							/>
						</div>
					)}
				</div>
				<div className="absolute bottom-0 w-full bg-gradient-to-t from-neutral-900 to-neutral-900/0 p-4">
					<p className="text-base font-semibold text-neutral-100">
						{item.title}
					</p>
					<p className="text-sm font-normal text-white/65">
						{item.description}
					</p>
				</div>
				<div className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
					<span className="relative flex size-5 items-center justify-center overflow-hidden *:transition-transform *:duration-[400ms] *:ease-bounce">
						<SolidArrowRight
							size={22}
							className="absolute -translate-x-5 group-active:translate-x-0 sm:group-hover:translate-x-0 sm:group-focus:translate-x-0 group-focus-visible:translate-x-0 rotate-0"
						/>
						<SolidArrowRight
							size={22}
							className="group-active:translate-x-5 sm:group-hover:translate-x-5 group-focus-visible:translate-x-5 rotate-0"
						/>
					</span>
				</div>
			</Link>
		);
	}

	return (
		<Link
			href={item.url || "#"}
			className={`group flex h-[76px] shrink-0 items-center gap-6 rounded-lg p-2.5 pr-4 bg-neutral-900 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none transition-colors duration-200 animate-fadeSm ${
				isFocused ? "ring-2 ring-primary" : ""
			}`}
			style={{
				width: item.minWidth ? `${item.minWidth}px` : "280px",
			}}
			{...props}
		>
			<div className="relative *:h-10 *:w-9 *:rounded-lg *:transition-transform *:duration-200 *:ease-bigBounce">
				<div className="absolute left-1.5 top-0 rotate-[16deg] bg-neutral-400 group-hover:-translate-x-1 group-hover:-rotate-[8deg] group-focus:-translate-x-1 group-focus:-rotate-[8deg]" />
				<div className="relative flex items-center justify-center bg-neutral-100 text-neutral-700 group-hover:translate-x-1.5 group-hover:rotate-[16deg] group-focus:translate-x-1.5 group-focus:rotate-[16deg]">
					{item.icon ? <item.icon size={22} /> : <SolidLogo size={22} />}
				</div>
			</div>
			<div>
				<p className="text-base font-semibold text-neutral-100">{item.title}</p>
				<p className="text-sm font-normal text-neutral-400">
					{item.description}
				</p>
			</div>
		</Link>
	);
};
