export const generateHtml = (rawData) => {
    const displayTitle = rawData.title || "트라이애슬론 분석 리포트";

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${displayTitle}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: 'Noto Sans KR', sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #334155; }
        .container { max-width: 1400px; margin: 0 auto; } /* 컨테이너를 조금 더 넓게 조정 */
        header { text-align: center; margin-bottom: 40px; }
        header h1 { font-size: 2.2rem; color: #1e293b; margin-bottom: 8px; }
        
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 24px; padding: 24px; }
        .card-header { font-size: 1.15rem; font-weight: bold; margin-bottom: 20px; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        
        /* 🔥 수정된 부분: Flex 대신 Grid를 사용하여 정확히 5컬럼 유지 */
        .group-container { 
            display: grid; 
            grid-template-columns: repeat(5, 1fr); /* 무조건 5등분 */
            gap: 15px; 
            width: 100%;
        }

        .group-box { 
            background: #fff; 
            border: 1px solid #e2e8f0; 
            border-radius: 12px; 
            padding: 16px; 
            box-sizing: border-box; /* 패딩이 너비에 영향을 주지 않도록 설정 */
            height: fit-content;
        }

        /* 화면이 좁아질 때(태블릿/모바일) 대응 */
        @media (max-width: 1000px) {
            .group-container { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 600px) {
            .group-container { grid-template-columns: repeat(1, 1fr); }
        }
        
        .g-A { border-top: 5px solid #ef4444; } .g-B { border-top: 5px solid #f97316; }
        .g-C { border-top: 5px solid #eab308; } .g-D { border-top: 5px solid #22c55e; }
        .g-E { border-top: 5px solid #3b82f6; }
        
        .member-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #f1f5f9; font-size: 0.85rem; }
        .member-item:last-child { border-bottom: none; }
        .member-item b { color: #475569; white-space: nowrap; }

        .table-wrapper { overflow-x: auto; }
        table.heatmap { width: 100%; border-collapse: collapse; font-size: 12px; text-align: center; }
        table.heatmap th, table.heatmap td { border: 1px solid #e2e8f0; padding: 10px 5px; }
        
        .chart-container { position: relative; height: 350px; width: 100%; }
    </style>
</head>
<body>
<div class="container">
    <header>
        <h1>📊 ${displayTitle}</h1>
        <p>구간별 퍼포먼스 데이터 및 추천 그룹 리포트</p>
    </header>

    <div class="card">
        <div class="card-header">🚴 추천 라이딩 그룹 (평속 기준)</div>
        <div id="groupResult" class="group-container"></div>
    </div>
    
    <div class="card">
        <div class="card-header">🔥 구간별 페이스 히트맵</div>
        <div class="table-wrapper" id="tableContainer"></div>
    </div>

    <div class="card">
        <div class="card-header">📈 구간별 속도 변화 추이</div>
        <div class="chart-container"><canvas id="paceChart"></canvas></div>
    </div>

    <div class="card">
        <div class="card-header">🏆 전체 평균 속도 순위</div>
        <div class="chart-container"><canvas id="rankChart"></canvas></div>
    </div>

    <div class="card">
        <div class="card-header">🎯 퍼포먼스 안정성 분석 (기복)</div>
        <div class="chart-container"><canvas id="scatterChart"></canvas></div>
    </div>
</div>

<script>
    // ... 스크립트 로직 (이전 버전과 동일하되 scatterChart 포함 확인) ...
    const rawData = ${JSON.stringify(rawData)};

    const groups = [
        { name: 'A Group (Extreme)', min: 31, cls: 'g-A' },
        { name: 'B Group (Advanced)', min: 30, cls: 'g-B' },
        { name: 'C Group (Intermediate)', min: 28.5, cls: 'g-C' },
        { name: 'D Group (Regular)', min: 27, cls: 'g-D' },
        { name: 'E Group (Finish)', min: 0, cls: 'g-E' }
    ];
    const sorted = [...rawData.players].sort((a,b) => b.avg - a.avg);
    let gHtml = '';
    const playersToProcess = JSON.parse(JSON.stringify(sorted));
    groups.forEach(g => {
        const members = playersToProcess.filter(p => p.avg >= g.min && !p.used);
        members.forEach(p => p.used = true);
        // 멤버가 없더라도 5개의 칸을 유지하기 위해 div는 항상 생성 (선택 사항)
        // 여기서는 데이터가 있는 그룹만 표시하되 grid-column을 통해 정렬 유지
        if(members.length > 0) {
            gHtml += \`<div class="group-box \${g.cls}"><div style="font-weight:bold; margin-bottom:10px; font-size:0.95rem; color:#1e293b;">\${g.name}</div>\`;
            members.forEach(m => gHtml += \`<div class="member-item"><span>\${m.name}</span><b>\${m.avg} km/h</b></div>\`);
            gHtml += '</div>';
        } else {
            // 그룹에 사람이 없어도 칸을 채워 레이아웃 유지
            gHtml += \`<div class="group-box \${g.cls}" style="opacity: 0.3;"><div style="font-weight:bold; margin-bottom:10px; font-size:0.95rem;">\${g.name}</div><div style="font-size:0.8rem; color:#94a3b8;">해당 인원 없음</div></div>\`;
        }
    });
    document.getElementById('groupResult').innerHTML = gHtml;

    // 히트맵
    const allVals = rawData.players.flatMap(p => p.data);
    const minV = Math.min(...allVals.filter(v => v > 0)), maxV = Math.max(...allVals);
    let tHtml = '<table class="heatmap"><thead><tr><th>구간</th>' + rawData.players.map(p => \`<th>\${p.name}</th>\`).join('') + '</tr></thead><tbody>';
    rawData.distances.forEach((d, i) => {
        tHtml += \`<tr><td style="background:#f8fafc; font-weight:bold;">\${d}</td>\`;
        rawData.players.forEach(p => {
            const v = p.data[i] || 0;
            const ratio = (v - minV) / (maxV - minV);
            const color = v === 0 ? '#fff' : \`hsl(\${ratio * 120}, 80%, 85%)\`;
            tHtml += \`<td style="background-color:\${color}">\${v || '-'}</td>\`;
        });
        tHtml += '</tr>';
    });
    document.getElementById('tableContainer').innerHTML = tHtml + '</tbody></table>';

    // 차트 공통
    const colors = rawData.players.map((_, i) => \`hsla(\${i * (360/rawData.players.length)}, 70%, 50%, 0.8)\`);

    new Chart(document.getElementById('paceChart'), {
        type: 'line',
        data: {
            labels: rawData.distances.map(d => d+'km'),
            datasets: rawData.players.map((p, i) => ({ label: p.name, data: p.data, borderColor: colors[i], fill: false, tension: 0.3 }))
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    new Chart(document.getElementById('rankChart'), {
        type: 'bar',
        data: {
            labels: sorted.map(p => p.name),
            datasets: [{ label: '평균 속도', data: sorted.map(p => p.avg), backgroundColor: colors }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });

    function getSD(arr) {
        const v = arr.filter(x => x > 0);
        if(v.length < 2) return 0;
        const m = v.reduce((a,b)=>a+b)/v.length;
        return Math.sqrt(v.map(x=>Math.pow(x-m,2)).reduce((a,b)=>a+b)/v.length);
    }
    new Chart(document.getElementById('scatterChart'), {
        type: 'scatter',
        data: {
            datasets: [{
                label: '선수 데이터',
                data: rawData.players.map(p => ({ x: p.avg, y: getSD(p.data), name: p.name })),
                backgroundColor: colors, pointRadius: 7
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { title: { display:true, text:'평균 속도' } }, y: { title: { display:true, text:'기복(표준편차)' }, reverse: true } },
            plugins: { tooltip: { callbacks: { label: (c) => \` \${c.raw.name}: \${c.raw.x}km/h (기복: ±\${c.raw.y.toFixed(2)})\` } } }
        }
    });
</script>
</body>
</html>`;
};