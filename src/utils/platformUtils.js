function getPlatformType(url) {
    try {
      const urlObj = new URL(url);
  
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        return 'YouTube';
      }
    } catch (error) {
      console.error("Invalid URL:", url, error);
      return 'Unknown';
    }
  
    return 'Unknown';
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
  