# 출석 관리 시스템

동아리를 위한 웹 기반 출석 관리 시스템입니다. QR 코드를 활용한 실시간 출석 체크와 관리자 대시보드를 제공합니다.

## 시스템 구조

```
club-attendance-system/
├── backend/           # FastAPI 백엔드 서버
├── frontend/          # React + Vite 프론트엔드
├── docker-compose.yml # Docker 컨테이너 구성
└── README.md
```

## 🚀 주요 기능

### 사용자 기능
- 계정 생성 및 로그인
- QR 코드 스캔을 통한 실시간 출석 체크
- 개인 출석 현황 조회

### 관리자 기능  
- 동아리 생성 및 관리
- 출석 세션 생성 및 QR 코드 생성
- 회원 출석 현황 관리 및 통계
- 출석 데이터 Excel 내보내기

### 동아리 관리
- 다중 동아리 지원
- 동아리별 독립적인 출석 관리
- 회원 권한 관리 (관리자/일반 회원)

## 🛠️ 기술 스택

| 분류 | 기술 | 버전/설명 |
|------|------|-----------|
| **Backend** | FastAPI | 0.115.8 |
| | SQLAlchemy | 2.0.38 (ORM) |
| | aiomysql | 0.2.0 (MySQL 연결) |
| | PyJWT | 2.10.1 (JWT 인증) |
| | fastapi-limiter | 0.1.6 (Rate Limiting) |
| | pandas, openpyxl | 데이터 처리 및 Excel 내보내기 |
| **Frontend** | React | 19.0.0 |
| | Vite | 6.2.0 (빌드 도구) |
| | React Router DOM | 7.4.0 (라우팅) |
| | Axios | 1.8.4 (HTTP 클라이언트) |
| | html5-qrcode | 2.3.8 (QR 스캐너) |
| | react-qr-code | 2.0.15 (QR 생성) |
| **Infrastructure** | Docker | 컨테이너화 |
| | AWS EC2 | 서버 호스팅 |
| | AWS RDS MySQL | 데이터베이스 |
| | Cloudflare | DNS & CDN |
| | Redis | 캐싱 및 세션 관리 |

## 🔧 설치 및 실행

### 로컬 개발 환경

#### 사전 요구사항
- Docker & Docker Compose
- Git

#### 1. 저장소 클론
```bash
git clone https://github.com/your-username/untoc-attendance-system.git
cd untoc-attendance-system
```

####  2. Docker Compose로 실행
```bash
docker-compose up -d
```

#### 3. 서비스 접속
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:7777

### 운영 환경 (AWS + Cloudflare)

#### AWS 인프라 구성
- **EC2 인스턴스**: 애플리케이션 서버 호스팅
- **RDS MySQL**: 데이터베이스 서비스
- **보안 그룹**: 필요한 포트만 개방
- **Elastic IP**: 고정 IP 주소 할당

#### Cloudflare 설정
- **DNS 관리**: 도메인 네임 서버 설정
- **SSL/TLS**: 자동 HTTPS 암호화
- **CDN**: 글로벌 콘텐츠 전송 네트워크
- **DDoS 보호**: 자동 공격 방어


## 📚 API 문서

백엔드 서버 실행 후 다음 URL에서 자동 생성된 API 문서를 확인할 수 있습니다:
- **Swagger UI**: http://localhost:7777/docs
- **ReDoc**: http://localhost:7777/redoc

### 주요 API 엔드포인트
- `POST /user/register` - 사용자 회원가입
- `POST /user/login` - 사용자 로그인  
- `GET /club/` - 동아리 목록 조회
- `POST /club/create` - 동아리 생성
- `POST /attend/session` - 출석 세션 생성
- `POST /attend/check` - QR 코드 출석 체크

## 🐳 Docker 컨테이너 구성

### 서비스
2. **backend**: FastAPI 백엔드 서버 (포트 7777)  
3. **frontend**: React 개발 서버 (포트 3000)

### 네트워크
- 모든 컨테이너는 동일한 Docker 네트워크에서 통신
- 프론트엔드 → 백엔드 → Database 순서로 의존성 구성

## 보안 기능

- JWT 기반 사용자 인증
- Rate Limiting으로 API 호출 제한
- CORS 미들웨어를 통한 크로스 오리진 요청 관리
- 비밀번호 해싱 (bcrypt)

## QR 코드 출석 시스템

1. 관리자가 출석 세션을 생성하면 고유한 QR 코드 생성
2. 회원들이 QR 코드를 스캔하여 실시간 출석 체크
3. 출석 데이터는 즉시 데이터베이스에 저장
4. 출석 현황을 관리자 대시보드에서 확인

## 📊 모니터링

### 성능 모니터링
- **Vercel Speed Insights**: 프론트엔드 성능 모니터링
- **FastAPI 로깅**: API 요청 추적 및 에러 로깅


## 기여하기 및 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 Issue를 생성해 주세요.


## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.




---

**동아리 출석 관리 시스템** - 효율적이고 현대적인 출석 관리 솔루션