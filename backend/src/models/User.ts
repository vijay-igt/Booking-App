import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, Default } from 'sequelize-typescript';

@Table({
    tableName: 'users',
    timestamps: true,
})
export class User extends Model {
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
        unique: true,
    })
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare passwordHash: string;

    @Default('user')
    @Column({
        type: DataType.ENUM('admin', 'user'),
        allowNull: false,
    })
    declare role: 'admin' | 'user';
}
