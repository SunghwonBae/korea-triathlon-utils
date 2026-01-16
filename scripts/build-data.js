const fs = require('fs');
const path = require('path');

// ==========================================
// 1. 내장 한글 로마자 변환기 (라이브러리 대체)
// ==========================================
const CHO = [
    'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'
];
const JUNG = [
    'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'
];
const JONG = [
    '', 'k', 'k', 'ks', 'n', 'nj', 'nh', 'd', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'
];

function romanize(text) {
    if (!text) return "";
    let result = "";
    
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        // 한글인지 확인 (가 ~ 힣)
        if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
            const code = charCode - 0xAC00;
            const cho = Math.floor(code / 588);
            const jung = Math.floor((code % 588) / 28);
            const jong = code % 28;
            
            // 로마자 조합 규칙 (간이 버전)
            // 1. 초성 ㅇ 처리: 없으므로 생략 (이름 '이' -> 'i' 등 자연스러운 변환 위해)
            // 2. ㄹ 처리: 초성은 'r', 종성은 'l' (기본 규칙)
            // 실제 이름 표기는 다양하므로 검색용 '유사 발음' 생성에 집중합니다.
            
            result += CHO[cho] + JUNG[jung] + JONG[jong];
        } else {
            result += text[i]; // 한글 아니면 그대로 (공백, 영어 등)
        }
    }
    // 이름 검색 편의를 위해 소문자로 통일하고 공백 제거
    return result.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ==========================================
// 2. 설정 및 헬퍼 함수
// ==========================================

const DATA_DIRS = {
    ironman: path.join(__dirname, '../public/data/ironman'),
    triathlon: path.join(__dirname, '../public/data/triathlon'),
    challenge: path.join(__dirname, '../public/data/challenge')
};
const OUTPUT_FILE = path.join(__dirname, '../public/data/all_records.json');

// 초(Seconds)를 "HH:MM:SS" 형식으로 변환
function formatSeconds(seconds) {
    if (!seconds || isNaN(seconds)) return "DNF"; 
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// 텍스트 시간 정규화 (H:MM:SS -> HH:MM:SS)
function normalizeTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return "DNF";
    // "10:30" 처럼 초가 없는 경우나 "1:20:30" 처리
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
        return parts.map(p => p.padStart(2, '0')).join(':');
    }
    return timeStr;
}

const hmsToS = (s) => { 
    if (typeof s === 'number') return s;
    if (!s) return 0;
    if (typeof s === 'string') {
        if (s.includes(':')) {
            const p = s.split(':').map(Number); 
            if(p.length===3) return p[0]*3600+p[1]*60+p[2];
            if(p.length===2) return p[0]*60+p[1];
        }
        const f = parseFloat(s);
        return isNaN(f) ? 0 : f;
    }
    return 0; 
};
let allRecords = [];

// ==========================================
// 3. 데이터 처리 로직
// ==========================================

// [A] Ironman 데이터 처리
if (fs.existsSync(DATA_DIRS.ironman)) {
    console.log("Processing Ironman Data...");
    fs.readdirSync(DATA_DIRS.ironman).forEach(file => {
        if (!file.endsWith('.json')) return;
        try {
            const data = JSON.parse(fs.readFileSync(path.join(DATA_DIRS.ironman, file), 'utf-8'));
            const raceNameRaw = file.replace('.json', '');
            const yearMatch = raceNameRaw.match(/\d{4}/);
            const year = yearMatch ? yearMatch[0] : "";
            
            let raceType = 'Ironman';
            if (raceNameRaw.toLowerCase().includes('half') || raceNameRaw.includes('70.3')) {
                raceType = 'Half';
            }

            data.forEach(row => {
                const memoryItem = { ...row, raceName: raceNameRaw, raceYear: year, raceType: raceType, source:'ironman' }
                allRecords.push(memoryItem);
            });
        } catch (e) { console.error(`Error reading ${file}:`, e.message); }
    });
}

// [B] Triathlon (협회) 데이터 처리
if (fs.existsSync(DATA_DIRS.triathlon)) {
    console.log("Processing Triathlon Data...");
    fs.readdirSync(DATA_DIRS.triathlon).forEach(file => {
        if (!file.endsWith('.json')) return;
        try {
            const data = JSON.parse(fs.readFileSync(path.join(DATA_DIRS.triathlon, file), 'utf-8'));
            const raceNameRaw = file.replace('.json', '');
            const yearMatch = raceNameRaw.match(/\d{4}/);
            const year = yearMatch ? yearMatch[0] : "";

            let raceType = 'Olympic';
            if (raceNameRaw.toLowerCase().includes('half') || raceNameRaw.includes('70.3')) {
                raceType = 'Half';
            }

            let raceData;
            raceData = data.map(item => ({
                    b: item.b,
                    n: item.n,
                    d: item.category,
                    c: item.c,
                    t: hmsToS(item.t),
                    s: hmsToS(item.s),
                    t1: hmsToS(item.t1),
                    bk: hmsToS(item.b1), // b1 -> bk
                    t2: hmsToS(item.t2),
                    rn: hmsToS(item.r),  // r -> rn
                    ra: parseInt(item.rank) || 9999, // Category Rank
                    q: (parseInt(item.rank) <= 5) ? '1' : '0' // Top 5 as Qualified
                })).filter(v => v.t > 0);
            raceData.forEach(row => {
                const memoryItem = { ...row, raceName: raceNameRaw, raceYear: year, raceType: raceType, source:'triathlon' }
                allRecords.push(memoryItem);
            });
        } catch (e) { console.error(`Error reading ${file}:`, e.message); }
    });
}

