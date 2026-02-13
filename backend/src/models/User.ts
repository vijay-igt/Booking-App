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
        allowNull: true, // Google ID is optional for non-Google users
        unique: true, // Ensure Google ID is unique
    })
    declare googleId?: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare passwordHash: string;

    @Default('user')
    @Column({
        type: DataType.ENUM('super_admin', 'admin', 'user'), // 'admin' is Theater Owner
        allowNull: false,
    })
    declare role: 'super_admin' | 'admin' | 'user';

    @Default(0.00)
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare walletBalance: number;

    @Default(10.00)
    @Column({
        type: DataType.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Commission percentage for theater owners (e.g., 10.00 for 10%)'
    })
    declare commissionRate: number;

    @Default('NONE')
    @Column({
        type: DataType.ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
    })
    declare adminRequestStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare passwordResetToken?: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare passwordResetExpires?: Date;

    @Default(false)
    @Column(DataType.BOOLEAN)
    declare isEmailVerified: boolean;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare emailVerificationToken?: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare emailVerificationExpires?: Date;
}
