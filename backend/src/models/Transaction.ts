import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';
import { WalletRequest } from './WalletRequest';

@Table({
    tableName: 'transactions',
    timestamps: true,
})
export class Transaction extends Model {
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

    @ForeignKey(() => WalletRequest)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare walletRequestId: number;

    @BelongsTo(() => WalletRequest)
    declare walletRequest: WalletRequest;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare amount: number;

    @Column({
        type: DataType.ENUM('CREDIT', 'DEBIT'),
        allowNull: false,
    })
    declare type: 'CREDIT' | 'DEBIT';

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare description: string;
}
