const axios = require('axios');
const removeMd = require('remove-markdown');

// ১. মার্কডাউন রিমুভ করার ফাংশন (যাতে মেসেঞ্জারে সুন্দরভাবে টেক্সট যায়)
function cleanText(text) {
    if (!text) return '';
    // remove-markdown প্যাকেজটি সব *, #, ` মুছে ক্লিন টেক্সট দিবে
    return removeMd(text);
}

// ২. ছবির URL থেকে Base64 তৈরি করার ফাংশন (AI-কে ছবি দেখানোর জন্য)
async function imageUrlToBase64(url) {
    try {
        // Axios দিয়ে ছবিটা ArrayBuffer হিসেবে ডাউনলোড করা
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        
        // ছবির টাইপ (যেমন: image/jpeg) বের করা
        const mimeType = response.headers['content-type'];
        
        // Buffer থেকে Base64 এ কনভার্ট করা
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        
        // OpenRouter এর ফরম্যাট অনুযায়ী Data URL বানিয়ে রিটার্ন করা
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error('❌ Error converting image to base64:', error.message);
        return null;
    }
}

module.exports = {
    cleanText,
    imageUrlToBase64
};