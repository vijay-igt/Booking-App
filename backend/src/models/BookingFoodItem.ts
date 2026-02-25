import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Booking } from './Booking';
import { FoodItem } from './FoodItem';

@Table({
    tableName: 'booking_food_items',
    timestamps: true,
})
export class BookingFoodItem extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => Booking)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare bookingId: number;

    @BelongsTo(() => Booking)
    declare booking: Booking;

    @ForeignKey(() => FoodItem)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare foodItemId: number;

    @BelongsTo(() => FoodItem)
    declare foodItem: FoodItem;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 1,
    })
    declare quantity: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare priceAtBooking: number;
}
