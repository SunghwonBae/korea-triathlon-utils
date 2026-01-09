
프로젝트: Korea Triathlon Utils — Copilot 안내서

목적
- AI 코딩 에이전트가 이 저장소에서 빠르게 생산성을 낼 수 있도록, 구조·데이터 흐름·관습을 요약합니다.

핵심 포인트 (수정 전 읽어주세요)
- 이 프로젝트는 Next.js 앱입니다. 페이지 라우트는 `pages/`에, API 라우트는 `pages/api/`에 위치합니다.
- 관리자용 HTML, 계산기, 정적 데이터는 `public/`에 있습니다. 데이터 JSON은 `public/data/` 아래의 `triathlon`, `ironman`, `challenge` 하위폴더에 저장됩니다.
- 서버 측 유틸과 HTML 생성기는 `lib/template.js`에 있으며, 업로드 → HTML 변환 흐름은 `pages/api/convert.js`가 담당합니다.
- 데이터 조회 API 예시는 `pages/api/triathlon_files.js`를 참고하세요 — 이 API들은 `public/data/*`의 파일을 직접 읽습니다.

아키텍처 & 데이터 플로우(간단 요약)
- 프론트엔드: `pages/`의 Next.js 페이지들이 UI를 렌더링하며, 관리자 도구는 종종 `public/`에 있는 정적 HTML을 사용합니다.
- 서버/API: Next API 라우트는 서버(Node)에서 실행되며 `fs` 동기 호출로 `public/data/*`를 읽어 JSON이나 생성된 HTML을 반환합니다.
- 데이터: 새로운 레코드나 대회를 추가하려면 `public/data/{triathlon,ironman,challenge}`에 UTF-8 인코딩의 JSON 파일을 추가하세요. DB는 없습니다.
- 리포트 생성: `pages/api/convert.js`는 업로드된 Excel을 파싱해 `{ distances, players, title }` 형태를 만들고 `lib/template.js`의 `generateHtml`을 호출해 HTML을 생성합니다.

프로젝트 특이 관례
- 데이터 파일 위치: 항상 `public/data/<카테고리>/`에 JSON을 두세요. 파일명/내용에 한글이 자주 사용됩니다.
- API 코드 스타일: 기존 코드가 `fs.*Sync` 같은 동기 파일 API를 사용하므로, 서버 전용 API 핸들러 내에서 동기 호출을 사용하는 패턴을 따르세요.
- 업로드 처리: `pages/api/convert.js`처럼 바디 파서를 끄고(`export const config = { api: { bodyParser: false } }`) `formidable`로 multipart를 파싱합니다.
- 템플릿 입력 형태: `generateHtml`에 넘기는 데이터는 `{ distances: [...], players: [{ name, data:[...], avg }, ...], title }` 형태여야 합니다.
- 파일명/응답 인코딩: 한글 파일명 처리 때문에 응답에는 `charset=utf-8`을 사용하고 `encodeURIComponent`로 파일명을 인코딩하는 패턴이 있습니다.

개발 작업 흐름 & 명령어
- 개발 서버 실행: `npm run dev` (Next.js dev)
- 빌드/배포 테스트: `npm run build` 이후 `npm run start`로 프로덕션 서버 실행
- 린트: `npm run lint` (`eslint` 사용, 설정은 `eslint.config.mjs`)
- 테스트: 테스트 프레임워크는 없음 — 변경사항 검증은 로컬 서버 실행과 관리자 페이지/API 호출로 확인하세요.

자주 발생하는 수정 패턴 & 주의사항
- 새로운 API 라우트를 추가할 때는 `pages/api/` 아래에 파일을 생성하세요 (Next.js 라우팅 규칙).
- 클라이언트 번들에 포함되면 안 되는 Node 전용 모듈(`fs`, `path` 등)은 클라이언트 코드에서 직접 import 하지 마세요. 서버 전용 파일이나 API 핸들러에서만 사용합니다.
- `lib/template.js`는 서버에서 실행되어 완전한 HTML 문자열을 반환합니다. 템플릿을 변경할 때는 UTF-8 인코딩과 다운로드 호환성을 확인하세요.
- `public/`의 정적 HTML은 서버 재시작 없이도 서빙되므로 대량의 HTML 리팩터링은 주의하세요.

구체적 예시
- 대회 데이터 목록을 반환하는 API: `pages/api/triathlon_files.js`
- 엑셀 → HTML 리포트 흐름: `pages/api/convert.js` 와 `lib/template.js` 를 함께 참고

AI 에이전트를 위한 메모
- 변경은 작고 목적이 분명한 작업을 우선하세요. 많은 HTML이 수작업으로 작성되어 있어 대규모 자동 수정은 문제를 일으킬 수 있습니다.
- 한글 인코딩과 파일명 관행을 지켜주세요 (UTF-8, `encodeURIComponent` 사용).
- 변경 확인은 `npm run dev`로 서버를 띄운 뒤 관리자 페이지 또는 `/api/triathlon_files` 같은 엔드포인트를 호출해 검증하세요.

추가가 필요하면 알려주세요 (테스트/CI 문서화, 더 자세한 코드 가이드 등).

