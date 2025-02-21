"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useRef, useState } from "react";

type BotStats = {
	servers: number;
	birthday_messages: number;
	starboard_posts: number;
	temp_channels: number;
	tickets_opened: number;
	total_xp: number;
};

export const Counters = () => {
	const [data, setData] = useState<BotStats | null>(null);
	const [status, setStatus] = useState<"loading" | "error" | "success">(
		"loading",
	);

	// ✅ Pobieramy dane z cookies/API
	useEffect(() => {
		const fetchData = async () => {
			try {
				const res = await fetch("/api/stats");
				if (!res.ok) throw new Error("Failed to fetch");
				const json = await res.json();
				setData(json);
			} catch (err) {
				console.error("❌ Error loading data:", err);
				setStatus("error");
			} finally {
				setStatus("success");
			}
		};
		fetchData();
	}, []);

	// ✅ Intersection Observer dla animacji liczników
	const countersRef = useRef<HTMLDivElement>(null);
	const hasAnimated = useRef(false);
	const [displayStats, setDisplayStats] = useState([
		{ value: 0, label: "Gained XP" },
		{ value: 0, label: "Servers" },
		{ value: 0, label: "Starboards" },
		{ value: 0, label: "Tickets" },
	]);

	useEffect(() => {
		if (!countersRef.current || !data || hasAnimated.current) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setDisplayStats([
						{ value: data.total_xp, label: "Gained XP" },
						{ value: data.servers, label: "Servers" },
						{ value: data.starboard_posts, label: "Starboards" },
						{ value: data.tickets_opened, label: "Tickets" },
					]);
					hasAnimated.current = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.7 },
		);

		observer.observe(countersRef.current);

		return () => observer.disconnect(); // Cleanup observer
	}, [data]);

	// ✅ Obsługa błędów
	if (status === "error") {
		return (
			<section className="py-10 bg-primary flex justify-center items-center">
				<div className="text-center">
					<p className="text-xl text-red-500">Failed to load stats.</p>
				</div>
			</section>
		);
	}

	// ✅ Obsługa ładowania
	if (status === "loading" || !data) {
		return (
			<section className="py-10 bg-primary flex justify-center items-center">
				<div className="text-center">
					<p className="text-xl text-muted-foreground">Loading...</p>
				</div>
			</section>
		);
	}

	// ✅ Renderowanie końcowe
	return (
		<section ref={countersRef} className="py-10 bg-primary">
			<div className="max-w-6xl mx-auto px-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
					{displayStats.map((stat) => (
						<div key={stat.label} className="group relative p-5 rounded-xl">
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
