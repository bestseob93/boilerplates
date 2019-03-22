# React Redux Boilerplate

### 0. environment
- MacOS - <= High Sierra(10.13.6)
- Node - <= 10.15.1
- npm - <= 6.4.1
- yarn - ^1.15.2
### 1. libraries
- React - 16.8.4
- Webpack - 4.29.6
- Typescript - 3.4.0
- react-router - 5.0.0
- react-router-dom - 5.0.0
- redux - 4.0.1
- redux-saga - 1.0.2
- Immutable-js - 4.0.0-rc.12
- jest
- TSLint
- Prettier
- ANTD - 3.15.1
- 추가적인 부분
  - Jenkins, Docker

### 2. Plan
```
1. Webpack 브랜치 생성
    - 기본적인 Webpack 설정 Step 별로 따라가기
    - 라이브러리 의존성 없는 브랜치
    - ESLint 적용
    - Prettier 적용
2. Typescript 브랜치 생성
    - 1번 브랜치에 Typescript 설정 추가
    - 라이브러리 의존성 없는 브랜치
    - TSLint 적용
3. React-Redux-Typescript 브랜치 생성
    - 2번 브랜치에 React 설정 추가
    - Redux Saga 없는 브랜치
    - Unit Test 추가
4. React-Redux-Saga-TypeScript 브랜치 생성
    - 3번 브랜치에 Redux-Saga 설정 추가
5. React-Redux-Saga-TypeScript-antd 브랜치 생성
    - 4번 브랜치에 Antd 설정 추가
```

### maintenance
지속적인 업데이트를 통해 라이브러리 버전업에 대응한다.
