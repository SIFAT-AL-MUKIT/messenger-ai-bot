const axios = require('axios');

// ═══════════════════════════════════════
// ★ সহজ টেক্সট প্রসেসর
// ═══════════════════════════════════════
// Gemini নিজেই বুঝে — শুধু basic cleanup

function cleanText(text) {
    if (!text) return '';

    return text
        // অতিরিক্ত blank lines কমানো
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ═══════════════════════════════════════
// ছবি → Base64
// ═══════════════════════════════════════

async function imageUrlToBase64(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024
        });
        const mime = response.headers['content-type'] || 'image/jpeg';
        const b64 = Buffer.from(response.data).toString('base64');
        console.log(`✅ Image: ${(response.data.byteLength / 1024).toFixed(1)}KB`);
        return `data:${mime};base64,${b64}`;
    } catch (error) {
        console.error('❌ Image error:', error.message);
        return null;
    }
}

module.exports = { cleanText, imageUrlToBase64 };