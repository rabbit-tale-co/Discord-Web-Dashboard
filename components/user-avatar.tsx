"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/app/authContext";
import type { SessionData } from "@/types/index";
import Link from "next/link";
// import { useEffect } from "react";
// import { Progress } from "@/components/ui/progress";

export const UserAvatar = ({ user }: { user: SessionData["user"] }) => {
	const { logout } = useAuth();
	// const [isClicked, setIsClicked] = useState(false);
	// const [isHolding, setIsHolding] = useState<boolean>(false);
	// const [progress, setProgress] = useState<number>(0);
	// const holdTimer = useRef<ReturnType<typeof setInterval> | undefined>(
	// 	undefined,
	// );
	// const [isMenuOpen, setIsMenuOpen] = useState(false);

	// useEffect(() => {
	// 	return () => {
	// 		if (holdTimer.current) {
	// 			clearInterval(holdTimer.current as unknown as number);
	// 		}
	// 	};
	// }, []);

	// useEffect(() => {
	// 	if (!isMenuOpen) {
	// 		setIsClicked(false);
	// 		setIsHolding(false);
	// 		setProgress(0);
	// 		if (holdTimer.current) {
	// 			clearInterval(holdTimer.current as unknown as number);
	// 		}
	// 	}
	// }, [isMenuOpen]);

	const isGif = user.avatar.startsWith("a_");
	const avatarUrl = isGif
		? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.gif`
		: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`;

	// const handleMouseDown = () => {
	// 	if (!isClicked) {
	// 		setIsClicked(true);
	// 		return;
	// 	}

	// 	if (!isHolding) {
	// 		setIsHolding(true);
	// 		setProgress(0);
	// 		holdTimer.current = setInterval(() => {
	// 			setProgress((prev) => {
	// 				const newProgress = prev + 3.33;
	// 				if (newProgress >= 100) {
	// 					clearInterval(holdTimer.current as unknown as number);
	// 					logout();
	// 					return 0;
	// 				}
	// 				return newProgress;
	// 			});
	// 		}, 100);
	// 	}
	// };

	// const handleMouseUp = () => {
	// 	if (isHolding) {
	// 		if (holdTimer.current) {
	// 			clearInterval(holdTimer.current as unknown as number);
	// 		}
	// 		setIsHolding(false);
	// 		setProgress(0);
	// 	}
	// };

	return (
		<DropdownMenu>
			{/* onOpenChange={setIsMenuOpen} */}
			<DropdownMenuTrigger asChild>
				<Avatar
					//tabIndex={0} TODO: open dropdown on focus
					className="cursor-pointer group max-md:hidden"
				>
					<AvatarImage
						src={avatarUrl}
						className="group-hover:scale-110 transition-all duration-300"
					/>
					<AvatarFallback>{user.username.slice(0, 2)}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild>
					<Link href="/servers">My Servers</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
				{/* <DropdownMenuItem
					className="relative bg-destructive hover:!bg-destructive/90 hover:!text-destructive-foreground text-destructive-foreground overflow-hidden"
					onMouseDown={(e) => {
						e.preventDefault();
						handleMouseDown();
					}}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					onSelect={(e) => e.preventDefault()}
				>
					{isHolding && (
						<Progress
							className="absolute data-[slot=progress-indicator]:bg-destructive/40 left-0 bottom-0 h-1 transition-all"
							value={progress}
						/>
					)}
					{isClicked ? "Hold to confirm..." : "Logout"}
				</DropdownMenuItem> */}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
