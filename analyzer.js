const sharp = require('sharp');

async function analyzeImage(imageBuffer) {
  try {
    const { data, info } = await sharp(imageBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    const threshold = 128;
    const points = [];
    const stepX = Math.max(1, Math.floor(width / 100));
    const stepY = Math.max(1, Math.floor(height / 100));

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

    if (points.length < 3) {
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
      if (points2.length < 3) return null;
      points.length = 0;
      points.push(...points2);
    }

    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    const trend = slope < 0 ? 'lên' : 'xuống';
    const absSlope = Math.abs(slope);

    let baseScore;
    if (absSlope > 2) baseScore = trend === 'lên' ? 18 : 10;
    else if (absSlope > 1) baseScore = trend === 'lên' ? 15 : 8;
    else baseScore = trend === 'lên' ? 12 : 5;

    const noise = Math.floor(Math.random() * 5) - 2;
    let score = Math.min(Math.max(baseScore + noise, trend === 'lên' ? 11 : 3), trend === 'lên' ? 18 : 10);

    let prob = 50 + absSlope * 10;
    prob = Math.min(95, Math.max(50, prob + (Math.random() * 10 - 5)));

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
    console.error('❌ Lỗi phân tích ảnh:', error);
    return null;
  }
}

module.exports = { analyzeImage };