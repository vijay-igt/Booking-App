import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Screen } from './Screen';
import { User } from './User';

@Table({
    tableName: 'theaters',
    timestamps: true,
})
export class Theater extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare location: string;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: true, // Temporarily allow null to support existing records during migration
    })
    declare ownerId: number;

    @BelongsTo(() => User)
    declare owner: User;

    @HasMany(() => Screen)
    declare screens: Screen[];
}
