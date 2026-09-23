const express = require('express');
const axios = require('axios');

const app = express();

app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;


// ==========================================
// WEBHOOK VERIFICATION
// ==========================================

app.get('/webhook', (req, res) => {

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Webhook verification request received');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

        console.log('Webhook verified successfully!');

        return res.status(200).send(challenge);

    }

    console.log('Webhook verification failed');

    return res.sendStatus(403);
});


// ==========================================
// INSTAGRAM WEBHOOK
// ==========================================

app.post('/webhook', async (req, res) => {

    console.log('================================');
    console.log('WEBHOOK POST RECEIVED');
    console.log('================================');

    console.log(JSON.stringify(req.body, null, 2));

    // Meta ko immediately response
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


        // ==========================================
        // CURRENT INSTAGRAM WEBHOOK FORMAT
        // ==========================================

        for (const entry of body.entry) {

            if (!entry.changes) {

                console.log('No changes found');

                continue;
            }


            for (const change of entry.changes) {

                console.log('Webhook field:', change.field);


                // Only process messages
                if (change.field !== 'messages') {

                    console.log('Ignoring field:', change.field);

                    continue;
                }


                const value = change.value;

                if (!value) {

                    console.log('No message value found');

                    continue;
                }


                const senderId = value.sender?.id;

                const messageText = value.message?.text;


                console.log('Sender ID:', senderId);

                console.log('Message:', messageText);


                if (!senderId) {

                    console.log('No sender ID found');

                    continue;
                }


                if (!messageText) {

                    console.log('No text message found');

                    continue;
                }


                // ==========================================
                // GROQ AI
                // ==========================================

                console.log('Sending message to Groq...');

                const aiReply = await getAIReply(messageText);

                console.log('AI Reply:', aiReply);


                // ==========================================
                // SEND INSTAGRAM REPLY
                // ==========================================

                await sendInstagramReply(
                    senderId,
                    aiReply
                );

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
// GROQ AI
// ==========================================

async function getAIReply(userMessage) {

    try {

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

                    'Authorization':
                        `Bearer ${GROQ_API_KEY}`,

                    'Content-Type':
                        'application/json'

                }

            }

        );


        return response.data.choices[0].message.content;


    } catch (error) {

        console.error(
            'Groq API error:',
            error.response?.data || error.message
        );


        return 'Sorry, abhi main reply nahi de pa raha. Thodi der baad try karo!';

    }

}


// ==========================================
// SEND INSTAGRAM REPLY
// ==========================================

async function sendInstagramReply(
    recipientId,
    messageText
) {

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
// START SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log('================================');

    console.log(
        `Server running on port ${PORT}`
    );

    console.log(
        'Instagram AI Bot is running!'
    );

    console.log('================================');

});
