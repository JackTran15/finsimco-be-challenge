import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Input extends Model {
  public id!: string;
  public sessionId!: string;
  public teamId!: number;
  public fieldName!: string;
  public value!: number;
  public outputId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static readonly FIELDS = ['EBITDA', 'Interest Rate', 'Multiple', 'Factor Score'] as const;
  static readonly UNITS = ['M$', '%', 'x', ''] as const;
}

Input.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fieldName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  outputId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'outputs',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Input',
  tableName: 'team_inputs',
  indexes: [
    {
      unique: true,
      fields: ['sessionId', 'teamId', 'fieldName'],
      name: 'unique_session_team_field'
    }
  ]
}); 

export type InputRaw = {
  id: string;
  sessionId: string;
  teamId: number;
  fieldName: string;
  value: number;
  outputId: string;
  createdAt: Date;
  updatedAt: Date;
};