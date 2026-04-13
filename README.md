# ⚡ AI Messenger Chatbot v3.0

Facebook Messenger-এ AI চ্যাটবট। Google Gemini এবং OpenRouter — দুটো provider সাপোর্ট করে। ছবি বিশ্লেষণ, দীর্ঘমেয়াদী মেমরি, এবং অটো-ফলব্যাক সিস্টেম সহ। সম্পূর্ণ ফ্রি, কোনো ক্রেডিট কার্ড ছাড়াই চালানো যায়।

---

## ✨ ফিচারসমূহ

- **Multi-modal:** টেক্সট ও ছবি দুটোই প্রসেস করতে পারে
- **Dual Provider:** Google Gemini এবং OpenRouter — যেকোনো একটি বেছে নেওয়া যায়
- **Smart Image Handling:** ছবি পাঠালে DB-তে রাখা হয়, পরের মেসেজের সাথে পাঠানো হয়
- **Long-term Memory:** MongoDB-তে conversation history সংরক্ষিত থাকে
- **Auto-Fallback:** মেইন মডেল ব্যর্থ হলে স্বয়ংক্রিয়ভাবে ব্যাকআপে চলে যায়
- **Security:** শুধুমাত্র Admin-এর মেসেজে রেসপন্স করে

---

## 🗂️ ফাইল স্ট্রাকচার

```
messenger-ai-bot/
├── server.js        # Express server, webhook handler, command routing
├── ai.js            # Provider router — Google/OpenRouter সিলেক্ট করে
├── gemini.js        # Google Gemini API integration
├── openrouter.js    # OpenRouter API integration
├── database.js      # MongoDB — chat history, pending images, settings
├── utils.js         # ছবি URL → Base64 converter
├── messenger.js     # Facebook Send API wrapper
├── setup-menu.js    # Messenger Persistent Menu সেটআপ (একবার চালাতে হয়)
├── .env             # API keys (গিটহাবে দেবে না!)
├── .gitignore
└── package.json
```

---

## 🛠️ যা যা লাগবে

