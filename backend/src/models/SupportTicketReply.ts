import { Table, Column, Model, DataType, ForeignKey, BelongsTo, AllowNull } from 'sequelize-typescript';
import { User } from './User';
import { SupportTicket } from './SupportTicket';

@Table({
    tableName: 'support_ticket_replies',
    timestamps: true,
})
export class SupportTicketReply extends Model {
    @ForeignKey(() => SupportTicket)
    @Column(DataType.INTEGER)
    ticketId!: number;

    @BelongsTo(() => SupportTicket)
    ticket!: SupportTicket;

    @ForeignKey(() => User)
    @Column(DataType.INTEGER)
    senderId!: number;

    @BelongsTo(() => User)
    sender!: User;

    @AllowNull(false)
    @Column(DataType.TEXT)
    message!: string;
}