// [C] Challenge 데이터 처리
if (fs.existsSync(DATA_DIRS.challenge)) {
    console.log("Processing Challenge Data...");
    fs.readdirSync(DATA_DIRS.challenge).forEach(file => {
        if (!file.endsWith('.json')) return;
        try {
            const data = JSON.parse(fs.readFileSync(path.join(DATA_DIRS.challenge, file), 'utf-8'));
            const raceNameRaw = file.replace('.json', '');
            const yearMatch = raceNameRaw.match(/\d{4}/);
            const year = yearMatch ? yearMatch[0] : "";

            let raceType = 'Ironman';
            if (raceNameRaw.toLowerCase().includes('half') || raceNameRaw.includes('70.3')) {
                raceType = 'Half';
            }
            const sample = data[0];
            const keys = Object.keys(sample);
            const norm = k => k.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
            
            const findCol = (candidates) => {
                for (const c of candidates) {
                    const exact = keys.find(k => norm(k) === norm(c));
                    if (exact) return exact;
                }
                for (const c of candidates) {
                    const partial = keys.find(k => norm(k).includes(norm(c)));
                    if (partial) return partial;
                }
                return null;
            };

            // 2025년 데이터 포맷 감지 (Start Swim, Finish Swim 등이 존재하는지)
            const is2025 = findCol(['startswim']) && findCol(['finishswim']);

            let map;
            if (is2025) {
                map = {
                    b: findCol(['b', 'bib', 'no', 'number', '배번호']) || 'b',
                    n: findCol(['n', 'name', 'athlete', 'user', '한글이름', '이름']) || 'n',
                    d: findCol(['category', 'division', 'age', 'group', 'd', '카테고리', '부문']) || 'd',
                    c: findCol(['state', 'club', 'team', '소속', '클럽','단체명']) || 'State',
                    ss: findCol(['startswim']),
                    fs: findCol(['finishswim']),
                    sb: findCol(['startbike']),
                    fb: findCol(['finishbike']),
                    sr: findCol(['runstart']),
                    fr: findCol(['finish']),
                    t: findCol(['total', 'chip', 'time', 't', '칩타임', '합계']) || 't',
                    ra: findCol(['rank', 'overall', 'placecat', '부문순위', '순위']) || 'rank'
                };
            } else {
                map = {
                    b: findCol(['b', 'bib', 'no', 'number', '배번호']) || 'b',
                    n: findCol(['n', 'name', 'athlete', 'user', '한글이름', '이름']) || 'n',
                    d: findCol(['category', 'division', 'age', 'group', 'd', '카테고리', '부문']) || 'd',
                    c: findCol(['State','단체']) || 'c',
                    s: findCol(['swim', 's', 'finishswim', '수영','Stage1']) || 's',
                    t1: findCol(['t1', 'trans1', 'startbike']) || 't1',
                    bk: findCol(['bike', 'cycle', 'b1', 'bk', 'finishbike', '사이클','Stage2']) || 'bk',
                    t2: findCol(['t2', 'trans2', 'runstart']) || 't2',
                    rn: findCol(['run', 'r', 'rn', '런', '달리기', 'finish','Stage3']) || 'rn',
                    t: findCol(['total', 'chip', 'time', 't', '칩타임', '합계', 'RaceTime']) || 't',
                    ra: findCol(['rank', 'overall', 'placecat', '부문순위', '순위']) || 'rank'
                };
            }
            let raceData;
            raceData = data.map(item => {
                let s, t1, bk, t2, rn, t;
                if (is2025) {
                    const getT = (k) => hmsToS(item[k]);
                    const ss = getT(map.ss);
                    const fs = getT(map.fs);
                    const sb = getT(map.sb);
                    const fb = getT(map.fb);
                    const sr = getT(map.sr);
                    const fr = getT(map.fr);

                    s = (fs > ss) ? fs - ss : 0;
                    t1 = (sb > fs) ? sb - fs : 0;
                    bk = (fb > sb) ? fb - sb : 0;
                    t2 = (sr > fb) ? sr - fb : 0;
                    rn = (fr > sr) ? fr - sr : 0;
                    t = hmsToS(item[map.t]);
                } else {
                    s = hmsToS(item[map.s]);
                    t1 = hmsToS(item[map.t1]);
                    bk = hmsToS(item[map.bk]);
                    t2 = hmsToS(item[map.t2]);
                    rn = hmsToS(item[map.rn]);
                    t = hmsToS(item[map.t]);
                }

                return {
                    b: item[map.b],
                    n: item[map.n],
                    d: item[map.d],
                    c: item[map.c],
                    s: s,
                    t1: t1,
                    bk: bk,
                    t2: t2,
                    rn: rn,
                    t: t,
                    ra: parseInt(item[map.ra]) || 9999,
                    q: (parseInt(item[map.ra]) <= 5) ? '1' : '0'
                };
            }).filter(v => v.t > 0);


            raceData.forEach(row => {
                const memoryItem = { ...row, raceName: raceNameRaw, raceYear: year, raceType: raceType, source:'challenge' }
                allRecords.push(memoryItem);
            });
        } catch (e) { console.error(`Error reading ${file}:`, e.message); }
    });
}

