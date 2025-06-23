require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/send-to-telegram', async (req, res) => {
    try {
        const { message } = req.body;
        
        const response = await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Telegram API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send message to Telegram'
        });
    }
});

app.get('*', (req, res) => {
    if (req.path !== '/') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
