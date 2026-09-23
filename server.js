// Instagram AI Auto-Reply Bot

const express = require('express');
const axios = require('axios');

const app = express();

app.use(express.json());

// Environment Variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;


// ==========================================
// 1. WEBHOOK VERIFICATION
// ==========================================

app.get('/webhook', (req, res) => {

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Webhook verification request received');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

        console.log('Webhook verified successfully!');

        res.status(200).send(challenge);

    } else {

        console.log('Webhook verification failed');

        res.sendStatus(403);
    }
});


// ==========================================
// 2. INSTAGRAM WEBHOOK
// ==========================================

app.post('/webhook', async (req, res) => {

    console.log('================================');
    console.log('WEBHOOK POST RECEIVED');
    console.log('================================');

    console.log(JSON.stringify(req.body, null, 2));

    // Meta ko immediately 200 response
    res.status(200).send('EVENT_RECEIVED');

    try {

        const body = req.body;

        if (body.object !== 'instagram') {
            console.log('Not an Instagram event');
            return;
        }

        if (!body.entry) {
            console.log('No entry found');
            return;
        }

        for (const entry of body.entry) {

            if (!entry.messaging) {
                console.log('No messaging data found');
                continue;
            }

            for (const event of entry.messaging) {

                // Sender check
                if (!event.sender || !event.sender.id) {
                    console.log('No sender ID found');
                    continue;
                }

                const senderId = event.sender.id;

                // Message check
                if (!event.message) {
                    console.log('No message found');
                    continue;
                }

                // Echo message ignore
                if (event.message.is_echo) {
                    console.log('Echo message ignored');
                    continue;
                }

                const messageText = event.message.text;

                if (!messageText) {
                    console.log('Message has no text');
                    continue;
                }

                console.log('--------------------------------');
                console.log('Sender:', senderId);
                console.log('Message:', messageText);
                console.log('--------------------------------');


                // Get AI response
                const aiReply = await getAIReply(messageText);

                console.log('AI Reply:', aiReply);


                // Send reply to Instagram
                await sendInstagramReply(senderId, aiReply);
            }
        }

    } catch (error) {

        console.error(
            'Webhook processing error:',
            error.response?.data || error.message
        );
    }
});


// ==========================================
// 3. GROQ AI
// ==========================================

async function getAIReply(userMessage) {

    try {

        console.log('Sending message to Groq...');

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',

                messages: [
                    {
                        role: 'system',
                        content:
                            'Tum ek friendly Instagram assistant ho. Chhote, helpful aur friendly replies Hindi ya Hinglish mein do.'
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

        const reply = response.data.choices[0].message.content;

        console.log('Groq response received');

        return reply;

    } catch (error) {

        console.error(
            'Groq API error:',
            error.response?.data || error.message
        );

        return 'Sorry, abhi main reply nahi de pa raha. Thodi der baad try karo!';
    }
}


// ==========================================
// 4. SEND INSTAGRAM REPLY
// ==========================================

async function sendInstagramReply(recipientId, messageText) {

    try {

        console.log('Sending reply to Instagram...');

        await axios.post(
            'https://graph.instagram.com/v21.0/me/messages',
            {
                recipient: {
                    id: recipientId
                },

                message: {
                    text: messageText
                }
            },
            {
                params: {
                    access_token: PAGE_ACCESS_TOKEN
                }
            }
        );

        console.log('Reply sent successfully!');

    } catch (error) {

        console.error(
            'Instagram send message error:',
            error.response?.data || error.message
        );
    }
}


// ==========================================
// 5. START SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log('================================');
    console.log(`Server running on port ${PORT}`);
    console.log('Instagram AI Bot is running!');
    console.log('================================');

});
