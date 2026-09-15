const fs = require('fs');
const path = require('path');

// swagger.json SSOT(swagger/swagger.json, 저장소 루트)를 backend/swagger/로 복사한다.
// Railway 등 배포 환경에서 Root Directory를 backend로 지정하면 부모 디렉터리가
// 빌드 컨텍스트에 포함되지 않을 수 있어, app.ts가 항상 backend 내부 경로만
// 참조하도록 빌드/개발 시점에 매번 새로 복사한다(커밋 대상 아님, .gitignore 처리).
const src = path.join(__dirname, '../../swagger/swagger.json');
const destDir = path.join(__dirname, '../swagger');
const dest = path.join(destDir, 'swagger.json');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
