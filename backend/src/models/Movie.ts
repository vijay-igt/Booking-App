import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from 'sequelize-typescript';
import { Showtime } from './Showtime';

@Table({
    tableName: 'movies',
    timestamps: true,
})
export class Movie extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare title: string;

    @Column(DataType.TEXT)
    declare description: string;

    @Column(DataType.STRING)
    declare genre: string;

    @Column(DataType.INTEGER)
    declare duration: number; // in minutes

    @Column(DataType.STRING)
    declare rating: string; // e.g., '8.5'

    @Column(DataType.TEXT)
    declare posterUrl: string;

    @Column(DataType.TEXT)
    declare bannerUrl: string;

    @Column(DataType.DATEONLY)
    declare releaseDate: string;

    @Column({
        type: DataType.STRING,
        defaultValue: 'English'
    })
    declare language: string;

    @Column({
        type: DataType.STRING,
        defaultValue: 'Dolby Atmos'
    })
    declare audio: string;

    @Column({
        type: DataType.TEXT,
        defaultValue: 'IMAX 2D'
    })
    declare format: string;

    @HasMany(() => Showtime)
    declare showtimes: Showtime[];
}
