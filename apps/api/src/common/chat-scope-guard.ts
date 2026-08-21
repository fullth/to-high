export type OffTopicRequestReason =
  | 'coding'
  | 'translation'
  | 'calculation'
  | 'search'
  | 'investment-advice'
  | 'bulk-output'
  | 'content-generation'
  | 'general-knowledge'
  | 'medical-advice'
  | 'legal-advice'
  | 'prompt-manipulation';

function normalizeTerminalAction(input: string): string {
  return input
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(/\p{C}/gu, '')
    .replace(/(?<=[\p{L}\p{N}])[\p{P}\p{S}]+(?=[\p{L}\p{N}])/gu, '')
    .replace(/(?<=[가-힣ㄱ-ㅎㅏ-ㅣ\p{N}])\s+(?=[가-힣ㄱ-ㅎㅏ-ㅣ\p{N}])/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCounselingRequest(input: string): boolean {
  return (
    /(?:(?:내가|나는|난)누구(?:인지|야)|내(?:감정|마음|기분|정체성)|삶의의미가뭐야)/u.test(
      input,
    ) ||
    /(?:내|나의|내가|나는|난).{0,30}(?:감정|마음|기분|불안|슬픔|분노|외로움|정체성|왜이런).{0,30}(?:알려줘|설명해줘|정리해줘|뭐야|모르겠)/u.test(
      input,
    ) ||
    /(?:상대|친구|가족|연인|상사).{0,30}(?:마음|관계|왜그런|어떻게대해야).{0,30}(?:알려줘|설명해줘|정리해줘|모르겠)/u.test(
      input,
    ) ||
    /(?:내|나의|내가|나는|난).{0,30}(?:상황|고민|관계|힘든지|마음|감정).{0,30}(?:분석해줘|요약해줘|설명해줘|정리해줘)/u.test(
      input,
    ) ||
    /(?:이관계에서뭘해야할지알려줘|마음을진정시킬방법추천해줘|다시해볼계획을짜줘|조언을구체적으로설명해줘)/u.test(
      input,
    ) ||
    /(?:어떻게해야|어떻게하면|이럴때뭘해야).{0,12}(?:할까|할지|해|알려줘)?[?.!]?$/u.test(
      input,
    ) ||
    /(?:조언|상황을정리|마음을정리|위로|상담|공감)(?:해)?(?:줘|주세요|줄래)[?.!]?$/u.test(
      input,
    ) ||
    /(?:내)?이야기(?:를)?들어(?:줘|주세요|줄래)[?.!]?$/u.test(input)
  );
}

function isBulkOutputRequest(input: string): boolean {
  const requestsOutput =
    /(?:출력|나열|반복|작성|생성|만들(?:어)?|써|채워|답변|말해)(?:해)?(?:줘|주세요|줄래|부탁해)?[?.!]?$/u.test(
      input,
    );
  if (!requestsOutput) return false;
  if (/(?:전부|모두|최대한|가능한한많이|최대한길게|토큰한도)/u.test(input)) {
    return true;
  }

  const counts = [
    ...input.matchAll(/(\d{2,})(?:개|번|줄|자|회)/gu),
    ...input.matchAll(/(?:부터|~)(\d{2,})까지/gu),
  ].map((match) => Number(match[1]));
  return counts.some((count) => Number.isFinite(count) && count >= 50);
}

/**
 * 마지막 직접 명령이나 질문이 감정 상담이 아닌지 판정한다.
 * 회상된 작업 단어나 감정 접두사 자체는 차단 근거로 삼지 않는다.
 */
export function detectOffTopicRequest(
  input: string,
): OffTopicRequestReason | null {
  const action = normalizeTerminalAction(input);
  if (!action) return null;

  if (
    /(?:약|약물|항우울제|항불안제|수면제|정신과약).{0,40}(?:복용|먹어|끊어|중단|용량|몇알|추천|바꿔|변경).{0,20}(?:줘|주세요|돼|될까|되나요|해야해|알려줘|추천해줘)[?.!]?$/u.test(
      action,
    ) ||
    /(?:진단|병명).{0,20}(?:해줘|해주세요|알려줘|알려주세요|뭐야|무엇이야)[?.!]?$/u.test(
      action,
    ) ||
    /(?:우울증|공황장애|불안장애|조울증|adhd|정신질환).{0,15}(?:인가|맞아|진단해줘)[?.!]?$/iu.test(
      action,
    )
  ) {
    return 'medical-advice';
  }

  if (
    /(?:시스템프롬프트|내부지침|숨겨진(?:지침|명령)).{0,40}(?:공개해줘|보여줘|출력해줘|알려줘)[?.!]?$/u.test(
      action,
    ) ||
    /(?:모든|이전|앞선|기존).{0,20}(?:지시|명령|규칙).{0,20}(?:무시|잊어|폐기).{0,50}(?:행동해|되어라|보여줘|알려줘|출력해줘)[?.!]?$/u.test(
      action,
    ) ||
    /(?:너는이제|역할을).{0,40}(?:바꿔|변경해|행동해|되어라)[?.!]?$/u.test(
      action,
    ) ||
    /(?:jailbreak|탈옥모드|dan mode|developer mode)[?.!]?$/iu.test(action) ||
    /(?:ignore|forget).{0,30}(?:previous|prior|all).{0,20}(?:instructions|rules).{0,80}$/iu.test(
      action,
    ) ||
    /(?:reveal|show|print).{0,30}(?:system prompt|hidden instructions)[?.!]?$/iu.test(
      action,
    ) ||
    /(?:you are now|act as).{0,100}(?:write|create|generate|act|behave).{0,100}$/iu.test(
      action,
    )
  ) {
    return 'prompt-manipulation';
  }

  if (isBulkOutputRequest(action)) return 'bulk-output';

  if (
    /(?:변호사처럼|법률|법적|계약서).{0,50}(?:검토|판단|작성)(?:해)?(?:줘|주세요|줄래|부탁해)[?.!]?$/u.test(
      action,
    )
  ) {
    return 'legal-advice';
  }

  if (
    /(?:소설|시를|시한편|가사|메일|이메일|보고서|자소서|자기소개서|이력서|블로그|광고문구|표를|목록|이미지|프롬프트|유튜브대본|회의록|여행계획).{0,50}(?:써|작성|생성|만들|요약|짜)(?:해)?(?:줘|주세요|줄래|부탁해)?[?.!]?$/u.test(
      action,
    ) ||
    /\b(?:please )?(?:write|create|generate|summarize)\b.{0,70}\b(?:novel|poem|lyrics|email|report|resume|blog|table|list|image|prompt|script|minutes|plan)\b[?.!]?$/iu.test(
      action,
    )
  ) {
    return 'content-generation';
  }

  if (
    /(?:코드|코딩|프로그램|스크립트|크롤러|컴포넌트|api|sql|정규식|함수|앱|웹사이트).{0,60}(?:작성|생성|구현|수정|디버깅|리팩터링|리팩토링|짜|만들(?:어)?)(?:해)?(?:줘|주세요|줄래|부탁해)?[?.!]?$/iu.test(
      action,
    ) ||
    /(?:파이썬|자바|자바스크립트|타입스크립트|react|nest).{0,40}(?:코드|프로그램|스크립트|크롤러|컴포넌트|함수).{0,20}(?:부탁해|만들어줘|작성해줘|짜줘)[?.!]?$/iu.test(
      action,
    ) ||
    /\b(?:please )?(?:write|create|implement|debug|refactor)\b.{0,60}\b(?:code|script|crawler|component|function|api|app)\b[?.!]?$/iu.test(
      action,
    )
  ) {
    return 'coding';
  }

  if (
    /(?:번역|통역)(?:해)?(?:줘|주세요|줄래|부탁해)[?.!]?$/u.test(action) ||
    /(?:영어|한국어|일본어|중국어|한글|영문)(?:로|으로).{0,50}(?:번역해줘|옮겨줘|바꿔줘|써줘)[?.!]?$/u.test(
      action,
    ) ||
    /\b(?:please )?translate\b.{0,100}\b(?:into|to)\b.{0,30}[?.!]?$/iu.test(
      action,
    )
  ) {
    return 'translation';
  }

  if (
    /(?:계산|연산|문제풀이|풀어)(?:해)?(?:줘|주세요|줄래|부탁해)[?.!]?$/u.test(
      action,
    ) ||
    /(?:\d+(?:[+\-*/×÷^]|의)\d+|\d+의\d+제곱).{0,30}(?:값|답|결과).{0,10}(?:뭐야|구해줘|알려줘)[?.!]?$/u.test(
      action,
    )
  ) {
    return 'calculation';
  }

  if (
    /(?:날씨|뉴스|맛집|식당|카페|호텔|항공권|가격|시세|주소|전화번호|정보).{0,50}(?:검색해줘|찾아줘|조회해줘|알려줘)[?.!]?$/u.test(
      action,
    ) ||
    /(?:검색|조회)(?:해)?(?:줘|주세요|줄래|부탁해)[?.!]?$/u.test(action)
  ) {
    return 'search';
  }

  if (
    /(?:주식|종목|코인|비트코인|가상자산|암호화폐|펀드|etf).{0,60}(?:추천해줘|추천해주세요|사도될지|사야해|사야할까|팔아야해|매수|매도|포트폴리오.{0,10}(?:짜줘|만들어줘)|분석해줘|분석해주세요)[?.!]?$/iu.test(
      action,
    )
  ) {
    return 'investment-advice';
  }

  // 명시적인 금지 행동을 먼저 검사한 뒤 상담 목적의 분석과 조언만 허용한다.
  if (isCounselingRequest(action)) return null;

  if (
    /(?:태양계|행성|수도|광합성|상대성이론|양자역학|역사|과학).{0,40}(?:알려줘|설명해줘|뭐야|어디야)[?.!]?$/u.test(
      action,
    ) ||
    /[\p{L}\p{N}]{2,30}(?:이|가|은|는)누구(?:야|예요|인가요|지)[?.!]?$/u.test(
      action,
    ) ||
    /[\p{L}\p{N}]{2,40}(?:을|를)?(?:설명|정의)(?:해)?(?:줘|주세요|줄래)[?.!]?$/u.test(
      action,
    ) ||
    /[\p{L}\p{N}]{2,30}(?:의)?(?:뜻|의미|개념).{0,12}(?:알려줘|뭐야)[?.!]?$/u.test(
      action,
    )
  ) {
    return 'general-knowledge';
  }

  // 특정 분야 목록에 없는 직접 정보 요청도 상담 모델로 넘기지 않는다.
  if (
    /(?:알려|설명|정의|찾아|추천|검토|분석|요약|번역|계산|작성|생성|구현|수정|만들(?:어)?|짜|써)(?:해)?(?:줘|주세요|줄래|부탁해)[?.!]?$/u.test(
      action,
    ) ||
    /(?:뭐|무엇|누구|어디|언제|몇|얼마)(?:야|예요|인가요|지|니|냐)[?.!]?$/u.test(
      action,
    )
  ) {
    return 'general-knowledge';
  }

  return null;
}
