import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, Default } from 'sequelize-typescript';
import { User } from './User';

@Table({
    tableName: 'wallets',
    timestamps: true,
})
export class Wallet extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: true, // Null for platform wallet if not linked to a specific user
    })
    declare userId: number;

    @BelongsTo(() => User)
    declare user: User;

    @Column({
        type: DataType.ENUM('user', 'owner', 'platform'),
        allowNull: false,
    })
    declare type: 'user' | 'owner' | 'platform';

    @Default(0.00)
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare balance: number;
}
