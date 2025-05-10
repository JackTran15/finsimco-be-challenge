import inquirer from "inquirer";
import chalk from "chalk";
import { Input } from "./db/models/Input";
import { initDb, closeDb } from "./db";
import dotenv from "dotenv";
import { getSessionContext } from "./helpers/common.helper";
import { displayInputTable } from "./helpers/display.helper";
import { upsertApproval } from "./helpers/approvals.helper";
import { upsertOutput, ExtendedOutputRaw } from "./helpers/output.helper";
import { sequelize } from "./db/sequelize";

dotenv.config();

const SESSION_ID = process.env.DEFAULT_SESSION_ID || "default_session";
const TEAM_ID = 1;
const POLLING_INTERVAL = 1500; // 1.5 seconds

/**
 * Allows the user to directly set the approval status for a field
 */
const setFieldApproval = async (
    field: (typeof Input.FIELDS)[number],
    existingApprovals: any[]
): Promise<boolean> => {
    const existing = existingApprovals.find((approval) => approval.fieldName === field);
    const currentStatus = existing?.isApproved;
    
    // Let user choose the status explicitly
    const { newStatus } = await inquirer.prompt([
        {
            type: "list",
            name: "newStatus",
            message: `Select approval status for ${field}:`,
            choices: [
                { name: "OK", value: true },
                { name: "TBD", value: false }
            ],
            default: currentStatus ? 0 : 1 // Default to current status
        }
    ]);
    
    // If status didn't change
    if (newStatus === currentStatus) {
        console.log(chalk.blueBright(`\n => ${field} status unchanged.\n`));
        return false; // No changes made
    }
    
    // Start a transaction for all database operations
    const transaction = await sequelize.transaction();
    
    try {
        // Update the approval
        await upsertApproval(SESSION_ID, TEAM_ID, field, {
            isApproved: newStatus
        }, transaction);
        
        // Get updated data to check if all fields are approved
        const { 
            inputs: updatedInputs,
            approvals: updatedApprovals, 
            isAllApprovalsApproved 
        } = await getSessionContext(
            SESSION_ID,
            TEAM_ID
        );
        
        // Refresh the display
        console.clear();
        console.log(displayInputTable(updatedInputs, updatedApprovals));
        
        console.log(
            chalk.green(`\n => ${field} is now ${newStatus ? "OK" : "In TBD"}.\n`)
        );
        
        // If all fields are approved, update the output status
        if (isAllApprovalsApproved) {
            await upsertOutput(SESSION_ID, TEAM_ID, {
                isApproved: true
            } as ExtendedOutputRaw, transaction);
            
            console.log(
                chalk.green(`\n => All fields approved! Final output is now OK.\n`)
            );
        } else {
            // If not all approved, ensure output is marked as not approved
            await upsertOutput(SESSION_ID, TEAM_ID, {
                isApproved: false
            } as ExtendedOutputRaw, transaction);
            
            console.log(
                chalk.blueBright(`Final output status: ${chalk.yellow("[In TBD]")}\n`)
            );
        }
        
        // Display valuation if all inputs are available
        const missingFields = Input.FIELDS.filter(
            (f) => !updatedInputs.find((i) => i.fieldName === f)
        );
        
        if (missingFields.length === 0) {
            const inputValues = Object.fromEntries(
                updatedInputs.map((input) => [input.fieldName, input.value])
            );
            const valuation = 
                inputValues["EBITDA"] * 
                inputValues["Multiple"] * 
                inputValues["Factor Score"];
            
            console.log(
                chalk.blueBright(
                    `Current Valuation: ${valuation.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                    })} M$\n`
                )
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
        console.error("Error updating approval:", error);
        return false;
    }
};

/**
 * Shows the approval menu and handles field modifications
 */
const showApprovalMenu = async (): Promise<void> => {
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
        
        // Always show approval status
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
            const valuation = 
                inputValues["EBITDA"] * 
                inputValues["Multiple"] * 
                inputValues["Factor Score"];
            
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
        
        // Check if all approvals are true
        if (isAllApprovalsApproved && existingOutputs.length > 0 && existingOutputs[0].isApproved) {
            console.log(
                chalk.green("\n => All fields have been approved and output is finalized.\n")
            );
            
            const { continueReviewing } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "continueReviewing",
                    message: "All approvals complete. Continue reviewing?",
                    default: false,
                },
            ]);
            
            if (!continueReviewing) {
                console.log("\nThank you for reviewing the Financial Terms!\n");
                await closeDb();
                process.exit(0);
            }
        }
        
        // Let user select field to modify
        const choices = [
            ...Input.FIELDS.map((field, index) => {
                const approval = existingApprovals.find((a) => a.fieldName === field);
                const status = approval?.isApproved ? "OK" : "In TBD";
                const statusColor = approval?.isApproved ? chalk.green : chalk.yellow;
                
                return {
                    name: `${index + 1}. ${field} ${
                        Input.UNITS[index] ? `(${Input.UNITS[index]})` : ""
                    } - ${statusColor(status)}`,
                    value: field,
                };
            }),
            { name: "Return to polling view", value: "return" },
            { name: "Exit", value: "exit" },
        ];
        
        const { action } = await inquirer.prompt([
            {
                type: "list",
                name: "action",
                message: "Select a field to modify approval:",
                choices,
            },
        ]);
        
        // Handle user choice
        if (action === "exit") {
            console.log("\nThank you for reviewing the Financial Terms!\n");
            await closeDb();
            process.exit(0);
        } else if (action === "return") {
            // Return to polling view
            return;
        } else {
            // Modify approval for the selected field
            const changes = await setFieldApproval(
                action as (typeof Input.FIELDS)[number],
                existingApprovals
            );
            
            // If changes were made, return to polling view
            if (changes) {
                return;
            } else {
                // If no changes, continue in approval menu
                return showApprovalMenu();
            }
        }
    } catch (error) {
        console.error("Error in approval menu:", error);
    }
};

