import { sequelize } from './src/config/database';
import { PricingRule } from './src/models/PricingRule';

async function listRules() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const rules = await PricingRule.findAll({
            where: { isActive: true },
            order: [['priority', 'ASC']]
        });

        console.log('Active Pricing Rules:');
        console.log(JSON.stringify(rules, null, 2));

    } catch (error) {
        console.error('Error listing rules:', error);
    } finally {
        await sequelize.close();
    }
}

listRules();
