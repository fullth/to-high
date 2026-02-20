---
name: ui-fix
description: UI 수정을 위한 빠른 참조 스킬 - 채팅 말풍선, 헤더, 버튼 등의 위치를 미리 알고 바로 수정
---

# UI 빠른 수정 스킬

이 스킬은 자주 수정하는 UI 요소들의 위치를 미리 제공합니다.

## 주요 파일 위치

### 메인 페이지: `/Users/levi/WebstormProjects/to-high/apps/web/src/app/page.tsx`

**채팅 말풍선** (line ~1757):
```
<div className={`py-X px-5 rounded-2xl ${item.type === "user" ? "bg-primary..." : "bg-card..."}
```

**헤더 - 로그인 버튼 영역** (line ~1252-1275):
```
<header className="px-6 py-5 border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
  ...로그인/로그아웃 버튼...
```

**하단 고정 입력창** (line ~1786):
```
<div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background from-80% to-transparent z-40">
```

**선택지 버튼 그리드** (line ~1791):
```
<div className="grid grid-cols-2 gap-2">
```

**컨텐츠 영역 하단 패딩** (line ~1742):
```
<div className="space-y-6 pb-32">
```

**메인 페이지 상단 패딩** (line ~1439):
```
<div className="max-w-3xl mx-auto px-6 py-8 sm:py-12">
```

**"오늘 N명이 위로받았어요" 배지** (line ~1446-1454):
```
<div className="flex justify-center animate-fade-in-up">
  <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full...">
```

## 빠른 수정 가이드

사용자가 요청하면:
1. 위 라인 번호로 바로 Read
2. Edit로 수정
3. Grep 최소화

예시:
- "채팅 말풍선 여백 줄여줘" → line 1757 바로 수정
- "로그인 버튼 간격 조정" → line 1259 바로 수정
- "하단 겹침 문제" → line 1742 pb-값 조정
