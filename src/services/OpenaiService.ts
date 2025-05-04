import OpenAI from 'openai';

// 인터페이스 정의 부분
export interface ExampleSentenceResponse {
  sentence: string;
  translation: string;
}

export interface OpenAIModel {
  id: string;
  name: string;
}

// 기본 모델 리스트 정의
const DEFAULT_MODELS: OpenAIModel[] = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'gpt-4o', name: 'GPT-4o' }
];

// 기본 설정값
const DEFAULT_MODEL = 'gpt-3.5-turbo';

// OpenAI 클라이언트 인스턴스 생성
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// 모델 ID를 보기 좋은 이름으로 변환하는 유틸리티 함수
const formatModelName = (modelId: string): string => {
  return modelId
    .replace('gpt-', 'GPT-')
    .replace(/-([a-z])/g, (_, letter) => ` ${letter.toUpperCase()}`);
};

// 사용 가능한 모델 가져오기
export const fetchAvailableModels = async (): Promise<OpenAIModel[]> => {
  try {
    const response = await openai.models.list();

    // gpt 모델만 필터링하고, 이름 순으로 정렬
    const gptModels = response.data
      .filter(model => model.id.includes('gpt'))
      .map(model => ({
        id: model.id,
        name: formatModelName(model.id)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return gptModels;
  } catch (error) {
    console.error('모델 목록 가져오기 오류:', error);
    // 오류 시 기본 모델 목록 제공
    return DEFAULT_MODELS;
  }
};

// 예문 생성 함수
export const generateExampleSentence = async (
  word: string,
  partOfSpeech: string,
  model: string = DEFAULT_MODEL
): Promise<ExampleSentenceResponse> => {
  try {
    const systemPrompt = '영어 단어를 사용한 예문을 생성하는 도우미입니다. ' +
      '항상 예문과 그에 대한 한국어 번역을 제공합니다. ' +
      'TEPS(Test of English Proficiency developed by Seoul National University)에 맞는 예문을 제공합니다.';

    const userPrompt = `다음 영어 단어 "${word}"(${partOfSpeech})를 사용한 ` +
      'TEPS 시험에 맞는 중상급 수준의 예문을 하나 만들어 주세요. ' +
      'JSON 형식으로 영어 예문은 "영어" 키, 한국어 번역은 "한국어" 키로 제공해 주세요.';

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('응답 내용이 비어있습니다.');
    }

    const result = JSON.parse(content);

    // API 응답 형식 변환
    return {
      sentence: result.영어 || result.sentence || `The ${word} is important.`,
      translation: result.한국어 || result.translation || `${word}는 중요합니다.`
    };
  } catch (error) {
    console.error('OpenAI API 오류:', error);

    // 오류 발생 시 기본 응답 제공
    return {
      sentence: `The ${word} is important for learning.`,
      translation: `${word}는 학습에 중요합니다.`
    };
  }
};