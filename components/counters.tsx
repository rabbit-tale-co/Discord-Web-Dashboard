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
		const current = countersRef.current;
		if (!current) return;

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
				threshold: 0.3, // Trigger when 30% of the component is visible
			},
		);

		observer.observe(current);

		return () => {
			if (current) {
				observer.unobserve(current);
			}
		};
	}, []);

	return (
		<section
			id="counters"
			data-theme="dark"
			ref={countersRef}
			className="py-10 bg-primary"
		>
			<div className="max-w-6xl mx-auto px-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
					{stats.map((stat) => (
						<div key={stat.label} className="group max relative p-5 rounded-xl">
							{/* <div className="h-1 max-sm:hidden mb-4 rounded-full bg-primary-foreground w-12 group-hover:w-24 transition-all duration-300" /> */}
							<div className="space-y-2 text-center">
								<NumberFlow
									value={stat.value}
									willChange
									className="text-primary-foreground text-3xl sm:text-4xl font-bold tabular-nums"
								/>
								<p className="text-sm sm:text-base text-muted-foreground">
									{stat.label}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};