const main = async () => {
    try {
        await initDb();
        console.log("\n** TEAM 2 CLI – Review and Approve Financial Terms **\n");
        console.log(chalk.blueBright(`Session ID: ${SESSION_ID}\n`));

        // Set up polling interval
        let isEditing = false;
        let keypressListenerActive = false;
        const polling = setInterval(async () => {
            // Only update display when not editing
            if (!isEditing) {
                try {
                    // Get current data
                    const {
                        inputs: existingInputs,
                        approvals: existingApprovals,
                        outputs: existingOutputs,
                        isAllApprovalsApproved,
                    } = await getSessionContext(SESSION_ID, TEAM_ID);
                    
                    console.clear();
                    console.log(displayInputTable(existingInputs, existingApprovals));
                    
                    // Calculate valuation if we have all required inputs
                    const missingFields = Input.FIELDS.filter(
                        (field) => !existingInputs.find((i) => i.fieldName === field)
                    );
                    
                    // Always show approval status
                    const isFinalApproved = isAllApprovalsApproved && 
                        existingOutputs.length > 0 && 
                        existingOutputs[0].isApproved;
                        
                    const statusText = isFinalApproved ? "OK" : "In TBD";
                    const statusColor = isFinalApproved ? chalk.green : chalk.yellow;
                    console.log(
                        chalk.blueBright(
                            `Final output status: ${statusColor(`[${statusText}]`)}\n`)
                    );
                    
                    if (missingFields.length === 0) {
                        // Calculate and display the valuation
                        const inputValues = Object.fromEntries(
                            existingInputs.map((input) => [input.fieldName, input.value])
                        );
                        const valuation = 
                            inputValues["EBITDA"] * 
                            inputValues["Multiple"] * 
                            inputValues["Factor Score"];
                        
                        console.log(
                            chalk.blueBright(
                                `Current Valuation: ${valuation.toLocaleString("en-US", {
                                    maximumFractionDigits: 2,
                                })} M$\n`)
                        );
                    } else {
                        console.log(
                            chalk.yellow(`Missing fields: ${missingFields.join(", ")}\n`)
                        );
                    }
                    
                    // Check if all approvals are true
                    if (isAllApprovalsApproved && existingOutputs.length > 0 && existingOutputs[0].isApproved) {
                        console.log(
                            chalk.green("\n => All fields have been approved and output is finalized.\n")
                        );
                    }

                    console.log(chalk.gray('(Auto-refreshing data every 1.5 seconds)'));
                    console.log(chalk.gray('Press "E" to modify approvals, "Q" to quit...'));

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
                                showApprovalMenu().then(() => {
                                    // Return to polling after editing
                                    isEditing = false;
                                });
                            } else if (key === 'q') {
                                // Quit application
                                console.clear();
                                console.log("\nThank you for reviewing the Financial Terms!\n");
                                clearInterval(polling);
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

        // Handle exit signals for cleanup
        process.on('SIGINT', async () => {
            console.log("\nExiting application...");
            clearInterval(polling);
            await closeDb();
            process.exit(0);
        });
        
    } catch (error) {
        console.error("Error:", error);
        await closeDb();
    }
};

main();
