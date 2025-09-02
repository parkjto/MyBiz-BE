import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyBiz Scraper API',
      version: '1.0.0',
      description: 'Naver 리뷰 스크래핑 API 문서'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Store: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            store_name: { type: 'string' },
            address: { type: 'string' },
            road_address: { type: 'string' },
            phone: { type: 'string' },
            category: { type: 'string' },
            coordinates_x: { type: 'string' },
            coordinates_y: { type: 'string' },
            place_id: { type: 'string' },
            map_url: { type: 'string' },
            is_primary: { type: 'boolean' },
            is_verified: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        ReviewAnalysis: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            review_id: { type: 'string', format: 'uuid' },
            summary: { type: 'string' },
            sentiment: { type: 'string', enum: ['positive','neutral','negative'] },
            positive_keywords: { type: 'array', items: { type: 'string' } },
            negative_keywords: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;

