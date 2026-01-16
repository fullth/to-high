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
  });
});
