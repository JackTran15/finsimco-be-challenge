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
const POLLING_INTERVAL = 1500; // 1.5 seconds

// Global variables for polling control
let isEditing = false;
let pollingInterval: NodeJS.Timeout | null = null;

/**
 * Edits a single field and updates it immediately
 */
const editField = async (
  field: (typeof Input.FIELDS)[number],
  existingInputs: any[],
  outputId: string
): Promise<boolean> => {
  const index = Input.FIELDS.indexOf(field);
  const unit = Input.UNITS[index];
  const existing = existingInputs.find((input) => input.fieldName === field);
  const unitDisplay = unit ? `(${unit})` : "";

  // Get the approval status for this field
  const { approvals } = await getSessionContext(SESSION_ID, TEAM_ID);
  const approvalStatus = approvals.find(a => a.fieldName === field)?.isApproved;

  // Prompt for value
  const { value } = await inquirer.prompt([
    {
      type: "input",
      name: "value",
      message: `Enter value for ${field} ${unitDisplay}:`,
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

  // If user just pressed enter on existing value
  if (value === "" && existing) {
    return false; // No changes made
  }

  const newValue = parseFloat(value);

  // If value didn't change
  if (existing && newValue === existing.value) {
    return false; // No changes made
  }

  // If the field is already approved, warn the user that changing will reset to TBD
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
      return false; // No changes made
    }
  }

  // Start a transaction for all database operations
  const transaction = await sequelize.transaction();

  try {
    // Store the value immediately
    await upsertInput(SESSION_ID, TEAM_ID, field, {
      value: newValue,
      outputId,
    } as ExtendedInputRaw, transaction);

    // If we're changing an approved field, update the approval to false
    if (approvalStatus) {
      await upsertApproval(SESSION_ID, TEAM_ID, field, {
        isApproved: false
      }, transaction);
    }

    // Calculate valuation with updated values
    const { inputs: updatedInputs } = await getSessionContext(
      SESSION_ID,
      TEAM_ID
    );
    const inputValues = Object.fromEntries(
      updatedInputs.map((input) => [input.fieldName, input.value])
    );

    // Only calculate if we have all required fields
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

    // Commit the transaction
    await transaction.commit();

    // Pause to let user see the update message
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true; // Changes were made
  } catch (error) {
    // Rollback the transaction in case of error
    await transaction.rollback();
    console.error("Error updating field:", error);
    return false;
  }
};

const calculateValuation = (inputs: Record<string, number>) => {
  return inputs["EBITDA"] * inputs["Multiple"] * inputs["Factor Score"];
};

/**
 * Setup the polling to refresh data periodically
 */
const startPolling = async (outputId: string) => {
  // Clear any existing interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  // Set up keyboard listener only once
  let keypressListenerActive = false;
  
  pollingInterval = setInterval(async () => {
    // Only update the display when not in editing mode
    if (!isEditing) {
      try {
        // Get current data
        const {
          inputs: existingInputs,
          approvals: existingApprovals,
          outputs: existingOutputs,
          isAllApprovalsApproved,
        } = await getSessionContext(SESSION_ID, TEAM_ID);

        // Clear screen and show data
        console.clear();
        console.log(displayInputTable(existingInputs, existingApprovals));

        // Calculate valuation and show status
        const missingFields = Input.FIELDS.filter(
          (field) => !existingInputs.find((i) => i.fieldName === field)
        );

        // Check both the approval status and the output status
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
        
        // Check if all approvals are true and show status
        if (isAllApprovalsApproved && existingOutputs.length > 0 && existingOutputs[0].isApproved) {
          console.log(
            chalk.green("\n => All fields have been approved and output is finalized.\n")
          );
        }

        // Show hint for editing
        console.log(chalk.gray('(Auto-refreshing data every 1.5 seconds)'));
        console.log(chalk.gray('Press "E" to edit fields, "Q" to quit...\n'));
        
        // Setup keyboard listener if not already set
        if (!keypressListenerActive) {
          keypressListenerActive = true;
          
          const handleKeypress = (data: Buffer) => {
            const key = data.toString().toLowerCase();
            
            if (key === 'e') {
              // Stop listening
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener('data', handleKeypress);
              keypressListenerActive = false;
              
              // Start editing
              isEditing = true;
              showEditMenu(outputId).then(() => {
                // Return to polling after editing
                isEditing = false;
              });
            } else if (key === 'q') {
              // Quit application
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

/**
 * Displays the menu and handles field editing
 */
const showEditMenu = async (outputId: string): Promise<void> => {
  try {
    // Get current data
    const {
      inputs: existingInputs,
      approvals: existingApprovals,
      outputs: existingOutputs,
      isAllApprovalsApproved,
    } = await getSessionContext(SESSION_ID, TEAM_ID);
    
    // Clear screen and display table
    console.clear();
    console.log(displayInputTable(existingInputs, existingApprovals));
    
    // Show status and valuation
    const missingFields = Input.FIELDS.filter(
      (field) => !existingInputs.find((i) => i.fieldName === field)
    );
    
    // Check both the approval status and the output status
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
    
    // Check if all approvals are true and show status
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
    
    // Let user select field to edit
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
    
    // Handle user choice
    if (action === "exit") {
      // Exit application
      console.log("\nThank you for using the Financial Terms Calculator!\n");
      if (pollingInterval) clearInterval(pollingInterval);
      await closeDb();
      process.exit(0);
    } else if (action === "return") {
      // Return to polling view
      return;
    } else {
      // Edit the selected field
      const changes = await editField(
        action as (typeof Input.FIELDS)[number],
        existingInputs,
        outputId
      );
      
      // If changes were made, return to polling view
      if (changes) {
        return;
      } else {
        // If no changes, continue in edit menu
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

    // Get session context which now creates any missing records
    const { outputId } = await getSessionContext(SESSION_ID, TEAM_ID);

    // Start polling and allow editing
    await startPolling(outputId);

  } catch (error) {
    console.error("Error:", error);
    if (pollingInterval) clearInterval(pollingInterval);
    await closeDb();
  }
};

// Handle exit signals for cleanup
process.on('SIGINT', async () => {
  console.log("\nExiting application...");
  if (pollingInterval) clearInterval(pollingInterval);
  await closeDb();
  process.exit(0);
});

main();
