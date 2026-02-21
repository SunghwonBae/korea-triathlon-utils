import { createClient } from 'redis';

export default async function handler(req, res) {
    const client = createClient({
        url: process.env.REDIS_URL,
        socket: {
            reconnectStrategy: false // 로컬 접속 실패 시 무한 재연결 방지 (브라우저 응답 지연 및 에러 도배 방지)
        }
    });

    // 로컬 개발 환경에서 Redis 없는 경우 터미널 에러 로그 도배 방지
    client.on('error', (err) => {
        if (err.code !== 'ECONNREFUSED') {
            console.error('Redis Client Error', err);
        }
    });

    try {
        await client.connect();

        const HASH_KEY = 'public_ddays_hash'; // 해시 바구니 이름

        // 1. 전체 목록 조회 (GET)
        if (req.method === 'GET') {
            const data = await client.hGetAll(HASH_KEY);

            // [성능 최적화] 데이터 과다로 인한 브라우저 크래시 방지
            // 1. 작년 1월 1일 기준 설정 (너무 오래된 데이터는 제외)
            const cutoffDate = new Date();
            cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
            cutoffDate.setMonth(0, 1);
            cutoffDate.setHours(0, 0, 0, 0);

            const events = Object.values(data)
                .map(item => {
                    try { return JSON.parse(item); } catch { return null; }
                })
                .filter(event => {
                    // 유효한 데이터이며, 기준일(작년 1월 1일) 이후의 일정만 전송
                    return event && event.startDate && new Date(event.startDate) >= cutoffDate;
                })
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate)); // 날짜순 정렬

            return res.status(200).json(events);
        }

        // 2. 등록 및 업데이트 (POST)
        if (req.method === 'POST') {
            const { title, startDate, type, id, where } = req.body;

            // 고유 ID 생성 (수정이면 기존 ID 사용, 신규면 생성)
            // 대회명이 같으면 업데이트되게 하려면 title을 ID로 써도 되지만, 
            // 보통은 안전하게 고유 ID를 씁니다. 여기선 'title'을 키로 써서 중복을 원천 차단합니다.
            const eventId = id || title;

            const newEvent = {
                id: eventId,
                title,
                startDate,
                endDate: startDate,
                type: type || 'public',
                where: where || 'local'
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
        // [우아한 장애 처리] Redis 연결 실패 등으로 인한 에러 발생 시 처리
        if (req.method === 'GET') {
            // dday.html에서 fetch('/api/ddays') 호출 시 응답이 JSON 배열이 아니면
            // 프론트엔드가 크래시(빈 화면 출력)되므로 빈 배열[]을 강제 반환합니다.
            return res.status(200).json([]);
        }
        return res.status(500).json({ error: 'Redis Error: ' + error.message });
    } finally {
        try {
            if (client.isOpen) {
                await client.quit();
            } else {
                await client.disconnect();
            }
        } catch (e) {
            // 정리 작업 중 발생하는 에러는 무시
        }
    }
}