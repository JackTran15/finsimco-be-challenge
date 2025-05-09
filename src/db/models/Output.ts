import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Output extends Model {
  public id!: string;
  public sessionId!: string;
  public inputTeamId!: number;
  public valuation!: number;
  public isApproved!: boolean;
  public readonly generatedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Output.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  inputTeamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  valuation: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  generatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Output',
  tableName: 'outputs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['sessionId'],
      name: 'unique_session_output'
    }
  ]
});

// Export the raw type that includes all fields
export type OutputRaw = {
  id: string;
  sessionId: string;
  inputTeamId: number;
  valuation: number;
  isApproved: boolean;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

// Keep the existing type for backward compatibility
export type OutputDataValues = Output['dataValues'];