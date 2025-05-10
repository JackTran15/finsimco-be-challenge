import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class BiddingOutput extends Model {
  public id!: string;
  public sessionId!: string;
  public companyName!: string;
  public sharesBidFor!: number;
  public capitalRaised!: number;
  public subscription!: 'Under' | 'Over'
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BiddingOutput.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sharesBidFor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  capitalRaised: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  subscription: {
    type: DataTypes.ENUM('Under', 'Over', 'Equal'),
    allowNull: false,
    defaultValue: 'Under',
  }
}, {
  sequelize,
  modelName: 'BiddingOutput',
  tableName: 'bidding_outputs',
  indexes: [
    {
      unique: true,
      fields: ['sessionId', 'companyName'],
      name: 'unique_session_company_output'
    }
  ]
}); 