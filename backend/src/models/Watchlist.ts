import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, Unique } from 'sequelize-typescript';
import { User } from './User';
import { Movie } from './Movie';

@Table({
    tableName: 'watchlists',
    timestamps: true,
})
export class Watchlist extends Model {
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

    @ForeignKey(() => Movie)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare movieId: number;

    @BelongsTo(() => Movie)
    declare movie: Movie;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare location?: string;

    @Unique('user_movie_unique')
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare tag?: string;
}
