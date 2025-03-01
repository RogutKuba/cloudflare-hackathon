// Mock function to simulate fetching crawled pages
export const fetchCrawledPages = async (website: string): Promise<string[]> => {
  // This would be replaced with an actual API call
  return [
    `${website}/docs/getting-started`,
    `${website}/docs/api-reference`,
    `${website}/docs/examples`,
    `${website}/pricing`,
  ];
};

// Mock function to generate script points
export const generateScriptPoints = (personality: string): string[] => {
  // This would be replaced with actual script generation logic
  return [
    `Introduce yourself as a ${personality.toLowerCase()} AI assistant`,
    'Ask about their specific needs regarding the product',
    'Explain key features and benefits',
    'Address common questions about pricing and support',
    'Offer to provide additional resources or documentation',
  ];
};
