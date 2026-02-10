import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table({
    tableName: 'wallet_requests',
    timestamps: true,
})
export class WalletRequest extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare userId: number;

    @BelongsTo(() => User)
    declare user: User;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare amount: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare paymentMethod: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare transactionRef: string;

    @Default('PENDING')
    @Column({
        type: DataType.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
    })
    declare status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
