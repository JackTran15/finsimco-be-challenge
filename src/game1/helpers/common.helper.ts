import { Input } from "../db/models/Input";
import { getApprovals, upsertApproval } from "./approvals.helper";
import { getInputs, upsertInput } from "./inputs.helper";
import { getOutputs, upsertOutput, ExtendedOutputRaw } from "./output.helper";
import { sequelize } from "../db/sequelize";
import { Transaction } from "sequelize";

export async function getSessionContext (sessionId: string, inputTeamId: number) {
  const [approvals, inputs, outputs] = await Promise.all([
    getApprovals(sessionId, inputTeamId),
    getInputs(sessionId, inputTeamId),
    getOutputs(sessionId, inputTeamId),
  ]);

  const transaction = await sequelize.transaction();

  try {
    let outputId: string;
    if (outputs.length === 0) {
      // Create initial output record if none exists
      const [newOutput] = await upsertOutput(sessionId, inputTeamId, {
        value: 0,
        isApproved: false,
      } as ExtendedOutputRaw, transaction);
      outputId = newOutput.id;
    } else {
      outputId = outputs[0].id;
    }

    // Create placeholder approvals for any missing fields
    const missingApprovalFields = Input.FIELDS.filter(field => 
      !approvals.some(approval => approval.fieldName === field)
    );

    // Create placeholder approvals for fields that don't have them
    if (missingApprovalFields.length > 0) {
      console.log(`Creating ${missingApprovalFields.length} missing approval records`);
      await Promise.all(
        missingApprovalFields.map(field => 
          upsertApproval(sessionId, inputTeamId, field, { isApproved: false }, transaction)
        )
      );
      // Refresh approvals after creating placeholders
      const updatedApprovals = await getApprovals(sessionId, inputTeamId, transaction);
      approvals.splice(0, approvals.length, ...updatedApprovals);
    }

    // Create placeholder inputs for any missing fields
    const missingInputFields = Input.FIELDS.filter(field => 
      !inputs.some(input => input.fieldName === field)
    );

    // Create placeholder inputs with default values
    if (missingInputFields.length > 0) {
      console.log(`Creating ${missingInputFields.length} missing input records`);
      await Promise.all(
        missingInputFields.map(field => 
          upsertInput(sessionId, inputTeamId, field, {
            value: 1, // Default starting value
            outputId,
          }, transaction)
        )
      );
      // Refresh inputs after creating placeholders
      const updatedInputs = await getInputs(sessionId, inputTeamId, transaction);
      inputs.splice(0, inputs.length, ...updatedInputs);
    }

    // First check if we have approvals for all input fields
    const hasAllFieldApprovals = Input.FIELDS.every(field => 
      approvals.some(approval => approval.fieldName === field)
    );

    // Then check if all existing approvals are approved
    const isAllApprovalsApproved = 
      hasAllFieldApprovals && 
      approvals.every(approval => approval.isApproved);

    // Update output status if all approvals are approved
    if (isAllApprovalsApproved && outputs.length > 0) {
      console.log('All approvals are approved');
      await upsertOutput(sessionId, inputTeamId, {
        isApproved: true,
      }, transaction);
    }

    // Commit the transaction
    await transaction.commit();

    return {
      approvals,
      inputs,
      outputs,
      isAllApprovalsApproved,
      outputId
    };
  } catch (error) {
    await transaction.rollback();
    console.error("Error in session context:", error);
    throw error;
  }
}