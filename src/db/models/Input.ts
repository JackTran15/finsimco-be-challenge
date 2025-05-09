import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Input extends Model {
  public id!: string;
  public sessionId!: string;
  public teamId!: number;
  public fieldName!: string;
  public value!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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