| টুল / সার্ভিস | কাজ | লিংক |
|---|---|---|
| Node.js ≥ 18 | Runtime | [nodejs.org](https://nodejs.org) |
| Google AI Studio | Gemini API Key | [aistudio.google.com](https://aistudio.google.com) |
| OpenRouter | OpenRouter API Key | [openrouter.ai](https://openrouter.ai) |
| MongoDB Atlas | ডাটাবেস | [mongodb.com/atlas](https://mongodb.com/atlas) |
| Facebook Developer | Page + Webhook | [developers.facebook.com](https://developers.facebook.com) |
| Render / Koyeb | Hosting | [render.com](https://render.com) |

---

## 🚀 সেটআপ গাইড

### ধাপ ১: ক্লোন ও ইনস্টল

```bash
git clone https://github.com/SIFAT-AL-MUKIT/messenger-ai-bot.git
cd messenger-ai-bot
npm install
```

### ধাপ ২: Environment Variables

প্রজেক্ট ফোল্ডারে `.env` ফাইল তৈরি করুন:

```env
PORT=3000
VERIFY_TOKEN=আপনার_পছন্দমতো_যেকোনো_পাসওয়ার্ড
PAGE_ACCESS_TOKEN=ফেসবুক_ডেভেলপার_পোর্টাল_থেকে
ADMIN_SENDER_ID=আপাতত_ফাঁকা_রাখুন
GEMINI_API_KEY=গুগল_এআই_স্টুডিও_থেকে
OPENROUTER_API_KEY=ওপেনরাউটার_থেকে
MONGODB_URI=মঙ্গোডিবি_অ্যাটলাস_লিংক
RENDER_URL=আপনার_রেন্ডার_সার্ভিসের_URL (deploy করার পর দিন)
```

> **নোট:** `MONGODB_URI`-এর ভেতরে `<password>` জায়গায় আসল পাসওয়ার্ড বসান।

### ধাপ ৩: লোকাল টানেলিং

সার্ভার চালু করুন:
```bash
node server.js
```

আরেকটি টার্মিনালে টানেল তৈরি করুন:

```bash
# Cloudflare (Cloudflare দিয়ে কাজ নাও করতে পারে!)
cloudflared tunnel --url http://127.0.0.1:3000

# অথবা SSH (SSH দিয়ে অবশ্যই কাজ করবে)
ssh -R 80:localhost:3000 nokey@localhost.run
```

একটি `https://...` লিংক পাবেন — কপি করে রাখুন।

### ধাপ ৪: Facebook Webhook সেটআপ

1. [developers.facebook.com](https://developers.facebook.com) → আপনার App → **Messenger > Settings**
2. **Webhooks** → **Add Callback URL**
3. URL: `https://your-tunnel-link/webhook`
4. Verify Token: `.env`-এর `VERIFY_TOKEN`-এর মান
5. **"Attach a client certificate..."** অপশনটি **Off** রাখুন
6. Verify হলে **Select a Page** → আপনার পেজ → **Subscribe**
7. `messages` এবং `messaging_postbacks` — দুটোই subscribe করুন

### ধাপ ৫: ADMIN_SENDER_ID বের করা

Messenger-এ পেজে একটি মেসেজ পাঠান। টার্মিনালে এই লগ দেখবেন:

```
📩 New message received from PSID: 123456789012345
```

এই সংখ্যাটি `.env`-এর `ADMIN_SENDER_ID`-তে বসান এবং সার্ভার রিস্টার্ট করুন।

### ধাপ ৬: Persistent Menu সেটআপ (একবার)

```bash
node setup-menu.js
```

---

## 🌐 Render-এ Deploy করা

1. [render.com](https://render.com) → **New Web Service**
2. GitHub রিপো কানেক্ট করুন
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. **Environment Variables**-এ `.env`-এর সব ভ্যালু যোগ করুন
6. Deploy হলে Render-এর URL টি `.env`-এর `RENDER_URL`-এ বসান এবং redeploy করুন
7. Facebook Developer পোর্টালে Webhook URL টি Render-এর URL দিয়ে আপডেট করুন

---

## 💬 কমান্ড রেফারেন্স

| কমান্ড | কাজ |
|---|---|
| `/help` | বাটন মেনু দেখায় |
| `/model` | মডেল পরিবর্তন করুন |
| `/status` | বর্তমান provider, model, memory দেখায় |
| `/clear` | সব চ্যাট হিস্ট্রি ও pending ছবি মুছে দেয় |

---

## 🤖 মডেল লিস্ট

### Google Gemini (ডিফল্ট)
| মডেল | বৈশিষ্ট্য |
|---|---|
| `gemini-2.5-flash` | **ডিফল্ট।** দ্রুত ও স্মার্ট, ছবি সাপোর্ট |
| `gemini-3-flash-preview` | নতুন, উন্নত — OpenRouter image bridge হিসেবেও ব্যবহার হয় |
| `gemini-3.1-flash-lite-preview` | হালকা ও দ্রুততম |
| `gemma-4-31b-it` | Open-weight মডেল |

### OpenRouter
| মডেল | বৈশিষ্ট্য |
|---|---|
| `openrouter/auto` | **ডিফল্ট।** OR নিজেই সেরা মডেল বেছে নেয় |
| `qwen/qwen3-plus:free` | শক্তিশালী reasoning |
| `stepfun/step-3.5-flash:free` | দ্রুত |

> কাস্টম মডেলও ব্যবহার করা যাবে — `/model` কমান্ডে model name টাইপ করুন।

---

## 📷 ছবি পাঠানোর নিয়ম

Messenger-এ একসাথে ছবি ও টেক্সট পাঠানো যায় না। তাই:

1. আগে ছবিটি পাঠান → বট confirm করবে: `"📷 ছবি পেয়েছি! এখন কোনো প্রশ্ন করুন।"`
2. এরপর প্রশ্ন বা মেসেজ পাঠান → ছবি + মেসেজ একসাথে AI-তে যাবে

**Google Provider:** প্রতিটি মেসেজে ছবি পাঠানো থাকে যতক্ষণ `/clear` না দেওয়া হয়।

**OpenRouter Provider:** ছবি একবারের জন্য `gemini-3-flash-preview` দিয়ে প্রসেস হয়, তারপর স্বয়ংক্রিয়ভাবে সরিয়ে দেওয়া হয়।

---

## ⚠️ সাধারণ সমস্যা ও সমাধান

### MongoDB Connection Error
**কারণ:** Render-এর IP পরিবর্তন হলে MongoDB block করে।

**সমাধান:** MongoDB Atlas → **Network Access** → **Add IP Address** → **Allow Access From Anywhere** (`0.0.0.0/0`)

### Webhook ভেরিফাই হচ্ছে না
- URL-এর শেষে `/webhook` আছে কিনা নিশ্চিত করুন
- **"Attach a client certificate..."** অবশ্যই **Off** রাখুন
- Termux-এ `localhost`-এর বদলে `127.0.0.1` ব্যবহার করুন

### Termux-এ Localtunnel কাজ করে না
Cloudflare বা SSH tunnel ব্যবহার করুন (ধাপ ৩ দেখুন)।

### মেসেজ দিলে কোনো রেসপন্স নেই
- Webhook-এ পেজটি Subscribe করা আছে কিনা দেখুন
- App যদি Development Mode-এ থাকে, শুধু আপনার developer account থেকে মেসেজ দিন
- `ADMIN_SENDER_ID` সঠিক আছে কিনা চেক করুন

### OpenRouter Rate Limit
কোনো কিছু করতে হবে না — auto-fallback সিস্টেম Google-এ চলে যাবে এবং মেসেঞ্জারে জানিয়ে দেবে।

---

## 🔑 `.env` পূর্ণ টেমপ্লেট

```env
PORT=3000
VERIFY_TOKEN=
PAGE_ACCESS_TOKEN=
ADMIN_SENDER_ID=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
MONGODB_URI=
RENDER_URL=
```
