import { Input, InputRaw } from "../db/models/Input";
import { Transaction } from "sequelize";

export function getInputs (sessionId: string, inputTeamId: number, transaction?: Transaction) {
    return Input.findAll({
        where: { sessionId, teamId: inputTeamId },
        raw: true,
        transaction
    });
}

export function upsertInput (
    sessionId: string, 
    inputTeamId: number, 
    fieldName: string, 
    data: Partial<InputRaw>,
    transaction?: Transaction
) {
    return Input.upsert({
        sessionId,
        teamId: inputTeamId,
        fieldName,
        ...data,
    }, {
        conflictWhere: { sessionId, teamId: inputTeamId, fieldName },
        returning: true,
        transaction
    });
}

// Extend the InputRaw type to include outputId
export type ExtendedInputRaw = InputRaw & {
    outputId: string;
};