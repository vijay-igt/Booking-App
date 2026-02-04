import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Theater } from './Theater';
import { Seat } from './Seat';
import { Showtime } from './Showtime';

@Table({
    tableName: 'screens',
    timestamps: true,
})
export class Screen extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => Theater)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare theaterId: number;

    @BelongsTo(() => Theater)
    declare theater: Theater;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @HasMany(() => Seat)
    declare seats: Seat[];

    @HasMany(() => Showtime)
    declare showtimes: Showtime[];
}
