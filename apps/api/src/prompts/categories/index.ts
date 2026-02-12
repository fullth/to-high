/**
 * 카테고리별 전문 프롬프트 통합
 * 
 * 각 카테고리에 맞는 전문 프롬프트를 제공합니다.
 */

import { RELATIONSHIP_EXPERTISE } from './relationship';
import { CAREER_EXPERTISE } from './career';
import { SELF_ESTEEM_EXPERTISE } from './self-esteem';
import { FAMILY_EXPERTISE } from './family';
import { FUTURE_EXPERTISE } from './future';

/**
 * 카테고리 ID와 전문 프롬프트 매핑
 */
const CATEGORY_EXPERTISE_MAP: Record<string, string> = {
    // 연애 관련
    'love': RELATIONSHIP_EXPERTISE,

    // 직장 관련
    'work': CAREER_EXPERTISE,

    // 자존감/자기계발
    'self': SELF_ESTEEM_EXPERTISE,

    // 가족 관계 (relationship 카테고리가 가족+친구를 포함)
    'relationship': FAMILY_EXPERTISE,

    // 미래/진로
    'future': FUTURE_EXPERTISE,

    // 일상 피로 - 자존감 프롬프트 활용
    'daily': SELF_ESTEEM_EXPERTISE,

    // 기타 - 전문 프롬프트 없음 (범용 프롬프트 사용)
    'other': '',

    // 직접 입력 - 전문 프롬프트 없음
    'direct': '',
};

/**
 * 카테고리에 맞는 전문 프롬프트를 반환합니다.
 * 
 * @param category - 상담 카테고리 ID
 * @returns 해당 카테고리의 전문 프롬프트 (없으면 빈 문자열)
 */
export function getCategoryExpertise(category?: string): string {
    if (!category) {
        return '';
    }

    return CATEGORY_EXPERTISE_MAP[category] || '';
}

/**
 * 카테고리에 전문 프롬프트가 있는지 확인합니다.
 * 
 * @param category - 상담 카테고리 ID
 * @returns 전문 프롬프트 존재 여부
 */
export function hasExpertise(category?: string): boolean {
    if (!category) {
        return false;
    }

    const expertise = CATEGORY_EXPERTISE_MAP[category];
    return expertise !== undefined && expertise !== '';
}
