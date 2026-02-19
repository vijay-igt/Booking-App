import {
    Table, Column, Model, DataType,
    PrimaryKey, AutoIncrement, Default
} from 'sequelize-typescript';

export type RuleType = 'DAY_TYPE' | 'POPULARITY' | 'SEAT_CATEGORY' | 'DEMAND_SURGE' | 'FLAT_DISCOUNT';

@Table({
    tableName: 'pricing_rules',
    timestamps: true,
})
export class PricingRule extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.ENUM('DAY_TYPE', 'POPULARITY', 'SEAT_CATEGORY', 'DEMAND_SURGE', 'FLAT_DISCOUNT'),
        allowNull: false,
    })
    declare ruleType: RuleType;

    /**
     * Condition payload — shape depends on ruleType:
     *  DAY_TYPE:      { days: number[] }           e.g. [0, 6] for Sun & Sat
     *  POPULARITY:    { minScore: number }          e.g. { minScore: 75 }
     *  SEAT_CATEGORY: { category: string }          e.g. { category: "Premium" }
     *  DEMAND_SURGE:  {}  (threshold on Showtime)
     *  FLAT_DISCOUNT: {}  (always applies)
     */
    @Column({
        type: DataType.JSON,
        allowNull: false,
        defaultValue: {},
    })
    declare condition: Record<string, any>;

    /**
     * Price multiplier — e.g. 1.25 means +25%.
     * Null when using flatDiscount instead.
     */
    @Column({
        type: DataType.DECIMAL(5, 4),
        allowNull: true,
    })
    declare multiplier: number | null;

    /**
     * Fixed rupee discount — e.g. 50 means −₹50.
     * Null when using multiplier instead.
     */
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true,
    })
    declare flatDiscount: number | null;

    /**
     * Lower number = applied first.
     * Ties broken by id (ASC).
     */
    @Default(10)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare priority: number;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare isActive: boolean;

    @Column({
        type: DataType.DATEONLY,
        allowNull: true,
    })
    declare validFrom: string | null;

    @Column({
        type: DataType.DATEONLY,
        allowNull: true,
    })
    declare validUntil: string | null;
}
