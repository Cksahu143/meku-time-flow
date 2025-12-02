const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export const extractUrls = (text: string): string[] => {
  const matches = text.match(URL_REGEX);
  return matches || [];
};

export const fetchLinkPreview = async (url: string): Promise<{
  title?: string;
  description?: string;
  image?: string;
} | null> => {
  try {
    // For now, we'll use a simple approach
    // In production, you'd want to use a proper link preview API or service
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
    });
    
    // Since we can't access the response in no-cors mode,
    // we'll return basic info based on the URL
    const urlObj = new URL(url);
    return {
      title: urlObj.hostname,
      description: url,
      image: undefined,
    };
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return null;
  }
};

export const shouldShowLinkPreview = (message: string): boolean => {
  const urls = extractUrls(message);
  return urls.length > 0 && message.trim().split(/\s+/).length <= 10;
};