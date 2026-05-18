const xlsx = require('xlsx');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { chromium } = require('playwright'); // Playwright 추가

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);

// [업데이트됨] 양산대회용 디코딩 알고리즘
    function decryptData(secret) {
        if (!secret) return "";
        const _k = [157,152,155,159,158,233,157,153,155,154,147,146,158,146,147,239,235,236,232,155,239,154,239,156];
        let text = "";
        let _s = 0, _i = 0, _c = 0, _kCode = 0;

        if (_k.length > 0) {
            while(_s !== 99) {
                switch(_s) {
                    case 0:
                        _s = (_i < secret.length) ? 1 : 99;
                        break;
                    case 1:
                        _c = parseInt(secret.substr(_i, 4), 16);
                        _s = 2;
                        break;
                    case 2:
                        _kCode = _k[(_i / 4) % _k.length] ^ 170;
                        _s = 3;
                        break;
                    case 3:
                        text += String.fromCharCode(_c ^ _kCode);
                        _i += 4;
                        _s = 0;
                        break;
                }
            }
        }
        return text;
    }

async function selectFile(ext, description) {
    const files = fs.readdirSync(__dirname).filter(file => file.endsWith(ext) && !file.includes('_기록결과'));
    if (files.length === 0) {
        console.error(`❌ 현재 폴더에 ${description} 파일(${ext})이 없습니다.`);
        process.exit(1);
    }
    console.log(`\n[ ${description} 파일 선택 ]`);
    files.forEach((file, idx) => console.log(`${idx + 1}. ${file}`));
    
    let selected = null;
    while (!selected) {
        const answer = await askQuestion(`사용할 파일의 번호를 입력하세요 (1-${files.length}): `);
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < files.length) {
            selected = files[index];
        } else {
            console.log('⚠️ 잘못된 번호입니다. 다시 입력해주세요.');
        }
    }
    return selected;
}

function parseFetchData(txtPath) {
    const content = fs.readFileSync(txtPath, 'utf-8');
    const usedataMatch = content.match(/usedata=(\d+)/);
    return usedataMatch ? usedataMatch[1] : null;
}

