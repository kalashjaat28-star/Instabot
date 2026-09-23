const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const PORT = process.env.PORT || 10000;

// ==========================================
// BASIC CHECK
// ==========================================

console.log("================================");
console.log("Instagram AI Bot Starting...");
console.log("================================");

if (!VERIFY_TOKEN) {
    console.log("WARNING: VERIFY_TOKEN missing");
}

if (!ACCESS_TOKEN) {
    console.log("WARNING: PAGE_ACCESS_TOKEN missing");
}

if (!GROQ_API_KEY) {
    console.log("WARNING: GROQ_API_KEY missing");
}

// ==========================================
// HOME PAGE
// ==========================================

app.get("/", (req, res) => {
    res.status(200).send("Instagram AI Bot is running!");
});

// ==========================================
// WEBHOOK VERIFICATION
// ==========================================

app.get("/webhook", (req, res) => {

    console.log("Webhook verification request received");

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
        mode === "subscribe" &&
        token === VERIFY_TOKEN
    ) {

        console.log("Webhook verified successfully!");

        return res.status(200).send(challenge);

    }

    console.log("Webhook verification failed");

    return res.sendStatus(403);
});

// ==========================================
// INSTAGRAM WEBHOOK
// ==========================================

app.post("/webhook", async (req, res) => {

    console.log("================================");
    console.log("WEBHOOK POST RECEIVED");
    console.log("================================");

    console.log(
        JSON.stringify(req.body, null, 2)
    );

    // Meta ko immediately response
    res.status(200).send("EVENT_RECEIVED");

    try {

        const body = req.body;

        // ======================================
        // CHECK INSTAGRAM OBJECT
        // ======================================

        if (body.object !== "instagram") {

            console.log("Not an Instagram event");

            return;
        }

        if (!body.entry) {

            console.log("No entry found");

            return;
        }

        // ======================================
        // PROCESS ENTRIES
        // ======================================

        for (const entry of body.entry) {

            if (!entry.changes) {

                console.log("No changes found");

                continue;
            }

            // ==================================
            // PROCESS CHANGES
            // ==================================

            for (const change of entry.changes) {

                console.log(
                    "Webhook field:",
                    change.field
                );

                // Only messages
                if (change.field !== "messages") {

                    console.log(
                        "Ignoring field:",
                        change.field
                    );

                    continue;
                }

                const value = change.value;

                if (!value) {

                    console.log(
                        "No message value found"
                    );

                    continue;
                }

                // ==================================
                // GET SENDER
                // ==================================

                const senderId = value.sender?.id;

                const messageText =
                    value.message?.text;

                console.log(
                    "Sender ID:",
                    senderId
                );

                console.log(
                    "Message:",
                    messageText
                );

                // ==================================
                // VALIDATION
                // ==================================

                if (!senderId) {

                    console.log(
                        "No sender ID found"
                    );

                    continue;
                }

                if (!messageText) {

                    console.log(
                        "No text message found"
                    );

                    continue;
                }

                // ==================================
                // IGNORE EMPTY MESSAGE
                // ==================================

                const cleanMessage =
                    messageText.trim();

                if (!cleanMessage) {

                    continue;
                }

                // ==================================
                // GROQ AI
                // ==================================

                console.log(
                    "Sending message to Groq..."
                );

                const aiReply =
                    await getAIReply(cleanMessage);

                console.log(
                    "AI Reply:",
                    aiReply
                );

                // ==================================
                // SEND INSTAGRAM REPLY
                // ==================================

                await sendInstagramReply(
                    senderId,
                    aiReply
                );

            }
        }

    } catch (error) {

        console.error(
            "Webhook processing error:",
            error.response?.data ||
            error.message
        );

    }
});

// ==========================================
// GROQ AI
// ==========================================

async function getAIReply(userMessage) {

    try {

        const response = await axios.post(

            "https://api.groq.com/openai/v1/chat/completions",

            {

                model: "llama-3.1-8b-instant",

                messages: [

                    {
                        role: "system",

                        content:
                            "Tum ek friendly Instagram AI assistant ho. " +
                            "User ko short, helpful aur natural Hindi ya Hinglish mein reply do. " +
                            "Bahut lamba answer mat do."
                    },

                    {
                        role: "user",

                        content: userMessage
                    }

                ],

                max_tokens: 200,

                temperature: 0.7

            },

            {

                headers: {

                    "Authorization":
                        `Bearer ${GROQ_API_KEY}`,

                    "Content-Type":
                        "application/json"

                }

            }

        );

        const reply =
            response.data?.choices?.[0]?.message?.content;

        if (!reply) {

            console.log(
                "Groq returned empty response"
            );

            return "Sorry, mujhe abhi reply generate karne mein problem ho rahi hai.";

        }

        return reply.trim();

    } catch (error) {

        console.error(
            "Groq API error:",
            error.response?.data ||
            error.message
        );

        return "Sorry, abhi AI reply nahi de pa raha. Thodi der baad try karo!";
    }
}

// ==========================================
// SEND INSTAGRAM MESSAGE
// ==========================================

async function sendInstagramReply(
    recipientId,
    messageText
) {

    try {

        console.log(
            "Sending reply to Instagram..."
        );

        console.log(
            "Recipient:",
            recipientId
        );

        // ======================================
        // INSTAGRAM MESSAGING API
        // ======================================

        const response = await axios.post(

            "https://graph.instagram.com/v21.0/me/messages",

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

                    access_token: ACCESS_TOKEN

                },

                headers: {

                    "Content-Type":
                        "application/json"

                }

            }

        );

        console.log(
            "Instagram reply sent successfully!"
        );

        console.log(
            response.data
        );

        return true;

    } catch (error) {

        console.error(
            "Instagram send message error:"
        );

        console.error(
            error.response?.data ||
            error.message
        );

        return false;
    }
}

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

    console.log("================================");

    console.log(
        `Server running on port ${PORT}`
    );

    console.log(
        "Instagram AI Bot is running!"
    );

    console.log("================================");

});
