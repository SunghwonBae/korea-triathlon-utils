const xlsx = require('xlsx');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// 1. 스피드칩 복호화 알고리즘 (난독화된 기록을 평문으로 변환)
function decryptData(secret) {
    if (!secret) return "";
    const _k = [154,152,159,156,239,236,159,146,153,157,152,233,158,159,157,233,147,154,232,146,159,233,152,155];
    let text = "";
    for (let i = 0; i < secret.length; i += 4) {
        let _c = parseInt(secret.substr(i, 4), 16);
        let _kCode = _k[(i / 4) % _k.length] ^ 170;
        text += String.fromCharCode(_c ^ _kCode);
    }
    return text;
}

// 2. 배열을 특정 크기로 쪼개는 유틸리티 함수 (병렬 처리용)
function chunkArray(array, size) {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

// ============================================================================
// 설정 변수
// ============================================================================
const EXCEL_FILE_PATH = '2026참가자명단홈페이지.xlsx'; // 원본 명단 파일명
const RESULT_FILE_NAME = '2026대구대회_기록결과.xlsx';   // 저장될 결과 파일명
const COMPETITION_ID = '202650000086';                 // 대회 고유 ID

// [주의] 브라우저 개발자 도구에서 복사한 가장 최신 쿠키 값을 여기에 넣어주세요.
// 실행 중 에러가 계속 발생하면 세션이 만료된 것이니 새 쿠키로 갱신해야 합니다.
const SPEEDCHIP_COOKIE = "ASPSESSIONIDCGCDDCDC=FOPKBENBPHLHANKOLPCCEMNG; _fwb=67pseHZHB6kVozB2mHCMXC.1778676074959; wcs_bt=19e5bb1326386e0:1778676080";
// ============================================================================

console.log('엑셀 파일을 읽는 중...');
const workbook = xlsx.readFile(EXCEL_FILE_PATH);
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];

// 엑셀 데이터를 JSON 배열로 변환
const participants = xlsx.utils.sheet_to_json(worksheet);

console.log(`총 ${participants.length}명의 명단을 확인했습니다. 기록 조회를 시작합니다.\n`);

async function fetchResults() {
    // 한 번에 동시에 처리할 인원 수 (서버 차단 방지를 위해 10명 권장)
    const BATCH_SIZE = 10; 
    const batches = chunkArray(participants, BATCH_SIZE);

    let processedCount = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Promise.all을 사용하여 10명을 동시에 비동기 처리
        await Promise.all(batch.map(async (p) => {
            const bibNumber = p['배번'];
            const name = p['이름'];

            if (!bibNumber || !name) return;

            try {
                const encodedName = encodeURIComponent(name);
                const url = `https://smartchip.co.kr/return_data_livephoto.asp?nameorbibno=${encodedName}&usedata=${COMPETITION_ID}`;

                const response = await axios.get(url, {
                    headers: {
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                        "accept-language": "ko,en-US;q=0.9,en;q=0.8",
                        "upgrade-insecure-requests": "1",
                        "cookie": SPEEDCHIP_COOKIE,
                        "Referer": `https://smartchip.co.kr/Search_Ballyno.html?usedata=${COMPETITION_ID}`
                    },
                    timeout: 5000 // 5초 무응답 시 에러 처리 (무한 대기 방지)
                });

                const html = response.data;
                const $ = cheerio.load(html);
                
                // 3. 종합기록 추출
                let totalTime = "기록없음";
                const targetClockMatch = html.match(/drawTextCanvas\("targetClock",\s*"([0-9A-F]+)"\)/);
                if (targetClockMatch && targetClockMatch[1]) {
                    totalTime = decryptData(targetClockMatch[1]);
                }
                
                p['종합기록'] = totalTime;
                console.log(`[${bibNumber}] ${name} - 종합기록: ${totalTime}`);

                // 4. 구간별 기록 추출 (Swim, T1, Bike, T2, Run)
                $('details').each((idx, el) => {
                    const titleSecret = $(el).find('summary span.img-text-cell').first().attr('data-secret');
                    const timeSecret = $(el).find('summary div span.img-text-cell').attr('data-secret');

                    if (titleSecret && timeSecret) {
                        const stageName = decryptData(titleSecret);
                        const stageTime = decryptData(timeSecret);
                        p[stageName] = stageTime; 
                        // 너무 길어지지 않게 구간 기록 로그는 생략하려면 아래 줄을 주석 처리하세요
                        console.log(`  └ ${stageName}: ${stageTime}`); 
                    }
                });
            } catch (error) {
                console.error(`[${bibNumber}] ${name} 조회 실패:`, error.message);
                p['종합기록'] = "조회실패";
            }
        }));

        processedCount += batch.length;
        console.log(`=========================================`);
        console.log(`[진행 상황] ${processedCount} / ${participants.length} 명 처리 완료...`);
        console.log(`=========================================`);

        // 다음 10명을 처리하기 전에 서버 보호를 위해 1초 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n모든 기록 조회가 완료되었습니다.');

    // 5. 결과를 새로운 엑셀 파일로 저장
    console.log(`결과를 [${RESULT_FILE_NAME}] 파일에 저장합니다...`);
    const newWorksheet = xlsx.utils.json_to_sheet(participants);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, "기록결과");
    
    xlsx.writeFile(newWorkbook, RESULT_FILE_NAME);
    
    console.log(`성공적으로 저장되었습니다!`);
}

// 스크립트 실행
fetchResults();