import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize';
import { Input } from './Input';

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
    defaultValue: 'default_session',
  },
  inputTeamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  valuation: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  generatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Output',
  tableName: 'outputs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['sessionId', 'inputTeamId'],
      name: 'unique_session_input_team_output'
    }
  ]
});

Output.hasMany(Input, {
  foreignKey: {
    name: 'outputId',
    allowNull: false
  },
  as: 'inputs'
});

Input.belongsTo(Output, {
  foreignKey: {
    name: 'outputId',
    allowNull: false
  },
  as: 'output'
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