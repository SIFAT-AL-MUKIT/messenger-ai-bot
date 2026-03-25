const axios = require('axios');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// মেসেঞ্জারে মেসেজ পাঠানোর ফাংশন
async function sendTextMessage(senderId, text) {
    // যদি টোকেন না থাকে, তবে শুধু টার্মিনালে দেখাবে (Testing mode)
    if (!PAGE_ACCESS_TOKEN || PAGE_ACCESS_TOKEN.includes('ekhane_facebook')) {
        console.log(`\n[💬 BOT REPLY to ${senderId}]:\n${text}\n`);
        return;
    }

    // মেসেঞ্জারের ২০০০ ক্যারেক্টার লিমিটের জন্য চাংকিং (Chunking)
    const maxLength = 1950; // একটু সেফ মার্জিন রাখলাম
    let chunks =[];
    
    for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
    }

    // টুকরো করা মেসেজগুলো এক এক করে মেসেঞ্জারে পাঠানো
    for (let i = 0; i < chunks.length; i++) {
        try {
            await axios.post(
                `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
                {
                    recipient: { id: senderId },
                    message: { text: chunks[i] }
                }
            );
            console.log(`✅ Message sent to ${senderId} (Part ${i + 1}/${chunks.length})`);
        } catch (error) {
            console.error('❌ Error sending message to Facebook:', error.response ? error.response.data : error.message);
        }
    }
}

module.exports = { sendTextMessage };