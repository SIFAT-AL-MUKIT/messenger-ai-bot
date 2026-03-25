const mongoose = require('mongoose');

// ডাটাবেসের ছাঁচ (Schema)
const chatSchema = new mongoose.Schema({
    senderId: { type: String, required: true, unique: true },
    messages:[
        {
            role: { type: String, required: true },
            content: { type: String, required: true }
        }
    ]
});

const Chat = mongoose.model('Chat', chatSchema);

// MongoDB কানেকশন
async function connectDB() {
    try {
        if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('ekhane_mongodb_url_bosbe')) {
            console.log('⚠️ MongoDB URI সেট করা নেই। মেমরি সেভ হবে না, তবে চ্যাটবট কাজ করবে।');
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 MongoDB Connected Successfully!');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
    }
}

// চ্যাট হিস্ট্রি তুলে আনা (লাস্ট ১০টি)
async function getChatHistory(senderId) {
    try {
        const chat = await Chat.findOne({ senderId });
        if (chat && chat.messages) {
            return chat.messages.slice(-10); 
        }
        return[];
    } catch (err) {
        console.error('Error getting chat history:', err);
        return[];
    }
}

// নতুন মেসেজ ডাটাবেসে সেভ করা
async function saveMessage(senderId, role, content) {
    try {
        await Chat.findOneAndUpdate(
            { senderId },
            { $push: { messages: { role, content } } },
            { upsert: true, returnDocument: 'after' }
        );
    } catch (err) {
        console.error('Error saving message:', err);
    }
}

// চ্যাট হিস্ট্রি মুছে ফেলা (/clear কমান্ডের জন্য)
async function clearHistory(senderId) {
    try {
        await Chat.findOneAndDelete({ senderId });
        return true;
    } catch (err) {
        console.error('Error clearing history:', err);
        return false;
    }
}

// অন্য ফাইল থেকে যাতে এই ফাংশনগুলো ব্যবহার করা যায়
module.exports = {
    connectDB,
    getChatHistory,
    saveMessage,
    clearHistory
};