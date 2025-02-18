"use client";

import { useState, useEffect, useRef } from "react";
import NumberFlow from "@number-flow/react";

export const Counters = () => {
	const [stats, setStats] = useState([
		{
			value: 0,
			label: "Gained XP",
		},
		{
			value: 0,
			label: "Servers",
		},
		{
			value: 0,
			label: "Starboards",
		},
		{
			value: 0,
			label: "Tickets",
		},
	]);

	const countersRef = useRef<HTMLDivElement>(null);
	const hasAnimated = useRef(false);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && !hasAnimated.current) {
						setStats([
							{
								value: 23000000,
								label: "Gained XP",
							},
							{
								value: 300000,
								label: "Servers",
							},
							{
								value: 2000000,
								label: "Starboards",
							},
							{
								value: 24000000,
								label: "Tickets",
							},
						]);
						hasAnimated.current = true;
						observer.disconnect();
					}
				}
			},
			{
				threshold: 0.7, // Trigger when 70% of the component is visible
			},
		);

		if (countersRef.current) {
			observer.observe(countersRef.current);
		}

		return () => {
			if (countersRef.current) {
				observer.unobserve(countersRef.current);
			}
		};
	}, []);

	return (
		<section ref={countersRef} className="py-10 bg-primary row-start-3">
			<div className="grid grid-cols-1 md:grid-cols-4 max-w-6xl mx-auto">
				{stats.map((stat) => (
					<div
						key={stat.label}
						className="group relative p-4 rounded-xl transition-all duration-300 hover:bg-primary-foreground/10 min-w-[250px]"
					>
						<div className="h-1 mb-3 rounded-full transition-all duration-300 bg-primary-foreground/10 w-8 group-hover:w-16 group-hover:bg-primary-foreground" />
						<div className="space-y-1">
							<NumberFlow
								value={stat.value}
								willChange
								className="block text-primary-foreground text-2xl md:text-3xl font-bold transition-transform duration-300 group-hover:scale-110 group-hover:translate-x-3 tabular-nums"
							/>
							<p className="text-sm text-muted-foreground">{stat.label}</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
};
