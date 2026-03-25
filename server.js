require('dotenv').config();
const express = require('express');

// আমাদের তৈরি করা ফাইলগুলো ইম্পোর্ট করা
const db = require('./database');
const utils = require('./utils');
const messenger = require('./messenger');
const openRouter = require('./openrouter');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// ডাটাবেস কানেক্ট করা
db.connectDB();

// ১. Webhook Verification
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WEBHOOK_VERIFIED by Facebook');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// ২. Receiving Messages
app.post('/webhook', async (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        
        // ফেসবুককে সাথে সাথে 200 OK পাঠিয়ে দেওয়া
        res.status(200).send('EVENT_RECEIVED');

        body.entry.forEach(async function(entry) {
            let webhook_event = entry.messaging[0];
            let sender_psid = webhook_event.sender.id;

            if (sender_psid === process.env.ADMIN_SENDER_ID || !process.env.ADMIN_SENDER_ID) {
                if (webhook_event.message) {
                    
                    let userText = webhook_event.message.text || "";
                    let base64Image = null;

                    // কমান্ড চেক করা (/clear)
                    if (userText.trim() === '/clear') {
                        await db.clearHistory(sender_psid);
                        await messenger.sendTextMessage(sender_psid, "✅ আপনার আগের সব চ্যাট মেমরি মুছে ফেলা হয়েছে!");
                        return; // এখানেই কাজ শেষ
                    }

                    // মেসেজে কোনো ছবি আছে কিনা চেক করা
                    if (webhook_event.message.attachments) {
                        let attachment = webhook_event.message.attachments[0];
                        if (attachment.type === 'image') {
                            console.log('📷 Image received! Converting to Base64...');
                            let imageUrl = attachment.payload.url;
                            base64Image = await utils.imageUrlToBase64(imageUrl);
                        }
                    }

                    // যদি মেসেজ বা ছবি থাকে, তবে প্রসেস করা
                    if (userText || base64Image) {
                        
                        // ১. ডাটাবেস থেকে লাস্ট ১০টা মেসেজ আনা
                        let chatHistory = await db.getChatHistory(sender_psid);

                        // ২. AI এর কাছে রিকোয়েস্ট পাঠানো
                        let aiReply = await openRouter.getAiResponse(chatHistory, userText, base64Image, sender_psid);

                        // ৩. মার্কডাউন মুছে টেক্সট সুন্দর করা
                        let cleanReply = utils.cleanText(aiReply);

                        // ৪. ডাটাবেসে নতুন মেসেজগুলো সেভ করা (ইউজারের মেসেজ এবং AI এর রিপ্লাই)
                        if (userText) await db.saveMessage(sender_psid, 'user', userText);
                        await db.saveMessage(sender_psid, 'assistant', cleanReply);

                        // ৫. মেসেঞ্জারে পাঠানো
                        await messenger.sendTextMessage(sender_psid, cleanReply);
                    }
                }
            }
        });
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});