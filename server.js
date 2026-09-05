const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { analyzeImage } = require('./analyzer');
const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN || '8642547853:AAHW-oXEuz2tikY9qv1WspSemU_6sfhF6Yc';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-app-name.onrender.com/webhook'; // THAY ĐỔI!

const app = express();
app.use(express.json());

// Khởi tạo bot với polling: false để dùng webhook
const bot = new TelegramBot(TOKEN, { polling: false });

// Xóa webhook cũ và đặt webhook mới khi khởi động
async function setupWebhook() {
  try {
    // Xóa webhook cũ
    await bot.deleteWebHook();
    console.log('🗑️ Đã xóa webhook cũ');
    
    // Đặt webhook mới
    await bot.setWebHook(WEBHOOK_URL);
    console.log(`✅ Webhook đã được đặt tại: ${WEBHOOK_URL}`);
  } catch (error) {
    console.error('❌ Lỗi thiết lập webhook:', error);
  }
}

// Route webhook
app.post('/webhook', (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Lỗi xử lý webhook:', error);
    res.sendStatus(500);
  }
});

// Định tuyến /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcome = `Xin chào, tôi là AI của nick name @hahakk123 và chắc hẳn bạn tìm đến tôi vì mục đích riêng, nhưng dù sao thì bạn chỉ cần đưa ảnh cầu cho tôi và tôi sẽ dự đoán ngay cho bạn, để bạn hiểu hơn về bot thì ở đây:
• Gửi ảnh = dự đoán cầu lên xuống
• Cầu lên sẽ có điểm từ 11 đến 18
• Cầu xuống sẽ có điểm từ 3 đến 10
• Và sẽ có kết quả cuối cùng mà tôi chọn sẽ dựa trên ảnh mà bạn gửi để có căn cứ chọn ra kết quả cầu sẽ lên hay xuống, và sẽ không chính xác 100% nên đừng thắc mắc nếu đoán sai 
• TÔI ĐÃ CẢNH CÁO Ở TRÊN NÊN BẠN PHẢI CÓ MỘT CÁI ĐẦU LẠNH🥶

Được rồi giờ bạn cứ gửi ảnh cầu cho tôi xem đi`;
  bot.sendMessage(chatId, welcome);
});

// Hàm xử lý ảnh
async function handleImage(chatId, fileId) {
  try {
    const fileLink = await bot.getFileLink(fileId);
    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    const result = await analyzeImage(imageBuffer);
    if (!result) {
      bot.sendMessage(chatId, '⚠️ Ảnh không hợp lệ, không phát hiện cầu lên/xuống. Vui lòng gửi ảnh có biểu đồ cầu.');
      return;
    }

    const { trend, score, probability, strength } = result;
    const responseText = `📊 Kết quả phân tích:
🔄 Cầu: ${trend}
📈 Điểm số: ${score}/18
🎯 Xác suất: ${probability.toFixed(2)}%
💪 Mức độ: ${strength}

Kết luận cuối cùng: Cầu đang ${trend} (${strength})`;
    bot.sendMessage(chatId, responseText);
  } catch (error) {
    console.error('❌ Lỗi xử lý ảnh:', error);
    bot.sendMessage(chatId, '❌ Đã xảy ra lỗi khi xử lý ảnh. Vui lòng thử lại.');
  }
}

bot.on('photo', (msg) => {
  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1];
  handleImage(chatId, photo.file_id);
});

bot.on('document', (msg) => {
  const chatId = msg.chat.id;
  const doc = msg.document;
  if (!doc.mime_type || !doc.mime_type.startsWith('image/')) {
    bot.sendMessage(chatId, 'Vui lòng gửi một file ảnh.');
    return;
  }
  handleImage(chatId, doc.file_id);
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
  await setupWebhook();
  console.log('✅ Bot đã sẵn sàng!');
});