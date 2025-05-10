import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class CompanyPricing extends Model {
  public id!: string;
  public sessionId!: string;
  public companyName!: string;
  public price!: number;
  public shares!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CompanyPricing.init({
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
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  shares: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  sequelize,
  modelName: 'CompanyPricing',
  tableName: 'company_pricing',
  indexes: [
    {
      unique: true,
      fields: ['sessionId', 'companyName'],
      name: 'unique_session_company'
    }
  ]
}); 