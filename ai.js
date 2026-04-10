const gemini = require('./gemini');
const openrouter = require('./openrouter');
const messenger = require('./messenger');

// ★ নতুন default মডেল
const DEFAULTS = {
    google: 'gemini-2.5-flash',
    openrouter: 'openrouter/free'
};

async function getAiResponse(chatHistory, userText, base64Image, senderId, provider, model) {
    provider = provider || 'google';
    model = model || DEFAULTS[provider] || DEFAULTS.google;

    console.log(`\n🤖 Provider: ${provider} | Model: ${model}`);

    // Google
    if (provider === 'google') {
        try {
            return await gemini.getResponse(chatHistory, userText, base64Image, model);
        } catch (error) {
            console.error(`❌ Google failed. Trying OpenRouter...`);

            if (senderId) {
                await messenger.sendTextMessage(senderId, `⚠️ Google সমস্যা। OpenRouter ব্যাকআপ...`);
            }

            try {
                const fallbackText = base64Image && !userText
                    ? "ছবি বিশ্লেষণ করতে পারিনি।"
                    : userText;

                return await openrouter.getResponse(
                    chatHistory, fallbackText, null,
                    DEFAULTS.openrouter, 2
                );
            } catch (e) {
                return "দুঃখিত, সব AI মডেল সমস্যায় আছে। কিছুক্ষণ পর চেষ্টা করুন। 🙏";
            }
        }
    }

    // OpenRouter
    else {
        try {
            return await openrouter.getResponse(chatHistory, userText, base64Image, model);
        } catch (error) {
            console.error(`❌ OpenRouter failed. Trying Google...`);

            if (senderId) {
                await messenger.sendTextMessage(senderId, `⚠️ OpenRouter সমস্যা। Google ব্যাকআপ...`);
            }

            try {
                return await gemini.getResponse(
                    chatHistory, userText, base64Image,
                    DEFAULTS.google, 2
                );
            } catch (e) {
                return "দুঃখিত, সব AI মডেল সমস্যায় আছে। কিছুক্ষণ পর চেষ্টা করুন। 🙏";
            }
        }
    }
}

module.exports = { getAiResponse };