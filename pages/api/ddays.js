import Redis from 'ioredis';

// 환경 변수에 있는 REDIS_URL로 접속합니다.
// tls 옵션을 추가하여 보안 연결 거부를 방지합니다.
const redis = new Redis(process.env.REDIS_URL, {
    tls: {
        rejectUnauthorized: false
    }
});

export default async function handler(req, res) {
    try {
        // 1. 일정 목록 불러오기 (GET)
        if (req.method === 'GET') {
            const data = await redis.lrange('public_ddays', 0, -1);
            // Redis에 저장된 문자열들을 다시 객체(JSON)로 변환합니다.
            const parsedData = data.map(item => JSON.parse(item));
            return res.status(200).json(parsedData);
        } 
        
        // 2. 새 일정 등록하기 (POST)
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
            await redis.lpush('public_ddays', JSON.stringify(newEvent));
            return res.status(200).json(newEvent);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Redis Error:', error);
        return res.status(500).json({ error: '데이터베이스 연결 오류가 발생했습니다.' });
    }
}