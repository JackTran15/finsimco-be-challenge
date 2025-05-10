import { Output, OutputRaw } from "../db/models/Output";
import { Transaction } from "sequelize";

export function getOutput(sessionId: string, inputTeamId: number, fieldName: string, transaction?: Transaction) {
  return Output.findOne({
    where: { sessionId, inputTeamId, fieldName },
    raw: true,
    transaction
  });
}

export function updateOutput(
  sessionId: string,
  inputTeamId: number,
  data: Partial<OutputRaw>,
  transaction?: Transaction
) {
  return Output.upsert(
    {
      sessionId,
      inputTeamId,
      ...data,
    },
    {
      conflictWhere: { sessionId, inputTeamId },
      returning: true,
      transaction
    }
  );
}

export function upsertOutput(
  sessionId: string,
  inputTeamId: number,
  data: Partial<OutputRaw> = {},
  transaction?: Transaction
) {
  return Output.upsert(
    {
      sessionId,
      inputTeamId,
      ...data,
    },
    {
      conflictWhere: { sessionId },
      returning: true,
      transaction
    }
  );
}

export function getOutputs(sessionId: string, inputTeamId: number, transaction?: Transaction) {
  return Output.findAll({
    where: { sessionId, inputTeamId },
    raw: true,
    transaction
  });
}

// Extend the OutputRaw type to include value
export type ExtendedOutputRaw = OutputRaw & {
  value: number;
};
