import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class InvestorAllocation extends Model {
  public id!: string;
  public sessionId!: string;
  public investorName!: string;
  public companyName!: string;
  public bidAmount!: number;
  public allocatedAmount!: number;
  public allocationRatio!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

InvestorAllocation.init({
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
  bidAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  allocatedAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  allocationRatio: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
  }
}, {
  sequelize,
  modelName: 'InvestorAllocation',
  tableName: 'investor_allocations',
  indexes: [
    {
      unique: true,
      fields: ['sessionId', 'investorName', 'companyName'],
      name: 'unique_session_investor_company_allocation'
    }
  ]
}); 