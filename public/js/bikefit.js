import { PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.32";

const video = document.getElementById("input-video");
const canvas = document.getElementById("output-canvas");
const ctx = canvas.getContext("2d");
const resetBtn = document.getElementById("reset-btn");
const videoUpload = document.getElementById("video-upload");
const uploadLabel = document.getElementById("upload-label");
const debugLog = document.getElementById("debug-log");
const reportSection = document.getElementById("report-section");
const reportGrid = document.getElementById("report-grid");
const loadingOverlay = document.getElementById("loading-overlay");

let poseLandmarker;
let drawingUtils = new DrawingUtils(ctx);
let isLooping = false;
let frameCount = 0;
let lastVideoTime = -1;

let bestFrames = {
    maxExtension: { angle: 0, img: null, data: null },
    forwardPos: { dist: 0, img: null, data: null },
    maxFlexion: { angle: 360, img: null, data: null }
};

// [강화된 상세 로깅 함수]
function log(msg, type = "info") {
    const div = document.createElement("div");
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    const timeSpan = `<span class="log-time">[${time}]</span>`;
    
    if (type === "capture") {
        div.innerHTML = `${timeSpan} <span class="log-tag-cap">★ [캡처]</span> ${msg}`;
    } else if (type === "sys") {
        div.innerHTML = `${timeSpan} <span class="log-tag-sys">[시스템]</span> ${msg}`;
    } else {
        div.innerHTML = `${timeSpan} <span style="color:#00ff00;">></span> ${msg}`;
    }
    
    debugLog.appendChild(div);
    debugLog.scrollTop = debugLog.scrollHeight;
}

async function initAI() {
    try {
        loadingOverlay.style.display = "flex";
        log("MEDIAPIPE 포즈 엔진 초기화 중...", "sys");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm");
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO"
        });
        log("AI 엔진 로드 완료. 대기 모드 진입.", "sys");
        loadingOverlay.style.display = "none";
    } catch (err) { log("치명적 에러: " + err.message, "sys"); }
}

function calculateAngle(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x**2 + v1.y**2);
    const mag2 = Math.sqrt(v2.x**2 + v2.y**2);
    return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
}

function getProAdvice(k, s, point) {
    if (point === 'maxExtension') {
        if (s > 77) return `안장 10mm 전진 및 15mm 낮춤 처방. 먼 리치 교정 우선.`;
        if (k > 160) return `안장 10mm 후퇴 및 10mm 낮춤 처방. 고각도 안정성 확보.`;
        if (k > 143) return `안장 약 10mm 하향 조정을 권장합니다.`;
        return `이상적인 안장 높이가 감지되었습니다.`;
    } else if (point === 'forwardPos') {
        return s > 77 ? `어깨 스트레스 완화를 위해 암패드 15mm 후방 이동 권장.` : `상체 포지션이 안정적입니다.`;
    }
    return `매끄러운 페달링 궤적이 관찰됩니다.`;
}

function renderReport() {
    reportGrid.innerHTML = "";
    const points = [
        { key: 'maxExtension', title: '지점 1: 6시 방향 (최대 신전)' },
        { key: 'forwardPos', title: '지점 2: 3시 방향 (최대 전방)' },
        { key: 'maxFlexion', title: '지점 3: 12시 방향 (최대 굴곡)' }
    ];

    points.forEach(p => {
        const f = bestFrames[p.key];
        if (!f.data) return;
        const card = document.createElement("div");
        card.className = "report-card";
        card.innerHTML = `
            <img src="${f.img}">
            <div class="card-body">
                <h4 style="color:#0070f3; margin-top:0;">${p.title}</h4>
                <p style="font-size:14px; margin-bottom:12px;">무릎: ${f.data.knee.toFixed(1)}° / 어깨: ${f.data.shoulder.toFixed(1)}°</p>
                <div class="expert-box">${getProAdvice(f.data.knee, f.data.shoulder, p.key)}</div>
            </div>
        `;
        reportGrid.appendChild(card);
    });

    uploadLabel.innerText = "분석 완료";
    uploadLabel.className = "btn btn-success";
    reportSection.style.display = "block";
    resetBtn.style.display = "inline-block";
    window.scrollTo({ top: reportSection.offsetTop, behavior: 'smooth' });
}

async function renderLoop() {
    if (!isLooping) return;
    if ((video.ended || video.currentTime >= video.duration - 0.05) && video.currentTime > 0.1) {
        log("영상 종료. 최종 리포트 컴파일 중...", "sys");
        isLooping = false;
        renderReport();
        return;
    }

    try {
        if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const result = poseLandmarker.detectForVideo(video, video.currentTime * 1000);

            if (result.landmarks && result.landmarks.length > 0) {
                frameCount++;
                const lm = result.landmarks[0];
                const knee = calculateAngle(lm[24], lm[26], lm[28]);
                const shoulder = calculateAngle(lm[24], lm[12], lm[14]);
                const horizDist = Math.abs(lm[28].x - lm[24].x);

                // [빨간 관절 점 및 골격선 표시]
                drawingUtils.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#00ff00', lineWidth: 3 });
                drawingUtils.drawLandmarks(lm, { color: '#ff0000', radius: 3 });
                
                // 100프레임마다 로그 출력
                if (frameCount % 100 === 0) log(`분석 진행 중... 현재 시간: ${video.currentTime.toFixed(2)}초`);

                if (knee > bestFrames.maxExtension.angle) {
                    bestFrames.maxExtension = { angle: knee, img: canvas.toDataURL("image/jpeg", 0.7), data: { knee, shoulder } };
                    log(`최대 신전 갱신: ${knee.toFixed(1)}° (${video.currentTime.toFixed(2)}s)`, "capture");
                }
                if (horizDist > bestFrames.forwardPos.dist) {
                    bestFrames.forwardPos = { dist: horizDist, img: canvas.toDataURL("image/jpeg", 0.7), data: { knee, shoulder } };
                    log(`최적 전방 포지션 포착 (${video.currentTime.toFixed(2)}s)`, "capture");
                }
                if (knee < bestFrames.maxFlexion.angle) {
                    bestFrames.maxFlexion = { angle: knee, img: canvas.toDataURL("image/jpeg", 0.7), data: { knee, shoulder } };
                    log(`최대 굴곡 갱신: ${knee.toFixed(1)}° (${video.currentTime.toFixed(2)}s)`, "capture");
                }
            }
            lastVideoTime = video.currentTime;
        }
    } catch (err) {}
    requestAnimationFrame(renderLoop);
}

videoUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        uploadLabel.innerText = "분석 진행 중...";
        uploadLabel.style.background = "#adb5bd";
        videoUpload.disabled = true;
        
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        video.src = URL.createObjectURL(file);
        video.load();
        
        video.onloadedmetadata = () => {
            log(`파일 로드: ${file.name} [${sizeMB} MB]`, "sys");
            log(`해상도: ${video.videoWidth}x${video.videoHeight} / 재생 시간: ${video.duration.toFixed(1)}초`, "sys");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            log("분석 시퀀스 시작...", "sys");
            isLooping = true;
            video.currentTime = 0;
            video.play().then(() => renderLoop());
        };
    }
});

resetBtn.addEventListener("click", () => window.location.reload());

initAI();