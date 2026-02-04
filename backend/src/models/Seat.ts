import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Screen } from './Screen';
import { Ticket } from './Ticket';

@Table({
    tableName: 'seats',
    timestamps: true,
})
export class Seat extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => Screen)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare screenId: number;

    @BelongsTo(() => Screen)
    declare screen: Screen;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare row: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare number: number;

    @Column({
        type: DataType.ENUM('Regular', 'Premium'),
        allowNull: false,
        defaultValue: 'Regular',
    })
    declare type: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare price: number; // Base price for this seat type

    @HasMany(() => Ticket)
    declare tickets: Ticket[];
}
