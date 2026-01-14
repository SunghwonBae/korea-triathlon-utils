import { createClient } from 'redis';

export default async function handler(req, res) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.log('Redis Client Error', err));

    try {
        await client.connect();

        const HASH_KEY = 'public_ddays_hash'; // 해시 바구니 이름

        // 1. 전체 목록 조회 (GET)
        if (req.method === 'GET') {
            const data = await client.hGetAll(HASH_KEY);
            // Hash는 {id: '데이터'} 형태이므로 값들만 뽑아서 배열로 만듭니다.
            const events = Object.values(data).map(item => JSON.parse(item));
            return res.status(200).json(events);
        }

        // 2. 등록 및 업데이트 (POST)
        if (req.method === 'POST') {
            const { title, startDate, type, id } = req.body;
            
            // 고유 ID 생성 (수정이면 기존 ID 사용, 신규면 생성)
            // 대회명이 같으면 업데이트되게 하려면 title을 ID로 써도 되지만, 
            // 보통은 안전하게 고유 ID를 씁니다. 여기선 'title'을 키로 써서 중복을 원천 차단합니다.
            const eventId = id || title; 

            const newEvent = {
                id: eventId,
                title,
                startDate,
                endDate: startDate,
                type: type || 'public'
            };

            // hSet(바구니명, 키, 값) -> 키가 같으면 자동으로 덮어쓰기(Update) 됩니다.
            await client.hSet(HASH_KEY, eventId, JSON.stringify(newEvent));
            return res.status(200).json(newEvent);
        }

        // 3. 삭제 (DELETE) - 가장 빠르고 표준적인 방식
        if (req.method === 'DELETE') {
            const { id } = req.query;
            // hDel(바구니명, 키) -> 사물함 번호(ID)만 알면 바로 삭제!
            await client.hDel(HASH_KEY, id);
            return res.status(200).json({ success: true });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    } finally {
        await client.quit();
    }
}