export type FeatureItem = {
    title: string;
    description: string;
    path?: string;
    image?: string;
    icon?: string;
    layout?: 'card' | 'list';
};

export type NavItem = {
    name: string;
    path: string;
    features?: FeatureItem[];
};

export const navigationItems: NavItem[] = [
    {
        name: "Features",
        path: "/features",
        features: [
            {
                title: "Analytics Dashboard",
                description: "Track your server's growth and engagement",
                path: "/features/analytics",
                image: "/images/analytics.jpg",
                layout: "card"
            },
            // ... rest of features
        ]
    },
    // ... other nav items
];
