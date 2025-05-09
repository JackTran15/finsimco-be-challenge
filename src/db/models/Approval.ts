import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize';

export class Approval extends Model {
  public id!: string;
  public sessionId!: string;
  public teamId!: number;
  public fieldName!: string;
  public status!: boolean;
  public readonly updatedAt!: Date;
}

Approval.init({
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
  status: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  sequelize,
  modelName: 'Approval',
  tableName: 'approvals',
  indexes: [
    {
      unique: true,
      fields: ['sessionId', 'teamId', 'fieldName'],
      name: 'unique_session_team_field_approval'
    }
  ]
}); 