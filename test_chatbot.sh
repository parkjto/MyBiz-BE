#!/bin/bash

# 챗봇 테스트 스크립트
# 사용법: ./test_chatbot.sh

BASE_URL="http://localhost:3000"
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"  # 실제 JWT 토큰으로 교체하세요

echo "🤖 챗봇 테스트 시작"
echo "=================="

# 1. 상태 확인
echo "1. 챗봇 상태 확인..."
curl -s "$BASE_URL/api/chatbot/status" | jq '.'

echo -e "\n"

# 2. 의도 분류 테스트
echo "2. 의도 분류 테스트..."
curl -s -X POST "$BASE_URL/api/chatbot/test-intent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"text": "매출 분석을 보여주세요"}' | jq '.'

echo -e "\n"

# 3. 텍스트 메시지 처리 테스트
echo "3. 텍스트 메시지 처리 테스트..."
curl -s -X POST "$BASE_URL/api/chatbot/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"text": "매출 분석을 보여주세요", "userId": "test_user"}' | jq '.'

echo -e "\n"

# 4. 다양한 명령 테스트
echo "4. 다양한 명령 테스트..."

# 매출 개선 방안
echo "매출 개선 방안 요청:"
curl -s -X POST "$BASE_URL/api/chatbot/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"text": "매출을 올리는 방법을 알려줘", "userId": "test_user"}' | jq '.data.message'

echo -e "\n"

# 리뷰 분석
echo "리뷰 분석 요청:"
curl -s -X POST "$BASE_URL/api/chatbot/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"text": "리뷰 상황을 확인해줘", "userId": "test_user"}' | jq '.data.message'

echo -e "\n"

# 일반 대화
echo "일반 대화:"
curl -s -X POST "$BASE_URL/api/chatbot/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"text": "안녕하세요", "userId": "test_user"}' | jq '.data.message'

echo -e "\n"
echo "✅ 챗봇 테스트 완료!"
