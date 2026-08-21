import { detectCrisis } from './crisis-detector';

describe('CrisisDetector', () => {
  describe('detectCrisis', () => {
    it('should detect high-level crisis keywords', () => {
      const result = detectCrisis('죽고 싶어');

      expect(result.isCrisis).toBe(true);
      expect(result.level).toBe('high');
      expect(result.recommendedAction).toContain('1393');
    });

    it('should detect medium-level crisis keywords', () => {
      const result = detectCrisis('살기 싫어');

      expect(result.isCrisis).toBe(true);
      expect(result.level).toBe('medium');
    });

    it('should detect low-level crisis keywords', () => {
      const result = detectCrisis('너무 힘들어요');

      expect(result.isCrisis).toBe(false);
      expect(result.level).toBe('low');
    });

    it('should return none for normal text', () => {
      const result = detectCrisis('오늘 날씨가 좋네요');

      expect(result.isCrisis).toBe(false);
      expect(result.level).toBe('none');
      expect(result.matchedKeywords).toHaveLength(0);
    });

    it('should handle whitespace in keywords', () => {
      const result = detectCrisis('죽 고 싶 어');

      expect(result.isCrisis).toBe(true);
      expect(result.level).toBe('high');
    });

    it.each([
      '죽.고 싶어',
      'ㅈㅜㄱ고 싶어',
      '죽\u200b고 싶어',
      '죽\u000b고 싶어',
      '죽\u000b.고 싶어',
    ])(
      'should detect punctuation, compatibility jamo, and format-char obfuscation: %s',
      (input) => {
        const result = detectCrisis(input);

        expect(result.isCrisis).toBe(true);
        expect(result.level).toBe('high');
        expect(result.recommendedAction).toContain('1393');
      },
    );

    it('should detect medium-level crisis with control-char obfuscation', () => {
      const result = detectCrisis('살\u000b기 싫어');

      expect(result.isCrisis).toBe(true);
      expect(result.level).toBe('medium');
    });

    it.each([
      'I want to die',
      'I wanna die',
      "I don't want to live anymore",
      'I am suicidal',
      'I will kill myself',
      'I wish I were dead',
      'I want to end my life',
      'I am going to kill myself',
      'I want to hurt myself',
      '死にたい',
      '自殺したい',
      'もう生きたくない',
      '消えたい',
      '我想死',
      '我不想活了',
      '我想自杀',
      '죽을래',
      '그만 살고 싶어',
      '영원히 자고 싶어',
      '뛰어내리고 싶어',
      '약을 다 먹을까',
    ])(
      'should detect multilingual and indirect high-risk phrases: %s',
      (input) => {
        const result = detectCrisis(input);

        expect(result.isCrisis).toBe(true);
        expect(result.level).toBe('high');
      },
    );

    it('should detect an indirect medium-risk phrase', () => {
      const result = detectCrisis('내일이 오지 않았으면 좋겠어');

      expect(result.isCrisis).toBe(true);
      expect(result.level).toBe('medium');
    });
  });
});
