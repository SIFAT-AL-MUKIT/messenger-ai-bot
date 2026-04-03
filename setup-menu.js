require('dotenv').config();
const axios = require('axios');

const TOKEN = process.env.PAGE_ACCESS_TOKEN;
const API = `https://graph.facebook.com/v19.0/me/messenger_profile?access_token=${TOKEN}`;

async function setup() {
    try {
        // Get Started বাটন
        await axios.post(API, {
            get_started: { payload: "GET_STARTED" }
        });
        console.log('✅ Get Started button');

        // Persistent Menu
        await axios.post(API, {
            persistent_menu: [{
                locale: "default",
                composer_input_disabled: false,
                call_to_actions: [
                    { type: "postback", title: "🔄 মডেল বদলান", payload: "CMD_MODELS" },
                    { type: "postback", title: "🗑️ মেমরি মুছুন", payload: "CMD_CLEAR" },
                    { type: "postback", title: "ℹ️ স্ট্যাটাস", payload: "CMD_STATUS" }
                ]
            }]
        });
        console.log('✅ Persistent Menu');
        console.log('\n🎉 সেটআপ সম্পন্ন!');
    } catch (err) {
        console.error('❌', err.response?.data || err.message);
    }
}

setup();