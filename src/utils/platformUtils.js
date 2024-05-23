function getPlatformType(url) {
  try {
    // Ensure that the URL is treated as a string
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // Prepend "https://" to the URL if it doesn't include it
    const fullUrl = urlString.startsWith('http') ? urlString : `https://${urlString}`;

    const urlObj = new URL(fullUrl);

    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      return 'YouTube';
    } else {
      return 'Unknown';
    }
  } catch (error) {
    console.error("Invalid URL:", url, error);
    return 'Invalid';
  }
}

function getYouTubeVideoID(url) {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);
    return searchParams.get('v') || urlObj.pathname.split('/').pop();
  } catch (error) {
    console.error("Invalid URL:", url, error);
    return null;
  }
}

module.exports = { getPlatformType, getYouTubeVideoID };
