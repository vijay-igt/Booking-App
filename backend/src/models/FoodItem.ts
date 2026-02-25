import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { BookingFoodItem } from './BookingFoodItem';
import { Theater } from './Theater';

@Table({
    tableName: 'food_items',
    timestamps: true,
})
export class FoodItem extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => Theater)
    @Column({
        type: DataType.INTEGER,
        allowNull: true, // Allow null for global/unassigned items or during migration
    })
    declare theaterId: number;

    @BelongsTo(() => Theater)
    declare theater: Theater;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare description: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare price: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare category: string; // Snacks, Beverages, Desserts, etc.

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare imageUrl: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare isVeg: boolean;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare calories: number;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare allergens: string;

    @HasMany(() => BookingFoodItem)
    declare bookingItems: BookingFoodItem[];
}