async function main() {
    console.log('================================================');
    console.log(' 🛡️ Cloudflare 우회 탑재 스마트칩 크롤러 시작 ');
    console.log('================================================');

    const excelFile = await selectFile('.xlsx', '참가자 명단 엑셀');
    const txtFile = await selectFile('.txt', '스마트칩 호출 정보');
    rl.close();

    const baseName = path.basename(excelFile, '.xlsx');
    const RESULT_EXCEL_NAME = `${baseName}_기록결과.xlsx`;
    const RESULT_JSON_NAME = `${baseName}_기록결과.json`;

    const COMPETITION_ID = parseFetchData(txtFile);
    if (!COMPETITION_ID) {
        console.error('❌ TXT 파일에서 대회 ID(usedata)를 찾을 수 없습니다.');
        return;
    }

    console.log('엑셀 파일을 읽는 중...');
    const workbook = xlsx.readFile(excelFile);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const participants = xlsx.utils.sheet_to_json(worksheet);

    console.log(`\n🌐 실제 브라우저를 실행하여 봇 방어막을 해제합니다...`);
    
    const browser = await chromium.launch({ headless: false }); 
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    console.log(`\n🚨 [주의] 브라우저 창이 열립니다!`);
    console.log(`🚨 '사람인지 확인' 체크박스가 나오면 직접 클릭해서 통과해주세요.`);
    console.log(`⏳ 15초 동안 대기합니다...\n`);

    await page.goto(`https://smartchip.co.kr/Search_Ballyno.html?usedata=${COMPETITION_ID}`);
    await page.waitForTimeout(15000); 

    console.log(`✅ 방어막 해제 완료! 백그라운드 통신으로 총 ${participants.length}명의 기록 조회를 시작합니다.\n`);

    // 💡 크롤링 핵심 로직을 함수로 분리 (재사용을 위해)
    async function fetchRecord(p) {
        const bibNumber = p['배번'];
        const name = p['이름'];

        if (!bibNumber || !name) return;

        try {
            const encodedName = encodeURIComponent(name);
            const url = `https://smartchip.co.kr/return_data_livephoto.asp?nameorbibno=${encodedName}&usedata=${COMPETITION_ID}`;

            const response = await context.request.get(url, {
                headers: {
                    "Referer": `https://smartchip.co.kr/Search_Ballyno.html?usedata=${COMPETITION_ID}`
                }
            });
            
            const html = await response.text();
            const $ = cheerio.load(html);
            
            let totalTime = "기록없음";
            const targetClockMatch = html.match(/drawTextCanvas\("targetClock",\s*"([0-9A-F]+)"\)/);
            if (targetClockMatch && targetClockMatch[1]) {
                totalTime = decryptData(targetClockMatch[1]);
            }
            p['종합기록'] = totalTime;

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
    }

    // ==========================================
    // 1. 전체 인원 1차 순회
    // ==========================================
    let processedCount = 0;
    for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        
        await fetchRecord(p); // 데이터 수집 함수 호출

        processedCount++;
        console.log(`[진행 상황] ${processedCount} / ${participants.length} 명 처리 완료... (${p['이름']} : ${p['종합기록']})`);
        
        await randomDelay(1500, 3000);
    }
    console.log('\n✅ 1차 모든 기록 조회가 완료되었습니다.');

    // ==========================================
    // 2. 초기 15명 재조회 (누락 보완)
    // ==========================================
    const retryLimit = Math.min(15, participants.length); // 인원이 15명 미만일 경우를 대비
    console.log(`\n🔄 통신 안정화 전 누락되었을 수 있는 초기 ${retryLimit}명의 기록을 다시 조회하여 덮어씁니다...`);
    
    for (let i = 0; i < retryLimit; i++) {
        const p = participants[i];
        
        await fetchRecord(p); // 동일한 함수로 재수집 및 덮어쓰기

        console.log(`[보완 재조회] ${i + 1} / ${retryLimit} 명 재처리 완료... (${p['이름']} : ${p['종합기록']})`);
        
        await randomDelay(1500, 3000);
    }
    console.log('\n✅ 초기 누락 보완 조회가 완료되었습니다.');


    // ==========================================
    // 3. 파일 저장 로직
    // ==========================================
    const validParticipants = participants.filter(p => 
        p['Swim'] && p['T1'] && p['Bike'] && p['T2'] && p['Run'] && 
        p['종합기록'] && p['종합기록'] !== '기록없음' && p['종합기록'] !== '조회실패'
    );

    const groupedByCategory = {};
    validParticipants.forEach(p => {
        const category = p['신청부'] || '기타';
        if (!groupedByCategory[category]) {
            groupedByCategory[category] = [];
        }
        groupedByCategory[category].push(p);
    });

    const finalJsonData = [];
    for (const category in groupedByCategory) {
        const group = groupedByCategory[category];
        const randomSPartId = Math.floor(10000 + Math.random() * 90000).toString();
        
        group.sort((a, b) => a['종합기록'].localeCompare(b['종합기록']));

        group.forEach((p, index) => {
            finalJsonData.push({
                category: category,
                rank: (index + 1).toString(),
                n: p['이름'],
                b: p['배번'].toString(),
                c: p['팀명'] || '',
                s: p['Swim'],
                t1: p['T1'],
                b1: p['Bike'],
                t2: p['T2'],
                r: p['Run'],
                t: p['종합기록'],
                sPartId: randomSPartId 
            });
        });
    }

    fs.writeFileSync(RESULT_JSON_NAME, JSON.stringify(finalJsonData, null, 2), 'utf-8');
    console.log(`✅ JSON 파일 저장 완료: ${RESULT_JSON_NAME} (총 ${finalJsonData.length}명)`);

    const newWorksheet = xlsx.utils.json_to_sheet(participants);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, "기록결과");
    
    xlsx.writeFile(newWorkbook, RESULT_EXCEL_NAME);
    console.log(`✅ 엑셀 파일 저장 완료: ${RESULT_EXCEL_NAME}`);

    await browser.close();
}

main();