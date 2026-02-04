import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Booking } from './Booking';
import { Seat } from './Seat';
import { Showtime } from './Showtime';

@Table({
    tableName: 'tickets',
    timestamps: true,
})
export class Ticket extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => Booking)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare bookingId: number;

    @BelongsTo(() => Booking)
    declare booking: Booking;

    @ForeignKey(() => Showtime)
    @Index({ name: 'showtime-seat-unique', unique: true })
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare showtimeId: number;

    @BelongsTo(() => Showtime)
    declare showtime: Showtime;

    @ForeignKey(() => Seat)
    @Index({ name: 'showtime-seat-unique', unique: true })
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare seatId: number;

    @BelongsTo(() => Seat)
    declare seat: Seat;
}
