import { createClient } from 'redis';

export default async function handler(req, res) {
    // REDIS_URL 환경변수를 사용합니다. 
    // Vercel 배포 시에는 자동으로 보안 연결이 설정됩니다.
    const client = createClient({
        url: process.env.REDIS_URL
    });

    client.on('error', (err) => console.log('Redis Client Error', err));

    try {
        await client.connect();

        // 1. 목록 가져오기 (GET)
        if (req.method === 'GET') {
            const data = await client.lRange('public_ddays', 0, -1);
            const parsedData = data.map(item => JSON.parse(item));
            return res.status(200).json(parsedData);
        }

        // 2. 일정 등록하기 (POST)
        if (req.method === 'POST') {
            const { title, startDate, endDate, startTime, endTime, type } = req.body;
            
            if (!title || !startDate) {
                return res.status(400).json({ error: '제목과 시작일은 필수입니다.' });
            }

            const newEvent = {
                id: Date.now().toString(),
                title,
                startDate,
                endDate: endDate || startDate, // 종료일 없으면 시작일과 동일하게
                startTime: startTime || '',
                endTime: endTime || '',
                type: type || 'public'
            };

            // Redis 리스트의 앞부분(LPUSH)에 문자열로 변환하여 저장합니다.
            await client.lpush('public_ddays', JSON.stringify(newEvent));
            return res.status(200).json(newEvent);
        }
    } catch (error) {
        console.error('Redis 에러:', error);
        return res.status(500).json({ error: '연결 실패', message: error.message });
    } finally {
        // 사용이 끝나면 연결을 끊어줍니다 (서버리스 환경 권장)
        await client.quit();
    }
}

