import {
    Table, Column, Model, DataType,
    PrimaryKey, AutoIncrement, Default,
    ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { User } from './User';
import { Movie } from './Movie';
import { Showtime } from './Showtime';

export type DiscountType = 'PERCENT' | 'FLAT';

@Table({
    tableName: 'coupons',
    timestamps: true,
})

export class Coupon extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare code: string;

    /** Who created this coupon — admin or super_admin */
    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare createdBy: number;

    @BelongsTo(() => User, 'createdBy')
    declare creator: User;

    @Column({
        type: DataType.ENUM('PERCENT', 'FLAT'),
        allowNull: false,
    })
    declare discountType: DiscountType;

    /** Percentage (0–100) for PERCENT type, or fixed ₹ amount for FLAT type */
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare discountValue: number;

    /** Total redemption cap. Null = unlimited */
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare maxUses: number | null;

    @Default(0)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare usedCount: number;

    /** Max times a single user can use this coupon. Null = unlimited */
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare perUserLimit: number | null;

    /** Minimum cart value required to apply this coupon */
    @Default(0)
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare minOrderValue: number;

    /** Optional start of validity window */
    @Column({
        type: DataType.DATEONLY,
        allowNull: true,
    })
    declare validFrom: string | null;

    /** Optional end of validity window */
    @Column({
        type: DataType.DATEONLY,
        allowNull: true,
    })
    declare expiresAt: string | null;

    /** Restrict coupon to a specific movie. Null = any movie */
    @ForeignKey(() => Movie)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare movieId: number | null;

    @BelongsTo(() => Movie)
    declare movie: Movie;

    /** Restrict coupon to a specific showtime. Null = any showtime */
    @ForeignKey(() => Showtime)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare showtimeId: number | null;

    @BelongsTo(() => Showtime)
    declare showtime: Showtime;

    /** Restrict to a specific seat category e.g. "Premium". Null = all categories */
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare seatCategory: string | null;

    /** Restrict to a specific payment method e.g. "WALLET". Null = all methods */
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare paymentMethod: string | null;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare isActive: boolean;
}
