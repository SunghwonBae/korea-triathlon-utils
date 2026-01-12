import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import fs from 'fs';

async function crawlTriathlonClubs() {
    const currentYear = 2026;
    const baseUrl = 'https://www.triathlon.or.kr/player/club/';
    // 상대 경로 링크 구성을 위한 베이스 URL
    const domainUrl = 'https://www.triathlon.or.kr/player/club/';
    const fileName = `triathlon_club_${currentYear}.json`;
    
    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    try {
        console.log(`${baseUrl} 접속 중...`);
        const listResponse = await axios.get(baseUrl, { httpsAgent: agent });
        
        // 목록 페이지용 cheerio 로드
        const $list = cheerio.load(listResponse.data);
        const detailLinks = [];

        // <ul class="club_list"> 내의 링크 추출
        $list('ul.club_list li a').each((_, el) => {
            const href = $list(el).attr('href');
            if (href && href.includes('mode=view')) {
                // './?sYear=...' 형태를 'https://www.triathlon.or.kr/player/club/?sYear=...' 형태로 변환
                const cleanHref = href.startsWith('./') ? href.substring(2) : href;
                const fullUrl = domainUrl + cleanHref;
                
                const match = href.match(/clubcd=(\d+)/);
                const clubcd = match ? match[1] : "";
                
                detailLinks.push({ url: fullUrl, clubcd: clubcd });
            }
        });

        if (detailLinks.length === 0) {
            console.log("클럽 링크를 찾지 못했습니다. 소스의 클래스명을 확인해주세요.");
            return;
        }

        console.log(`${detailLinks.length}개의 클럽을 발견했습니다. 데이터 추출을 시작합니다...`);

        const finalData = [];

        for (const item of detailLinks) {
            try {
                const { data } = await axios.get(item.url, { httpsAgent: agent });
                const $ = cheerio.load(data); // 상세 페이지용 cheerio 로드 ($ 정의)

                // 1. [지역] 및 [클럽명] 추출
                const fullTitle = $('h4.has-btn').text().replace('목록', '').trim();
                const regionMatch = fullTitle.match(/^\((.*?)\)/);
                const region = regionMatch ? regionMatch[1] : "";
                const clubName = fullTitle.replace(/^\((.*?)\)/, '').trim();

                // 2. [회장] 및 [총무] 추출
                let captain = "";
                let manager = "";
                $('th:contains("임원진")').next('td').find('p').contents().each((_, node) => {
                    if (node.type === 'text') {
                        const text = $(node).text().trim();
                        const prevTag = $(node).prev('em').text().trim();
                        if (prevTag === '회장') captain = text;
                        if (prevTag === '총무') manager = text;
                    }
                });

                // 3. [클럽사이트] 추출
                const clubUrl = $('th:contains("클럽사이트")').next('td').text().trim();

                // 4. [선수명단] 추출
                const memberNames = [];
                $('ul.club_player li strong').each((_, el) => {
                    memberNames.push($(el).text().trim());
                });

                finalData.push({
                    region: region,
                    clubcd: item.clubcd,
                    club: clubName,
                    captain: captain,
                    manager: manager,
                    url: clubUrl,
                    members: memberNames.join(', ')
                });

                console.log(`추출 완료: ${clubName}`);
            } catch (err) {
                console.error(`상세 페이지 오류 (${item.url}):`, err.message);
            }
        }

        // JSON 파일 저장
        fs.writeFileSync(fileName, JSON.stringify(finalData, null, 2), 'utf-8');
        console.log('--------------------------------------');
        console.log(`작업 완료! 파일명: ${fileName}`);
        
        // 결과 반환 형식 (res.status(200).send 용도)
        return finalData;

    } catch (error) {
        console.error('크롤링 중 치명적 오류 발생:', error.message);
    }
}

crawlTriathlonClubs();