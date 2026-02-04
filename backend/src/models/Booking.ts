import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './User';
import { Showtime } from './Showtime';
import { Ticket } from './Ticket';

@Table({
    tableName: 'bookings',
    timestamps: true,
})
export class Booking extends Model {
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

    @ForeignKey(() => Showtime)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare showtimeId: number;

    @BelongsTo(() => Showtime)
    declare showtime: Showtime;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare totalAmount: number;

    @Column({
        type: DataType.ENUM('pending', 'confirmed', 'cancelled'),
        allowNull: false,
        defaultValue: 'confirmed',
    })
    declare status: string;

    @HasMany(() => Ticket)
    declare tickets: Ticket[];
}
