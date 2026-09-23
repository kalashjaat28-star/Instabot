// Instagram AI Auto-Reply Bot
// Ye server Instagram DMs ko automatically Groq AI se reply karta hai

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ==== YAHAN APNI VALUES DAALO (Render.com ke Environment Variables mein) ====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;          // koi bhi random secret text (khud banao)
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // Instagram se generate kiya hua Access Token
const GROQ_API_KEY = process.env.GROQ_API_KEY;           // Groq se liya API key
// =============================================================================

// 1. Webhook Verification (Meta ye check karta hai app setup ke waqt)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 2. Webhook - Jab bhi koi Instagram pe DM kare, ye function chalega
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // Turant 200 OK bhejo Meta ko (warna retry karta rehta hai)
  res.status(200).send('EVENT_RECEIVED');

  try {
    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        const messaging = entry.messaging;
        if (messaging) {
          for (const event of messaging) {
            const senderId = event.sender.id;
            const messageText = event.message?.text;

            // Agar bot ka khud ka message hai to ignore karo (infinite loop na ho)
            if (event.message?.is_echo) continue;

            if (messageText) {
              console.log(`Message from ${senderId}: ${messageText}`);

              // Groq AI se reply generate karo
              const aiReply = await getAIReply(messageText);

              // Instagram user ko reply bhejo
              await sendInstagramReply(senderId, aiReply);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error.message);
  }
});

// 3. Groq AI se reply generate karne wala function
async function getAIReply(userMessage) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Tum ek friendly Instagram assistant ho. Chhote, helpful aur friendly replies do Hindi ya Hinglish mein.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API error:', error.response?.data || error.message);
    return "Sorry, abhi main reply nahi de pa raha. Thodi der baad try karo!";
  }
}

// 4. Instagram ko reply wapas bhejne wala function
async function sendInstagramReply(recipientId, messageText) {
  try {
    await axios.post(
      `https://graph.instagram.com/v21.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: messageText }
      },
      {
        params: { access_token: PAGE_ACCESS_TOKEN }
      }
    );
    console.log('Reply sent successfully!');
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

// Server start karo
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
