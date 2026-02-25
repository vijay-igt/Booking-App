import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CineVerse Movie Booking API',
            version: '1.0.0',
            description: 'Interactive API documentation for the CineVerse Movie Booking Application. Explore and test all backend endpoints here.',
        },
        servers: [
            {
                url: process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`,
                description: 'CineVerse Backend Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const specs = swaggerJsdoc(options);
