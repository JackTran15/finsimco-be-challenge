import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class SharesBid extends Model {
  public id!: string;
  public sessionId!: string;
  public investorName!: string;
  public companyName!: string;
  public bids!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SharesBid.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  investorName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bids: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  sequelize,
  modelName: 'SharesBid',
  tableName: 'shares_bids',
  indexes: [
    {
      unique: true,
      fields: ['sessionId', 'investorName', 'companyName'],
      name: 'unique_session_investor_company'
    }
  ]
}); 