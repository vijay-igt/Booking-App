import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Coupon } from './Coupon';
import { User } from './User';
import { Booking } from './Booking';

@Table({
    tableName: 'coupon_usages',
    timestamps: true,
    indexes: [
        { name: 'coupon_usage_user_idx', fields: ['couponId', 'userId'] },
    ],
})
export class CouponUsage extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => Coupon)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare couponId: number;

    @BelongsTo(() => Coupon)
    declare coupon: Coupon;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare userId: number;

    @BelongsTo(() => User)
    declare user: User;

    @ForeignKey(() => Booking)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        unique: 'coupon_usage_booking_unique',
    })
    declare bookingId: number;

    @BelongsTo(() => Booking)
    declare booking: Booking;
}
