import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, AllowNull } from 'sequelize-typescript';
import { User } from './User';
import { SupportTicketReply } from './SupportTicketReply';

@Table({
    tableName: 'support_tickets',
    timestamps: true,
})
export class SupportTicket extends Model {
    @AllowNull(false)
    @Column(DataType.STRING)
    subject!: string;

    @AllowNull(false)
    @Column(DataType.TEXT)
    message!: string;

    @AllowNull(false)
    @Column({
        type: DataType.ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'),
        defaultValue: 'OPEN',
    })
    status!: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

    @AllowNull(false)
    @Column({
        type: DataType.ENUM('LOW', 'MEDIUM', 'HIGH'),
        defaultValue: 'MEDIUM',
    })
    priority!: 'LOW' | 'MEDIUM' | 'HIGH';

    @AllowNull(false)
    @Column(DataType.STRING)
    category!: string;

    @ForeignKey(() => User)
    @Column(DataType.INTEGER)
    userId!: number;

    @BelongsTo(() => User)
    user!: User;

    @HasMany(() => SupportTicketReply)
    replies!: SupportTicketReply[];
}
