import { Request, Response } from 'express';
import { FoodItem } from '../models/FoodItem';

export const getFoodItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const foodItems = await FoodItem.findAll();
        res.json(foodItems);
    } catch (error) {
        console.error('Error fetching food items:', error);
        res.status(500).json({ message: 'Error fetching food items' });
    }
};

export const createFoodItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const foodItem = await FoodItem.create(req.body);
        res.status(201).json(foodItem);
    } catch (error) {
        console.error('Error creating food item:', error);
        res.status(500).json({ message: 'Error creating food item' });
    }
};

export const seedFoodItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = [
            {
                name: 'Paneer Tikka Loaded Fries 325g',
                description: 'Paneer Tikka Loaded Fries 325g (436Kcal | Allergens: Milk, Soybeans, Gluten)',
                price: 346.50,
                category: 'Snacks',
                isVeg: true,
                calories: 436,
                allergens: 'Milk, Soybeans, Gluten',
                imageUrl: 'https://img.freepik.com/premium-photo/loaded-french-fries-topped-with-paneer-tikka-onions-sauces-isolated-white_1270830-58072.jpg'
            },
            {
                name: 'Superstar Veg Club Sandwich',
                description: 'Superstar Veg Club Sandwich',
                price: 430.50,
                category: 'Snacks',
                isVeg: true,
                imageUrl: 'https://img.freepik.com/free-photo/club-sandwich-with-french-fries_144627-2244.jpg'
            },
            {
                name: 'Classic Margherita Pizza',
                description: 'Classic Margherita Pizza',
                price: 441.00,
                category: 'Snacks',
                isVeg: true,
                imageUrl: 'https://img.freepik.com/free-photo/pizza-margherita-isolated-white-background_123827-21503.jpg'
            },
            {
                name: 'Regular Coke 540ml',
                description: 'Regular Coke (540ml | 232 Kcal)',
                price: 310.00,
                category: 'Beverages',
                isVeg: true,
                calories: 232,
                imageUrl: 'https://img.freepik.com/free-photo/cup-cola-isolated_1232-687.jpg'
            },
            {
                name: 'Tiramisu',
                description: 'Tiramisu',
                price: 278.25,
                category: 'Desserts',
                isVeg: true,
                imageUrl: 'https://img.freepik.com/free-photo/tiramisu-dessert-isolated_1232-720.jpg'
            },
            {
                name: 'Manhattan Chicken Hot Dog 150g',
                description: 'Manhattan Chicken Hot Dog 150g (227 Kcal | Allergens: Milk, Gluten)',
                price: 388.50,
                category: 'Snacks',
                isVeg: false,
                calories: 227,
                allergens: 'Milk, Gluten',
                imageUrl: 'https://img.freepik.com/free-photo/hot-dog-isolated_1232-723.jpg'
            }
        ];

        await FoodItem.bulkCreate(items);
        res.status(201).json({ message: 'Food items seeded successfully' });
    } catch (error) {
        console.error('Error seeding food items:', error);
        res.status(500).json({ message: 'Error seeding food items' });
    }
};
