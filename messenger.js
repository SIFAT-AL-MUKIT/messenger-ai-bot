const axios = require('axios');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GRAPH_API = 'https://graph.facebook.com/v19.0/me/messages';

async function callSendAPI(senderId, data) {
    if (!PAGE_ACCESS_TOKEN) {
        console.log(`[🤖 BOT]: ${JSON.stringify(data, null, 2)}`);
        return;
    }
    try {
        await axios.post(
            `${GRAPH_API}?access_token=${PAGE_ACCESS_TOKEN}`,
            { recipient: { id: senderId }, ...data },
            { timeout: 10000 }
        );
    } catch (error) {
        console.error('❌ Send API:', error.response?.data?.error?.message || error.message);
    }
}

// সাধারণ টেক্সট পাঠানো
async function sendTextMessage(senderId, text) {
    if (!PAGE_ACCESS_TOKEN) {
        console.log(`\n[💬 BOT]:\n${text}\n`);
        return;
    }
    const chunks = smartChunk(text, 1950);
    for (let i = 0; i < chunks.length; i++) {
        await callSendAPI(senderId, { message: { text: chunks[i] } });
        if (i < chunks.length - 1) await sleep(500);
    }
}

// Quick Reply বাটন
async function sendQuickReplies(senderId, text, replies) {
    await callSendAPI(senderId, {
        message: {
            text: text,
            quick_replies: replies.map(r => ({
                content_type: 'text',
                title: r.title.substring(0, 20),
                payload: r.payload || r.title
            }))
        }
    });
}

// Button Template
async function sendButtonTemplate(senderId, text, buttons) {
    await callSendAPI(senderId, {
        message: {
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'button',
                    text: text,
                    buttons: buttons
                }
            }
        }
    });
}

// ছবি পাঠানো
async function sendImage(senderId, imageUrl) {
    await callSendAPI(senderId, {
        message: {
            attachment: {
                type: 'image',
                payload: { url: imageUrl, is_reusable: true }
            }
        }
    });
}

// Typing indicators
async function sendTypingOn(senderId) {
    await callSendAPI(senderId, { sender_action: 'typing_on' });
}
async function sendTypingOff(senderId) {
    await callSendAPI(senderId, { sender_action: 'typing_off' });
}

// স্মার্ট চাংকিং
function smartChunk(text, maxLength) {
    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }
        let bp = remaining.lastIndexOf('\n', maxLength);
        if (bp < maxLength * 0.3) bp = remaining.lastIndexOf('।', maxLength);
        if (bp < maxLength * 0.3) bp = remaining.lastIndexOf('. ', maxLength);
        if (bp < maxLength * 0.3) bp = remaining.lastIndexOf(' ', maxLength);
        if (bp < 1) bp = maxLength;

        chunks.push(remaining.substring(0, bp + 1).trim());
        remaining = remaining.substring(bp + 1).trim();
    }
    return chunks.filter(c => c.length > 0);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    sendTextMessage,
    sendQuickReplies,
    sendButtonTemplate,
    sendImage,
    sendTypingOn,
    sendTypingOff
};