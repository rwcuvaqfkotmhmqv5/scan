require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// --- Middleware chặn IP Việt Nam ---
app.use(async (req, res, next) => {
    // Bỏ qua các yêu cầu đến từ localhost hoặc các IP nội bộ
    if (req.ip === '::1' || req.ip === '127.0.0.1') {
        return next();
    }

    try {
        // Lấy địa chỉ IP của người dùng.
        // req.headers['x-forwarded-for'] thường được dùng khi có proxy/load balancer phía trước.
        // Nếu không, req.ip sẽ trả về IP trực tiếp.
        const userIp = req.headers['x-forwarded-for'] || req.ip;

        // Sử dụng ipapi.co để lấy thông tin quốc gia từ IP
        const geoResponse = await axios.get(`https://ipapi.co/${userIp}/json/`);
        const countryCode = geoResponse.data.country_code;

        // Nếu quốc gia là Việt Nam (VN), từ chối truy cập
        if (countryCode === 'VN') {
            console.warn(`Blocked access from Vietnam IP: ${userIp}`);
            return res.status(403).send('Access Denied: Vietnam IPs are blocked.');
        }

        // Nếu không phải IP Việt Nam, cho phép yêu cầu tiếp tục
        next();

    } catch (error) {
        // Log lỗi nhưng vẫn cho phép yêu cầu tiếp tục
        // để tránh việc lỗi API địa lý làm sập trang web
        console.error('Error checking IP geolocation:', error.message);
        // Trong môi trường production, bạn có thể muốn xử lý lỗi này khác đi,
        // ví dụ, chỉ cho phép nếu không thể xác định được quốc gia
        next();
    }
});
// --- End Middleware chặn IP Việt Nam ---

app.use(express.static(path.join(__dirname, 'public')));

// Telegram Proxy Endpoint
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

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