// ==========================================
// 4. 인덱스 최적화 및 저장
// ==========================================

const optimizedRecords = allRecords.map(record => {
    // 검색 정규화: 소문자 + 공백제거
    const n = (record.n || "").toLowerCase().replace(/[^a-z0-9]/g, '');
    const bib = (record.bib || record.b || "");
    
    // 로마자 변환된 한글 이름도 검색 키에 포함 (예: "HongGilDong")
    const romanizedKr = romanize(record.n);
    const club = (record.c || "").toLowerCase().replace(/\s/g, '');

    return {
        ...record,
        // 검색 키: [영어이름] | [한글이름] | [배번호] | [한글발음로마자] | [클럽명]
        searchKey: `${n}|${bib}|${romanizedKr}|${club}`
    };
}); 

// 폴더가 없으면 생성
// const outputDir = path.dirname(OUTPUT_FILE);
// if (!fs.existsSync(outputDir)) {
//     fs.mkdirSync(outputDir, { recursive: true });
// }

// fs.writeFileSync(OUTPUT_FILE, JSON.stringify(optimizedRecords));

// console.log(`\n[SUCCESS] 통합 데이터 생성 완료!`);
// console.log(`- 저장 경로: ${OUTPUT_FILE}`);
// console.log(`- 총 데이터: ${optimizedRecords.length}건`);
// console.log(`- 내장 한글 로마자 변환기 적용됨 (npm 설치 필요없음).`);


// ==========================================
// 5. [NEW] 대회별 메타 데이터(통계) 생성
// ==========================================
console.log("Generating Race Metadata...");

const raceMetaMap = {};

optimizedRecords.forEach(rec => {
    const key = rec.raceName; // 대회명 기준 그룹핑
    
    if (!raceMetaMap[key]) {
        raceMetaMap[key] = {
            id: key,
            name: rec.raceName,
            year: rec.raceYear,
            type: rec.raceType,
            count: 0,
            sumT: 0, sumS: 0, sumB: 0, sumR: 0, // 합계 (평균 계산용)
            countS: 0, countB: 0, countR: 0 // 완주자 수 (평균 계산용)
        };
    }

    const meta = raceMetaMap[key];
    meta.count++;
    
    // 전체 시간
    if (rec.t > 0) meta.sumT += rec.t;
    
    // 종목별 시간 (0보다 큰 경우만)
    if (rec.s > 0) { meta.sumS += rec.s; meta.countS++; }
    if (rec.bk > 0) { meta.sumB += rec.bk; meta.countB++; }
    if (rec.rn > 0) { meta.sumR += rec.rn; meta.countR++; }
});

// 평균값 계산 및 배열로 변환
const raceMetaList = Object.values(raceMetaMap).map(m => ({
    id: m.id,
    name: m.name,
    year: m.year,
    type: m.type,
    participants: m.count,
    avgTotal: m.count > 0 ? Math.round(m.sumT / m.count) : 0,
    avgSwim: m.countS > 0 ? Math.round(m.sumS / m.countS) : 0,
    avgBike: m.countB > 0 ? Math.round(m.sumB / m.countB) : 0,
    avgRun: m.countR > 0 ? Math.round(m.sumR / m.countR) : 0
})).sort((a, b) => b.year - a.year); // 최신순 정렬

// ==========================================
// 6. 파일 저장
// ==========================================

const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 1. 전체 검색용 데이터
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(optimizedRecords));

// 2. [NEW] 통계 분석용 메타 데이터
const META_FILE = path.join(outputDir, 'race_meta.json');
fs.writeFileSync(META_FILE, JSON.stringify(raceMetaList));

console.log(`\n[SUCCESS] 데이터 생성 완료!`);
console.log(`- 전체 기록: ${OUTPUT_FILE} (${optimizedRecords.length}건)`);
console.log(`- 대회 정보: ${META_FILE} (${raceMetaList.length}개 대회)`);