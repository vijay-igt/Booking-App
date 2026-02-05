import { sequelize } from '../config/database';

async function cleanupBannerUrls() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();

        console.log('Cleaning up undefined banner URLs...');

        // Set bannerUrl to NULL where it's the string "undefined"
        await sequelize.query(`
            UPDATE movies
            SET "bannerUrl" = NULL
            WHERE "bannerUrl" = 'undefined';
        `);

        console.log('Cleanup complete! All "undefined" banner URLs have been set to NULL.');
        console.log('You can now upload banner images for your movies.');

        process.exit(0);
    } catch (error) {
        console.error('Error cleaning up banner URLs:', error);
        process.exit(1);
    }
}

cleanupBannerUrls();
