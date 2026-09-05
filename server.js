const sharp = require('sharp');

/**
 * Phân tích ảnh để xác định cầu lên/xuống
 * @param {string} imagePath - Đường dẫn file ảnh
 * @returns {Object|null} - Kết quả hoặc null nếu không tìm thấy cầu
 */
async function analyzeImage(imagePath) {
  try {
    // Đọc ảnh và lấy dữ liệu pixel
    const { data, info } = await sharp(imagePath)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    // Tìm các pixel có giá trị < ngưỡng (giả sử đường vẽ màu tối)
    const threshold = 128;
    const points = [];
    // Lấy mẫu theo từng cột để giảm thời gian xử lý (lấy trung bình)
    const stepX = Math.max(1, Math.floor(width / 100)); // lấy 100 cột mẫu
    const stepY = Math.max(1, Math.floor(height / 100)); // lấy 100 hàng mẫu

    for (let x = 0; x < width; x += stepX) {
      let minY = height;
      let found = false;
      for (let y = 0; y < height; y += stepY) {
        const idx = (y * width + x);
        const val = data[idx];
        if (val < threshold) {
          if (y < minY) minY = y;
          found = true;
        }
      }
      if (found) {
        points.push({ x, y: minY });
      }
    }

    // Nếu không có đủ điểm, thử với ngưỡng khác hoặc bỏ qua
    if (points.length < 3) {
      // Thử với ngưỡng thấp hơn
      const threshold2 = 100;
      const points2 = [];
      for (let x = 0; x < width; x += stepX) {
        let minY = height;
        let found = false;
        for (let y = 0; y < height; y += stepY) {
          const idx = (y * width + x);
          const val = data[idx];
          if (val < threshold2) {
            if (y < minY) minY = y;
            found = true;
          }
        }
        if (found) {
          points2.push({ x, y: minY });
        }
      }
      if (points2.length < 3) {
        return null; // Không đủ dữ liệu
      }
      points.length = 0;
      points.push(...points2);
    }

    // Hồi quy tuyến tính trên các điểm để tìm độ dốc
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }
    const meanX = sumX / n;
    const meanY = sumY / n;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Xác định xu hướng: slope < 0 => cầu lên (vì trục y tăng xuống dưới)
    const trend = slope < 0 ? 'lên' : 'xuống';

    // Tính điểm và xác suất dựa trên độ dốc tuyệt đối
    const absSlope = Math.abs(slope);
    let baseScore;
    if (absSlope > 2) {
      baseScore = trend === 'lên' ? 18 : 10;
    } else if (absSlope > 1) {
      baseScore = trend === 'lên' ? 15 : 8;
    } else {
      baseScore = trend === 'lên' ? 12 : 5;
    }

    // Thêm nhiễu nhẹ để tạo sự đa dạng
    const noise = Math.floor(Math.random() * 5) - 2; // -2..2
    let score = Math.min(Math.max(baseScore + noise, trend === 'lên' ? 11 : 3), trend === 'lên' ? 18 : 10);

    // Xác suất dựa trên độ dốc và một chút ngẫu nhiên
    let prob = 50 + absSlope * 10;
    prob = Math.min(95, Math.max(50, prob + (Math.random() * 10 - 5)));

    // Đánh giá mức độ
    let strength;
    if (prob >= 85) strength = 'cực mạnh';
    else if (prob >= 70) strength = 'mạnh';
    else if (prob >= 55) strength = 'trung bình';
    else strength = 'yếu';

    return {
      trend,
      score: Math.round(score),
      probability: Math.round(prob * 100) / 100,
      strength
    };
  } catch (error) {
    console.error('Lỗi phân tích ảnh:', error);
    return null;
  }
}

module.exports = { analyzeImage };