import inquirer from "inquirer";
import chalk from "chalk";
import { Input } from "./db/models/Input";
import { initDb, closeDb } from "./db";
import { sequelize } from "./db/sequelize";
import dotenv from "dotenv";
import { upsertInput, ExtendedInputRaw } from "./helpers/inputs.helper";
import { getSessionContext } from "./helpers/common.helper";
import { displayInputTable } from "./helpers/display.helper";
import { upsertOutput, ExtendedOutputRaw } from "./helpers/output.helper";
import { upsertApproval } from "./helpers/approvals.helper";

dotenv.config();

const SESSION_ID = process.env.DEFAULT_SESSION_ID || "default_session";
const TEAM_ID = 1;
const POLLING_INTERVAL = 1500;

let isEditing = false;
let pollingInterval: NodeJS.Timeout | null = null;

const editField = async (
  field: (typeof Input.FIELDS)[number],
  existingInputs: any[],
  outputId: string
): Promise<boolean> => {
  const index = Input.FIELDS.indexOf(field);
  const unit = Input.UNITS[index];
  const existing = existingInputs.find((input) => input.fieldName === field);
  const unitDisplay = unit ? `(${unit})` : "";

  const { approvals } = await getSessionContext(SESSION_ID, TEAM_ID);
  const approvalStatus = approvals.find(a => a.fieldName === field)?.isApproved;

  const escHandler = (data: Buffer) => {
    if (data.toString() === '\u001b') {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', escHandler);
      process.exit(0);
    }
  };
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', escHandler);

  try {
    const { value } = await inquirer.prompt([
      {
        type: "input",
        name: "value",
        message: `Enter value for ${field} ${unitDisplay} (Press ESC to cancel):`,
        default: existing?.value?.toString(),
        validate: (input) => {
          if (input === "" && !existing) {
            return "A value is required for new fields";
          }
          if (input === "") return true;
          return !isNaN(Number(input)) && Number(input) > 0
            ? true
            : "Must be a number greater than 0";
        },
      },
    ]);

    process.stdin.removeListener('data', escHandler);
    process.stdin.setRawMode(false);
    process.stdin.pause();

    if (value === "" && existing) {
      return false;
    }

    const newValue = parseFloat(value);

    if (existing && newValue === existing.value) {
      return false;
    }

    if (approvalStatus && existing) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `${field} is currently approved (OK). Changing the value will reset approval to In TBD. Continue?`,
          default: false,
        }
      ]);

      if (!confirm) {
        console.log(chalk.blueBright(`\n => Keeping current value for ${field}.\n`));
        return false;
      }
    }

    const transaction = await sequelize.transaction();

    try {
      await upsertInput(SESSION_ID, TEAM_ID, field, {
        value: newValue,
        outputId,
      } as ExtendedInputRaw, transaction);

      if (approvalStatus) {
        await upsertApproval(SESSION_ID, TEAM_ID, field, {
          isApproved: false
        }, transaction);
      }

      const { inputs: updatedInputs } = await getSessionContext(
        SESSION_ID,
        TEAM_ID
      );
      const inputValues = Object.fromEntries(
        updatedInputs.map((input) => [input.fieldName, input.value])
      );

      let valuation = 0;
      const missingFields = Input.FIELDS.filter(
        (f) => !updatedInputs.find((i) => i.fieldName === f)
      );

      if (missingFields.length === 0) {
        valuation = calculateValuation(inputValues);
        await upsertOutput(SESSION_ID, TEAM_ID, {
          value: valuation,
          isApproved: false,
        } as ExtendedOutputRaw, transaction);

        console.log(
          chalk.green(
            `\n => Updated ${field} to ${newValue}. New valuation: ${valuation.toLocaleString(
              "en-US",
              {
                maximumFractionDigits: 2,
              }
            )} M$\n`
          )
        );
        console.log(
          chalk.blueBright(`Final output status: ${chalk.yellow("[In TBD]")}\n`)
        );
      } else {
        console.log(chalk.green(`\n => Updated ${field} to ${newValue}.\n`));
        console.log(chalk.yellow(`Still missing: ${missingFields.join(", ")}\n`));
        console.log(
          chalk.blueBright(`Final output status: ${chalk.yellow("[In TBD]")}\n`)
        );
      }

      await transaction.commit();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating field:", error);
      return false;
    }
  } catch (error) {
    process.stdin.removeListener('data', escHandler);
    process.stdin.setRawMode(false);
    process.stdin.pause();
    throw error;
  }
};

const calculateValuation = (inputs: Record<string, number>) => {
  return inputs["EBITDA"] * inputs["Multiple"] * inputs["Factor Score"];
};

