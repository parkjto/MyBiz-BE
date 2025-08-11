const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyBiz Backend API',
      version: '2.0.0',
      description: 'MyBiz Backend API - Place ID 추출 및 크롤링 시스템',
      contact: {
        name: 'MyBiz Team',
        email: 'support@mybiz.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '개발 서버 (HTTP)'
      },
      {
        url: 'https://localhost:3000',
        description: '개발 서버 (HTTPS)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 토큰을 Bearer 형식으로 입력하세요. 예: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      },
      schemas: {
        Store: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            address: { type: 'string' },
            phone: { type: 'string' },
            placeId: { type: 'string' },
            category: { type: 'string' },
            rating: { type: 'number' },
            reviewCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            storeId: { type: 'string' },
            content: { type: 'string' },
            rating: { type: 'number' },
            author: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            sentiment: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } }
          }
        },
        SalesData: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            storeId: { type: 'string' },
            date: { type: 'string', format: 'date' },
            amount: { type: 'number' },
            category: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        CrawlingStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', example: '크롤링 가능' },
            statusCode: { type: 'string', example: 'success' },
            canCrawl: { type: 'boolean', example: true },
            currentTime: { type: 'string', example: '2024-01-15 22:30:00' },
            timeRecommendation: { type: 'string', example: '[INFO] 오프피크 시간대입니다.' },
            dayRecommendation: { type: 'string', example: '[INFO] 주말입니다.' },
            limits: {
              type: 'object',
              properties: {
                dailyCount: { type: 'integer', example: 10 },
                dailyLimit: { type: 'integer', example: 50 },
                remainingDaily: { type: 'integer', example: 40 },
                usagePercentage: { type: 'integer', example: 20 },
                maxReviewsPerSession: { type: 'integer', example: 20 }
              }
            },
            recommendations: {
              type: 'object',
              properties: {
                suggestedReviews: { type: 'integer', example: 10 },
                suggestedDelay: { type: 'integer', example: 3000 },
                riskAssessment: { type: 'string', example: '안전' },
                nextBestTime: { type: 'string', example: '현재 시간이 최적입니다.' },
                tips: { type: 'array', items: { type: 'string' }, example: ['새벽 시간대에 크롤링하세요'] }
              }
            }
          }
        },
        CrawlingHistory: {
          type: 'object',
          properties: {
            dailyCount: { type: 'integer', example: 25 },
            dailyLimit: { type: 'integer', example: 50 },
            remainingDaily: { type: 'integer', example: 25 },
            sessionCount: { type: 'integer', example: 3 },
            maxSessionsPerDay: { type: 'integer', example: 10 },
            lastSessionTime: { type: 'string', example: '2024-01-15 오후 2:30:00' },
            usagePercentage: { type: 'integer', example: 50 },
            status: { type: 'string', example: '보통' },
            nextResetTime: { type: 'string', example: '7시간 30분 후' }
          }
        },
        CrawlingRequest: {
          type: 'object',
          required: ['placeId'],
          properties: {
            placeId: { type: 'string', description: '매장의 Place ID', example: '1234567890' },
            maxReviews: { type: 'integer', minimum: 1, maximum: 50, default: 10, description: '최대 크롤링할 리뷰 수', example: 20 },
            level: { type: 'string', enum: ['basic', 'intermediate', 'advanced'], default: 'basic', description: '크롤링 레벨', example: 'basic' }
          }
        },
        CrawlingResponse: {
          type: 'object',
          properties: {
            placeId: { type: 'string', example: '1234567890' },
            reviews: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  author: { type: 'string', example: '사용자1' },
                  content: { type: 'string', example: '맛있어요!' },
                  visitDate: { type: 'string', example: '2024-01-15' },
                  visitCount: { type: 'string', example: '1' },
                  photoCount: { type: 'integer', example: 0 }
                }
              }
            },
            totalCount: { type: 'integer', example: 15 },
            crawledAt: { type: 'string', format: 'date-time', example: '2024-01-15T22:30:00.000Z' },
            crawlingHistory: {
              type: 'object',
              properties: {
                dailyCount: { type: 'integer', example: 40 },
                sessionCount: { type: 'integer', example: 4 },
                lastSessionTime: { type: 'string', example: '2024-01-15 오후 10:30:00' }
              }
            }
          }
        },
        KakaoLoginRequest: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { 
              type: 'string', 
              description: '카카오 OAuth 인가 코드',
              example: 'YOUR_KAKAO_AUTHORIZATION_CODE'
            }
          }
        },
        KakaoLoginResponse: {
          type: 'object',
          properties: {
            message: { 
              type: 'string', 
              example: '카카오 로그인 성공' 
            },
            isNewUser: {
              type: 'boolean',
              description: '신규 사용자 여부',
              example: false
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid-here' },
                kakao_id: { type: 'number', example: 123456789 },
                email: { type: 'string', example: 'user@example.com' },
                nickname: { type: 'string', example: '사용자닉네임' },
                profile_image_url: { type: 'string', example: 'https://example.com/profile.jpg' },
                created_at: { type: 'string', format: 'date-time', example: '2024-01-15T22:30:00.000Z' },
                last_login_at: { type: 'string', format: 'date-time', example: '2024-01-15T22:30:00.000Z' }
              }
            },
            token: { 
              type: 'string', 
              description: 'JWT 토큰',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            message: { 
              type: 'string', 
              example: '사용자 정보 조회 성공' 
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid-here' },
                kakao_id: { type: 'number', example: 123456789 }
              }
            }
          }
        },
        LogoutResponse: {
          type: 'object',
          properties: {
            message: { 
              type: 'string', 
              example: '로그아웃 성공' 
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs; 