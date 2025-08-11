const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyBiz Backend API',
      version: '2.0.0',
      description: 'MyBiz Backend API - Place ID 추출 및 리뷰 분석 시스템',
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
        User: {
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
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        
        // 인증 관련 스키마
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
              $ref: '#/components/schemas/User'
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
              $ref: '#/components/schemas/User'
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