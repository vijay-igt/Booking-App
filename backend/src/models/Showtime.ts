import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany, Default } from 'sequelize-typescript';
import { Movie } from './Movie';
import { Screen } from './Screen';
import { Booking } from './Booking';

@Table({
    tableName: 'showtimes',
    timestamps: true,
})
export class Showtime extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => Movie)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare movieId: number;

    @BelongsTo(() => Movie)
    declare movie: Movie;

    @ForeignKey(() => Screen)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare screenId: number;

    @BelongsTo(() => Screen)
    declare screen: Screen;

    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    declare startTime: Date;

    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    declare endTime: Date;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null
    })
    declare price?: number;

    @Column({
        type: DataType.JSON,
        allowNull: true,
    })
    declare tierPrices: any; // e.g. { "Classic": 150, "Premium": 300 }

    @Default(70)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        comment: 'Occupancy % above which DEMAND_SURGE pricing rule activates. Default 70%.'
    })
    declare occupancyThreshold: number;

    @HasMany(() => Booking)
    declare bookings: Booking[];
}
