const xlsx = require('xlsx');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// 1. 스피드칩 복호화 알고리즘
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

// 2. 배열 청크 분할 함수 (병렬 처리용)
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
const EXCEL_FILE_PATH = '2026참가자명단홈페이지.xlsx'; 
const RESULT_EXCEL_NAME = '2026대구대회_기록결과.xlsx';   
const RESULT_JSON_NAME = '대구대회_2026.json';
const COMPETITION_ID = '202650000086';                 

// [주의] 브라우저 개발자 도구에서 복사한 가장 최신 쿠키 값을 여기에 넣어주세요.
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
    const BATCH_SIZE = 10; 
    const batches = chunkArray(participants, BATCH_SIZE);
    let processedCount = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
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
                    timeout: 5000 
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

                // 4. 구간별 기록 추출 (Swim, T1, Bike, T2, Run)
                $('details').each((idx, el) => {
                    const titleSecret = $(el).find('summary span.img-text-cell').first().attr('data-secret');
                    const timeSecret = $(el).find('summary div span.img-text-cell').attr('data-secret');

                    if (titleSecret && timeSecret) {
                        const stageName = decryptData(titleSecret);
                        const stageTime = decryptData(timeSecret);
                        p[stageName] = stageTime; 
                    }
                });
            } catch (error) {
                console.error(`[${bibNumber}] ${name} 조회 실패:`, error.message);
                p['종합기록'] = "조회실패";
            }
        }));

        processedCount += batch.length;
        console.log(`[진행 상황] ${processedCount} / ${participants.length} 명 처리 완료...`);

        // 다음 배치를 처리하기 전 1초 대기 (서버 차단 방지)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n모든 기록 조회가 완료되었습니다.');

    // ============================================================================
    // 5. JSON 데이터 가공 로직 추가 (요청하신 형식에 맞춤)
    // ============================================================================
    console.log('JSON 데이터를 생성하는 중입니다...');
    
    // ① 3종 및 T1, T2 기록이 모두 존재하는 선수만 필터링
    const validParticipants = participants.filter(p => 
        p['Swim'] && p['T1'] && p['Bike'] && p['T2'] && p['Run'] && 
        p['종합기록'] && p['종합기록'] !== '기록없음' && p['종합기록'] !== '조회실패'
    );

    // ② 신청부(카테고리)별로 그룹화
    const groupedByCategory = {};
    validParticipants.forEach(p => {
        const category = p['신청부'] || '기타';
        if (!groupedByCategory[category]) {
            groupedByCategory[category] = [];
        }
        groupedByCategory[category].push(p);
    });

    const finalJsonData = [];

    // ③ 카테고리별로 정렬, 순위 부여, sPartId 부여
    for (const category in groupedByCategory) {
        const group = groupedByCategory[category];
        
        // 카테고리별 임의의 5자리 숫자 생성 (10000 ~ 99999)
        const randomSPartId = Math.floor(10000 + Math.random() * 90000).toString();

        // 종합기록(HH:MM:SS)을 기준으로 오름차순 정렬
        group.sort((a, b) => a['종합기록'].localeCompare(b['종합기록']));

        // 형식에 맞게 매핑하여 최종 배열에 푸시
        group.forEach((p, index) => {
            finalJsonData.push({
                category: category,
                rank: (index + 1).toString(), // 1등부터 순차적으로 부여
                n: p['이름'],
                b: p['배번'].toString(),
                c: p['팀명'] || '',
                s: p['Swim'],
                t1: p['T1'],
                b1: p['Bike'],
                t2: p['T2'],
                r: p['Run'],
                t: p['종합기록'],
                sPartId: randomSPartId // 동일 카테고리는 같은 값 부여됨
            });
        });
    }

    // JSON 파일로 저장
    fs.writeFileSync(RESULT_JSON_NAME, JSON.stringify(finalJsonData, null, 2), 'utf-8');
    console.log(`[성공] JSON 파일 저장 완료: ${RESULT_JSON_NAME} (총 ${finalJsonData.length}명)`);


    // ============================================================================
    // 6. 결과를 새로운 엑셀 파일로 저장
    // ============================================================================
    console.log(`결과를 엑셀 파일에 저장합니다...`);
    const newWorksheet = xlsx.utils.json_to_sheet(participants);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, "기록결과");
    
    xlsx.writeFile(newWorkbook, RESULT_EXCEL_NAME);
    console.log(`[성공] 엑셀 파일 저장 완료: ${RESULT_EXCEL_NAME}`);
}

// 스크립트 실행
fetchResults();