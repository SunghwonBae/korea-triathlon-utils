import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Vercel 함수 타임아웃 설정 (최대 60초)
export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // GET 요청에서 배번(bib)과 URL 패턴 받기
  const { bib, urlTemplate } = req.query;

  if (!bib || !urlTemplate) {
    return res.status(400).json({ error: 'Bib and urlTemplate are required' });
  }

  const targetUrl = urlTemplate.replace('{bib}', bib);
  let browser = null;

  try {
    // Vercel(AWS Lambda) 환경에 맞는 크롬 실행 경로 설정
    // 로컬 테스트 시에는 별도의 크롬 경로가 필요할 수 있으나, 
    // Vercel 배포를 우선순위로 둡니다.
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // 1. 리소스 최적화: 이미지, 폰트, 스타일시트 로딩 차단 (속도 향상)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 2. 페이지 접속 (최대 15초 대기)
    // waitUntil: 'domcontentloaded'는 HTML 구조가 다 로딩되면 즉시 진행
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 3. Race Splits 데이터 로딩 대기 (선택적)
    // 데이터가 늦게 뜨는 경우를 대비해 h3 태그가 생길 때까지 잠시 기다림
    try {
        await page.waitForSelector('h3', { timeout: 4000 });
    } catch(e) {
        // 타임아웃 되어도 기본 정보라도 긁기 위해 에러 무시하고 진행
    }

    // 4. 브라우저 내부에서 데이터 추출
    const data = await page.evaluate(() => {
        let result = { 
            name: 'Unknown', 
            swim: '-', t1: '-', bike: '-', t2: '-', run: '-', total: 'DNS/DNF' 
        };
        
        // (1) 이름 추출
        const nameEl = document.querySelector('h1');
        if (nameEl) result.name = nameEl.innerText.trim();
        
        // (2) Race Splits 테이블 파싱
        const headings = Array.from(document.querySelectorAll('h3'));
        const splitHeader = headings.find(h => h.innerText.includes('Race Splits'));
        
        if (splitHeader) {
            // Race Splits 헤더 근처나 전체 문서에서 .row.mx-0 찾기
            const rows = Array.from(document.querySelectorAll('.row.mx-0'));
            let transitionCount = 0;

            rows.forEach(row => {
                const text = row.innerText;
                const cols = row.querySelectorAll('.col');
                if (cols.length === 0) return;
                
                // 시간 값은 보통 마지막 컬럼에 위치
                const timeVal = cols[cols.length - 1].innerText.replace(/\n/g, '').trim();

                if (!timeVal || timeVal === '--') return;

                if (text.includes('Swim')) result.swim = timeVal;
                else if (text.includes('Bike') || text.includes('Cycle')) result.bike = timeVal;
                else if (text.includes('Run')) result.run = timeVal;
                else if (text.includes('Transition')) {
                    transitionCount++;
                    if (transitionCount === 1) result.t1 = timeVal;
                    else if (transitionCount === 2) result.t2 = timeVal;
                } else if (text.includes('Full Course') || text.includes('Finish')) {
                    result.total = timeVal;
                }
            });
        }
        return result;
    });

    // 성공 응답
    res.status(200).json({ bib, ...data });

  } catch (error) {
    console.error('Scraping Error:', error);
    res.status(500).json({ error: 'Failed to scrape', details: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}