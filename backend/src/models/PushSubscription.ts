import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table({
    tableName: 'push_subscriptions',
    timestamps: true,
})
export class PushSubscription extends Model {
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
        type: DataType.TEXT,
        allowNull: false,
        unique: 'user_token_unique'
    })
    declare token: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare platform: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW
    })
    declare lastActive: Date;
}
