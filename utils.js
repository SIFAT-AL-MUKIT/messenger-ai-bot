const axios = require('axios');

// ছবি URL → Base64
async function imageUrlToBase64(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024
        });
        const mime = response.headers['content-type'] || 'image/jpeg';
        const b64 = Buffer.from(response.data).toString('base64');
        console.log(`✅ Image fetched: ${(response.data.byteLength / 1024).toFixed(1)}KB`);
        return `data:${mime};base64,${b64}`;
    } catch (error) {
        console.error('❌ Image fetch error:', error.message);
        return null;
    }
}

module.exports = { imageUrlToBase64 };
