const { getPlatformType } = require("./platformUtils")

const generateMessage = (username, text) =>{
    return{
        username,
        text,
        createdAt: new Date().getTime()
    }
}
const generateLocationMessage = (username, url) =>{
    return{
        username,
        url,
        createdAt: new Date().getTime()
    }
}

const generateVideoMessage = (username, videos, platform) => {
    return {
      username,
      videos,
      platform,
      createdAt: new Date().getTime()
    };
  };
  
module.exports = {
    generateMessage, generateLocationMessage, generateVideoMessage,getPlatformType
} 