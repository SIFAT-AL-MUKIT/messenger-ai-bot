const mongoose = require('mongoose');

const MAX_MESSAGES = 30;

const chatSchema = new mongoose.Schema({
    senderId: { type: String, required: true, unique: true, index: true },
    preferredProvider: { type: String, default: 'google' },  // ★ নতুন
    preferredModel: { type: String, default: null },
    messages: [
        {
            role: { type: String, required: true },
            content: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    updatedAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

let isConnected = false;

async function connectDB() {
    try {
        if (!process.env.MONGODB_URI) {
            console.log('⚠️ MongoDB URI নেই।');
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true;
        console.log('📦 MongoDB Connected!');

        mongoose.connection.on('disconnected', () => {
            isConnected = false;
            console.log('⚠️ MongoDB Disconnected');
        });
        mongoose.connection.on('reconnected', () => {
            isConnected = true;
            console.log('📦 MongoDB Reconnected');
        });
    } catch (err) {
        console.error('❌ MongoDB:', err.message);
    }
}

// ─── Chat History ───

async function getChatHistory(senderId, limit = 10) {
    if (!isConnected) return [];
    try {
        const chat = await Chat.findOne({ senderId }).lean();
        if (chat?.messages?.length > 0) {
            return chat.messages.slice(-limit).map(m => ({
                role: m.role,
                content: m.content
            }));
        }
        return [];
    } catch (err) {
        console.error('❌ getChatHistory:', err.message);
        return [];
    }
}

async function saveMessage(senderId, role, content) {
    if (!isConnected) return;
    try {
        await Chat.findOneAndUpdate(
            { senderId },
            {
                $push: {
                    messages: {
                        $each: [{ role, content, createdAt: new Date() }],
                        $slice: -MAX_MESSAGES
                    }
                },
                $set: { updatedAt: new Date() }
            },
            { upsert: true }
        );
    } catch (err) {
        console.error('❌ saveMessage:', err.message);
    }
}

async function clearHistory(senderId) {
    if (!isConnected) return false;
    try {
        await Chat.findOneAndUpdate(
            { senderId },
            { $set: { messages: [] } }
        );
        return true;
    } catch (err) {
        console.error('❌ clearHistory:', err.message);
        return false;
    }
}

// ─── Provider & Model ───

async function getProvider(senderId) {
    if (!isConnected) return 'google';
    try {
        const chat = await Chat.findOne({ senderId }).lean();
        return chat?.preferredProvider || 'google';
    } catch (err) {
        return 'google';
    }
}

async function setProvider(senderId, provider) {
    if (!isConnected) return;
    try {
        await Chat.findOneAndUpdate(
            { senderId },
            { $set: { preferredProvider: provider } },
            { upsert: true }
        );
    } catch (err) {
        console.error('❌ setProvider:', err.message);
    }
}

async function getUserModel(senderId) {
    if (!isConnected) return null;
    try {
        const chat = await Chat.findOne({ senderId }).lean();
        return chat?.preferredModel || null;
    } catch (err) {
        return null;
    }
}

async function setUserModel(senderId, model) {
    if (!isConnected) return;
    try {
        await Chat.findOneAndUpdate(
            { senderId },
            { $set: { preferredModel: model } },
            { upsert: true }
        );
    } catch (err) {
        console.error('❌ setUserModel:', err.message);
    }
}

module.exports = {
    connectDB,
    getChatHistory,
    saveMessage,
    clearHistory,
    getProvider,
    setProvider,
    getUserModel,
    setUserModel
};