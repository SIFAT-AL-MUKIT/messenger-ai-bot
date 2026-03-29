const axios = require('axios');
const messenger = require('./messenger'); // মেসেঞ্জারে অ্যালার্ট পাঠানোর জন্য যুক্ত করা হলো

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// মডেলগুলোর নাম
const TEXT_MODEL = "stepfun/step-3.5-flash:free"; 
const VISION_MODEL = "google/gemma-3-27b-it:free"; 
const FALLBACK_MODEL = "openrouter/free"; // OpenRouter এর অটো-রাউটার (ম্যাজিক মডেল)

const SYSTEM_PROMPT = {
    role: "system",
    content: "You are a helpful assistant created by Sifat. You are integrated to Messenger. Always response in plain text. Don't response in markdown formate. Keep it mind that messenger can't render markdown or Latex."
};

// senderId যুক্ত করা হলো যাতে এরর হলে মেসেঞ্জারে সরাসরি অ্যালার্ট পাঠানো যায়
async function getAiResponse(chatHistory, newText, base64Image = null, senderId = null) {
    let messages =[SYSTEM_PROMPT, ...chatHistory];
    let currentUserMsg = { role: "user" };
    let selectedModel = TEXT_MODEL; 
    
    if (base64Image) {
        selectedModel = VISION_MODEL; 
        console.log(`👁️ Image detected! Trying Vision Model: ${selectedModel}`);
        let contentArray =[];
        if (newText) contentArray.push({ type: "text", text: newText });
        else contentArray.push({ type: "text", text: "এই ছবিতে কী আছে বিস্তারিত বাংলায় বলো।" }); 
        contentArray.push({ type: "image_url", image_url: { url: base64Image } });
        currentUserMsg.content = contentArray;
    } else {
        console.log(`💬 Text only! Trying Text Model: ${selectedModel}`);
        currentUserMsg.content = newText || "হ্যালো!"; 
    }
    
    messages.push(currentUserMsg);

    // API Call করার জন্য একটি ছোট ফাংশন (যাতে কোড বারবার লিখতে না হয়)
    const makeApiCall = async (modelName) => {
        return await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            { model: modelName, messages: messages },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://my-messenger-bot.com', 
                    'X-Title': 'MessengerBot',
                    'Content-Type': 'application/json'
                }
            }
        );
    };

    try {
        // ১. প্রথমে আমাদের মেইন মডেল দিয়ে চেষ্টা করবে
        const response = await makeApiCall(selectedModel);
        if (response.data && response.data.choices) {
            return response.data.choices[0].message.content;
        } else {
            throw new Error("Invalid response from primary model.");
        }
    } catch (error) {
        console.error(`❌ Primary Model (${selectedModel}) Error:`, error.response ? JSON.stringify(error.response.data) : error.message);
        
        // ২. এরর হলে ইউজারকে মেসেঞ্জারে সাথে সাথে জানিয়ে দেওয়া
        if (senderId) {
            console.log('⚠️ Sending fallback alert to Messenger...');
            await messenger.sendTextMessage(senderId, `⚠️ An error occurred with the primary model. Using "openrouter/free" as fallback... Please wait.`);
        }

        try {
            // ৩. Fallback Model (openrouter/free) দিয়ে আবার চেষ্টা করবে
            console.log(`🔄 Retrying with Fallback Model: ${FALLBACK_MODEL}`);
            const fallbackResponse = await makeApiCall(FALLBACK_MODEL);
            
            if (fallbackResponse.data && fallbackResponse.data.choices) {
                return fallbackResponse.data.choices[0].message.content;
            } else {
                return "দুঃখিত, ব্যাকআপ মডেলেও কোনো উত্তর তৈরি করা যায়নি।";
            }
        } catch (fallbackError) {
            console.error(`❌ Fallback Model Error:`, fallbackError.response ? JSON.stringify(fallbackError.response.data) : fallbackError.message);
            return "দুঃখিত, সার্ভারে এখন একটু সমস্যা হচ্ছে, কিছুক্ষণ পর আবার চেষ্টা করুন।";
        }
    }
}

module.exports = { getAiResponse };
