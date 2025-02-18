export type FeatureItem = {
    title: string;
    description: string;
    path?: string;
    image?: string;
    icon?: string;
    layout: 'card' | 'list-item';  // Add layout type
    gridPosition?: {  // Add grid positioning
        row?: number;
        col?: number;
        span?: number;
    };
};

export const navigationConfig = [
  {
    name: "Features",
    path: "/features",
    features: [
      {
        title: "Analytics Dashboard",
        description: "Track your server's growth and engagement",
        path: "/features/analytics",
        image: "/images/analytics.jpg",
        layout: "card",
        gridPosition: { row: 1, col: 1, span: 2 }
      },
      {
        title: "Server Insights",
        description: "Get detailed insights about your community",
        path: "/features/insights",
        image: "/images/insights.jpg",
        type: "image"
      },
      // ... rest of features items
    ]
  },
  // ... other navigation categories
];
