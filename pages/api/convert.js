import formidable from 'formidable';
import XLSX from 'xlsx';
import { generateHtml } from '../../lib/template';

// Next.js API 설정: 파일 업로드를 위해 기본 바디 파서를 끔
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const form = formidable({});

    try {
        const [fields, files] = await form.parse(req);
        
        // 제목 받기 (파일명 재활용)
        const title = fields.title ? fields.title[0] : "트라이애슬론 분석 리포트";
        
        // 파일 추출 (배열 형태 대응)
        const file = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!file) {
            return res.status(400).send("파일이 업로드되지 않았습니다.");
        }

        // 엑셀 읽기
        const workbook = XLSX.readFile(file.filepath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // 데이터 파싱
        const playerNames = rows[0].slice(1);
        const cumulativeDistances = [];
        const players = playerNames.map(name => ({ name, data: [], avg: 0 }));

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row[0] === undefined) continue;
            
            cumulativeDistances.push(Number(row[0]) || 0); // 첫 열: 누적 거리
            for (let j = 1; j <= playerNames.length; j++) {
                players[j - 1].data.push(Number(row[j]) || 0);
            }
        }

        // 🔥 누적 거리를 바탕으로 각 구간의 실제 거리(Segment Distance) 계산
        const segmentDistances = [];
        for (let i = 0; i < cumulativeDistances.length; i++) {
            if (i === 0) {
                segmentDistances.push(cumulativeDistances[0]); // 첫 구간은 누적값 그대로
            } else {
                segmentDistances.push(cumulativeDistances[i] - cumulativeDistances[i - 1]);
            }
        }

        // 🔥 총 거리 / 총 시간 (거리 비례 가중 평균) 방식으로 정확한 평속 계산
        players.forEach(p => {
            let totalDistance = 0;
            let totalTime = 0;

            p.data.forEach((speed, index) => {
                const segDist = segmentDistances[index] || 0;
                if (speed > 0 && segDist > 0) {
                    totalDistance += segDist;
                    totalTime += segDist / speed; // 시간 = 거리 / 속도
                }
            });

            // 총 이동 거리 / 총 소요 시간으로 전체 평균 속도 산출
            p.avg = totalTime > 0 ? Number((totalDistance / totalTime).toFixed(2)) : 0;
        });

        // HTML 생성
        const htmlContent = generateHtml({ distances: cumulativeDistances, players, title });

        // 파일 다운로드 응답
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // 파일명에 한글이 포함될 수 있으므로 encodeURIComponent 사용
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(title)}.html`);
        
        return res.status(200).send(htmlContent);

    } catch (error) {
        console.error("서버 에러:", error);
        return res.status(500).send("분석 중 오류 발생: " + error.message);
    }
}