import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from 'sequelize-typescript';
import { Screen } from './Screen';

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

    @HasMany(() => Screen)
    declare screens: Screen[];
}
