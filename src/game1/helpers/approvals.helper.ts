import { Approval, ApprovalRaw } from "../db/models/Approval";
import { Transaction } from "sequelize";

export function getApprovals (sessionId: string, inputTeamId: number, transaction?: Transaction) {
    return Approval.findAll({
        where: { sessionId, teamId: inputTeamId },
        raw: true,
        transaction
    });
}

export function upsertApproval (
    sessionId: string, 
    inputTeamId: number, 
    fieldName: string, 
    data: Partial<ApprovalRaw>,
    transaction?: Transaction
) {
    return Approval.upsert({
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

export function updateApproval (
    sessionId: string, 
    inputTeamId: number, 
    fieldName: string, 
    data: Partial<ApprovalRaw>,
    transaction?: Transaction
) {
    return Approval.update({
        ...data,
    }, {
        where: { sessionId, teamId: inputTeamId, fieldName },
        transaction
    });
}

export async function isAllApprovalsApproved (sessionId: string, inputTeamId: number, transaction?: Transaction) {
    const approvals = await getApprovals(sessionId, inputTeamId, transaction);
    return approvals.every(approval => approval.isApproved);
}