const startPolling = async (outputId: string) => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  let keypressListenerActive = false;
  
  pollingInterval = setInterval(async () => {
    if (!isEditing) {
      try {
        const {
          inputs: existingInputs,
          approvals: existingApprovals,
          outputs: existingOutputs,
          isAllApprovalsApproved,
        } = await getSessionContext(SESSION_ID, TEAM_ID);

        console.clear();
        console.log(displayInputTable(existingInputs, existingApprovals));

        const missingFields = Input.FIELDS.filter(
          (field) => !existingInputs.find((i) => i.fieldName === field)
        );

        const isFinalApproved = isAllApprovalsApproved && 
          existingOutputs.length > 0 && 
          existingOutputs[0].isApproved;
          
        const statusText = isFinalApproved ? "OK" : "In TBD";
        const statusColor = isFinalApproved ? chalk.green : chalk.yellow;
        console.log(
          chalk.blueBright(
            `Final output status: ${statusColor(`[${statusText}]`)}\n`
          )
        );

        if (missingFields.length === 0) {
          const inputValues = Object.fromEntries(
            existingInputs.map((input) => [input.fieldName, input.value])
          );
          const valuation = calculateValuation(inputValues);
          console.log(
            chalk.blueBright(
              `Current Valuation: ${valuation.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })} M$\n`
            )
          );
        } else {
          console.log(
            chalk.yellow(`Missing fields: ${missingFields.join(", ")}\n`)
          );
        }
        
        if (isAllApprovalsApproved && existingOutputs.length > 0 && existingOutputs[0].isApproved) {
          console.log(
            chalk.green("\n => All fields have been approved and output is finalized.\n")
          );
        }

        console.log(chalk.gray('(Auto-refreshing data every 1.5 seconds)'));
        console.log(chalk.gray('Press "E" to edit fields, "ESC" to quit...\n'));
        
        if (!keypressListenerActive) {
          keypressListenerActive = true;
          
          const handleKeypress = (data: Buffer) => {
            const key = data.toString().toLowerCase();
            
            if (key === 'e') {
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener('data', handleKeypress);
              keypressListenerActive = false;
              
              isEditing = true;
              showEditMenu(outputId).then(() => {
                isEditing = false;
              });
            } else if (key === '\u001b') {
              console.clear();
              console.log("\nThank you for using the Financial Terms Calculator!\n");
              if (pollingInterval) clearInterval(pollingInterval);
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener('data', handleKeypress);
              keypressListenerActive = false;
              closeDb().then(() => process.exit(0));
            }
          };
          
          process.stdin.setRawMode(true);
          process.stdin.resume();
          process.stdin.on('data', handleKeypress);
        }
      } catch (error) {
        console.error("Error during polling:", error);
      }
    }
  }, POLLING_INTERVAL);
};

const showEditMenu = async (outputId: string): Promise<void> => {
  try {
    const {
      inputs: existingInputs,
      approvals: existingApprovals,
      outputs: existingOutputs,
      isAllApprovalsApproved,
    } = await getSessionContext(SESSION_ID, TEAM_ID);
    
    console.clear();
    console.log(displayInputTable(existingInputs, existingApprovals));
    
    const missingFields = Input.FIELDS.filter(
      (field) => !existingInputs.find((i) => i.fieldName === field)
    );
    
    const isFinalApproved = isAllApprovalsApproved && 
      existingOutputs.length > 0 && 
      existingOutputs[0].isApproved;
      
    const statusText = isFinalApproved ? "OK" : "In TBD";
    const statusColor = isFinalApproved ? chalk.green : chalk.yellow;
    console.log(
      chalk.blueBright(
        `Final output status: ${statusColor(`[${statusText}]`)}\n`
      )
    );
    
    if (missingFields.length === 0) {
      const inputValues = Object.fromEntries(
        existingInputs.map((input) => [input.fieldName, input.value])
      );
      const valuation = calculateValuation(inputValues);
      console.log(
        chalk.blueBright(
          `Current Valuation: ${valuation.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })} M$\n`
        )
      );
    } else {
      console.log(
        chalk.yellow(`Missing fields: ${missingFields.join(", ")}\n`)
      );
    }
    
    if (isAllApprovalsApproved && existingOutputs.length > 0 && existingOutputs[0].isApproved) {
      console.log(
        chalk.green("\n => All fields have been approved and output is finalized.\n")
      );
      
      const { continueEditing } = await inquirer.prompt([
        {
          type: "confirm",
          name: "continueEditing",
          message: "All approvals complete. Continue editing?",
          default: false,
        },
      ]);
      
      if (!continueEditing) {
        console.log("\nThank you for using the Financial Terms Calculator!\n");
        if (pollingInterval) clearInterval(pollingInterval);
        await closeDb();
        process.exit(0);
      }
    }
    
    const choices = [
      ...Input.FIELDS.map((field, index) => ({
        name: `${index + 1}. ${field} ${
          Input.UNITS[index] ? `(${Input.UNITS[index]})` : ""
        }`,
        value: field,
      })),
      { name: "Return to polling view", value: "return" },
      { name: "Exit", value: "exit" },
    ];
    
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "Select a field to edit:",
        choices,
      },
    ]);
    
    if (action === "exit") {
      console.log("\nThank you for using the Financial Terms Calculator!\n");
      if (pollingInterval) clearInterval(pollingInterval);
      await closeDb();
      process.exit(0);
    } else if (action === "return") {
      return;
    } else {
      const changes = await editField(
        action as (typeof Input.FIELDS)[number],
        existingInputs,
        outputId
      );
      
      if (changes) {
        return;
      } else {
        return showEditMenu(outputId);
      }
    }
  } catch (error) {
    console.error("Error in edit menu:", error);
  }
};

const main = async () => {
  try {
    await initDb();
    console.log("\n** TEAM 1 CLI – Enter Your Financial Terms **\n");
    console.log(chalk.blueBright(`Session ID: ${SESSION_ID}\n`));

    const { outputId } = await getSessionContext(SESSION_ID, TEAM_ID);
    await startPolling(outputId);

  } catch (error) {
    console.error("Error:", error);
    if (pollingInterval) clearInterval(pollingInterval);
    await closeDb();
  }
};

process.on('SIGINT', async () => {
  console.log("\nExiting application...");
  if (pollingInterval) clearInterval(pollingInterval);
  await closeDb();
  process.exit(0);
});

main();
