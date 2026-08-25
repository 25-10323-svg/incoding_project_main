# [구현 계획서] 3D 스마트홈 시뮬레이터 통합 및 실시간 연동

전달해주신 **3D 스마트홈 시뮬레이터(Three.js)**를 메인 대시보드 우측 영역에 통합하여, 좌측 스마트폰 조작부에서 스마트 기기(조명, 도어락, 온도/에어컨 등)를 컨트롤할 때 **우측 3D 실제 집 모델이 실시간으로 동적 반영되도록 연동**합니다.

---

## 주요 변경 사항 요약

1. **우측 시뮬레이터 패널 3D 렌더러(Three.js) 탑재**
   - 기존 2D 평면도 패널을 3D 시각화 영역(`webgl-container`)으로 교체
   - Three.js, OrbitControls, Tween.js 라이브러리 추가
   - 3D 시점 모드 (3D 절단 뷰, 3D 집 외관 뷰, 2D 평면도 뷰, 1인칭 뷰, 지붕 열기/닫기, 주간/야간 모드) 지원
2. **좌측 스마트폰 컨트롤러 <-> 우측 3D 집 연동**
   - **조명 제어 연동**: 스마트폰에서 각 방 조명/전체 조명 켜기·끄기 및 밝기 조절 시, 3D 공간 내의 해당하는 방 3D 조명(PointLight)과 빛 밝기가 즉시 반영
   - **도어락 제어 연동**: 스마트폰에서 현관문 열림/잠금 조작 시 3D 현관문 회전 문열림/문닫기 애니메이션 발동
   - **에어컨 & 온도 연동**: 스마트폰 온도/에어컨 조작 시 3D 거실 및 주방 온도 효과 연동
   - **네트워크 연결 제어**: 네트워크 ON/OFF 토글 시 3D 기기 상태 연동

---

## Proposed Changes

### 1. [index.html](file:///c:/Users/com/incoding_project_main/index.html)
- `<head>`에 Three.js, OrbitControls, Tween.js 외부 라이브러리 CDN 추가
- `<section class="simulation-dashboard">` 내 기존 2D 평면도를 3D WebGL 캔버스 및 3D 시점 제어 툴바로 교체

### 2. [style.css](file:///c:/Users/com/incoding_project_main/style.css)
- 3D Canvas 가동용 CSS 및 3D 뷰모드 툴바, 3D 컨트롤 버튼 스타일 정의

### 3. [app.js](file:///c:/Users/com/incoding_project_main/app.js)
- Three.js 3D 엔진 초기화 (`init3D`, 카메라, 조명, 3D 바닥/벽면/가구/지붕 메시 생성)
- `updateLightingUI()`, `updateDoorUI()`, `updateGasUI()`, `updateTempUI()`에 3D 실시간 변경 로직 결합
- 마우스 360도 회전, 줌, 시점 전환 및 애니메이션 처리

---

## Verification Plan

### Manual Verification
- 브라우저에서 메인화면 접속 시 우측 패널에 3D 집 구조가 선명하고 부드럽게 360도 회전하는지 확인
- **조명 연동 테스트**: 스마트폰 각 방 조명 버튼 및 밝기 슬라이더를 조작할 때 3D 집 내부 방 조명이 실시간 조절되는지 확인
- **도어락 연동 테스트**: 현관문 `열림`/`잠금` 버튼 클릭 시 3D 현관문 회전 애니메이션 동작 검증
- **3D 시점 버튼 테스트**: 3D 절단 뷰, 외관 뷰, 평면도 뷰, 지붕 열기/닫기, 야간 모드가 원활히 작동하는지 점검
