# Firebase 설정 가이드

직원 출퇴근 앱을 Firebase와 연결하는 방법입니다.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **프로젝트 추가** 클릭
3. 프로젝트 이름 입력 (예: `emp-employee`)
4. Google Analytics는 선택 사항 (끄거나 켜도 무방)

## 2. Firestore Database 활성화

1. 좌측 메뉴 **Build → Firestore Database**
2. **Create database** 클릭
3. **Production mode** 선택 (보안 규칙은 아래 4단계에서 적용)
4. 리전 선택: `asia-northeast3 (Seoul)` 권장
5. **Enable** 클릭

> `attendance_logs` 컬렉션은 앱에서 첫 출퇴근 시 자동 생성됩니다. 미리 만들 필요 없습니다.

## 3. 웹 앱 등록 및 환경변수 설정

1. 프로젝트 개요 → **웹 앱 추가** (`</>` 아이콘)
2. 앱 닉네임 입력 (예: `emp-employee-web`)
3. Firebase Hosting은 체크하지 않아도 됩니다
4. 표시되는 `firebaseConfig` 값을 복사
5. 프로젝트 루트에 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

6. 개발 서버 재시작:

```bash
npm run dev
```

## 4. Firestore 보안 규칙 적용

### 방법 A: Firebase CLI로 배포 (권장)

```bash
# Firebase CLI 로그인 (최초 1회)
npx firebase login

# 프로젝트 연결
copy .firebaserc.example .firebaserc
# .firebaserc의 your-firebase-project-id를 실제 프로젝트 ID로 수정

# 보안 규칙 배포
npm run firebase:deploy:rules
```

### 방법 B: Console에서 직접 붙여넣기

1. Firebase Console → **Firestore Database → Rules**
2. `firestore.rules` 파일 내용 전체를 복사해 붙여넣기
3. **Publish** 클릭

## 5. 보안 규칙 요약

| 동작 | 허용 여부 |
|------|-----------|
| `attendance_logs` 문서 생성 | 허용 (스키마 검증 통과 시) |
| `attendance_logs` 읽기 | 허용 (직원관리앱 조회용) |
| `attendance_logs` 수정/삭제 | 차단 (Console·Admin SDK만 가능) |
| 기타 컬렉션 | 전부 차단 |

생성 시 서버에서 검증하는 항목:

- `userName`: 1~50자 문자열
- `siteName`: 등록된 6개 현장명만 허용
- `type`: `CHECK_IN` 또는 `CHECK_OUT`
- `lat`, `lng`: 서울 인근 좌표 범위
- `distance`: 0~150m
- `createdAt`: `serverTimestamp()` (클라이언트 임의 시간 불가)

## 6. 동작 확인

1. `npm run dev` 실행 후 `http://localhost:3000` 접속
2. 이름·출근 장소 등록
3. 현장 150m 이내에서 **출근하기** 클릭
4. Firebase Console → Firestore → `attendance_logs`에 문서 생성 확인

### 자주 발생하는 오류

| 증상 | 원인 | 해결 |
|------|------|------|
| `Missing or insufficient permissions` | 보안 규칙 미적용 또는 필드 불일치 | Rules 탭에서 규칙 Publish 확인 |
| GPS 권한 오류 | 브라우저 위치 권한 거부 | 주소창 자물쇠 → 위치 허용 |
| 150m 초과 안내 | 현장 밖에서 테스트 | 실제 현장 근처 또는 DevTools 위치 시뮬레이션 |
| 환경변수 undefined | `.env.local` 미설정 | 값 입력 후 dev 서버 재시작 |

## 7. GPS 위치 시뮬레이션 (개발용)

Chrome DevTools → **More tools → Sensors → Location** 에서 현장 좌표 입력:

| 현장 | 위도 | 경도 |
|------|------|------|
| 사무실 | 37.53114660119239 | 126.95506667237547 |
| 1반 | 37.53423546847156 | 126.96773328081873 |
| 2반 | 37.52306398612143 | 126.96120983358273 |
| 3반 | 37.53169760891948 | 126.99444339565821 |
| 운전1반 | 37.53623961768338 | 126.97074567427495 |
| 운전2반 | 37.5171742727315 | 126.983879339774 |
| 기동반 | 37.53114660119239 | 126.95506667237547 |

## 8. 현장 추가/변경 시

1. `lib/sites.js`의 `SITES` 배열 수정
2. `firestore.rules`의 `isValidSiteName` 목록도 동일하게 수정
3. `npm run firebase:deploy:rules`로 규칙 재배포

## 9. 운영 배포 시 참고

- Vercel 등에 배포할 때 **Environment Variables**에 `NEXT_PUBLIC_FIREBASE_*` 6개 모두 등록
- HTTPS 환경에서만 실제 GPS가 안정적으로 동작
- 악의적 요청 방지를 위해 추후 **Firebase App Check** 또는 **Anonymous Auth** 도입을 권장
