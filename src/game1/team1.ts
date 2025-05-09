import inquirer from 'inquirer';
import chalk from 'chalk';
import { Input } from '../db/models/Input';
import { Approval } from '../db/models/Approval';
import { Output } from '../db/models/Output';
import { initDb, closeDb } from '../db';
import { sequelize } from '../db/sequelize';
import dotenv from 'dotenv';

dotenv.config();

const SESSION_ID = process.env.DEFAULT_SESSION_ID || 'default_session';
const pollingRefreshRateInMs = 1500;

const fields = ['EBITDA', 'Interest Rate', 'Multiple', 'Factor Score'];
const units = ['M$', '%', 'x', ''];
const TEAM_ID = 1;

const askInputs = async (teamId: number): Promise<Record<string, number>> => {
    const inputs: Record<string, number> = {};

    // Get current approval status
    const approvals = await Approval.findAll({
        where: {
            teamId: TEAM_ID,
            sessionId: SESSION_ID
        }
    });

    for (let index = 0; index < fields.length; index++) {
        const field = fields[index];
        const unit = units[index];
        const existing = await Input.findOne({
            where: {
                teamId,
                fieldName: field,
                sessionId: SESSION_ID
            },
            order: [['updatedAt', 'DESC']],
        });

        const approvalStatus = approvals.find(a => a.fieldName === field)?.status;
        const statusDisplay = approvalStatus ? chalk.green('OK') : chalk.yellow('TBD');
        const unitDisplay = unit ? `(${unit})` : '';

        const { value } = await inquirer.prompt([
            {
                type: 'input',
                name: 'value',
                message: `Enter value for ${field} ${unitDisplay} [${statusDisplay}]${existing ? ` (current: ${existing.value})` : ''}:`,
                default: existing?.value?.toString(),
                validate: (input) => {
                    if (input === '') return true;
                    return !isNaN(Number(input)) && Number(input) > 0 ? true : 'Must be a number greater than 0';
                },
            },
        ]);

        let finalValue = value === '' && existing ? existing.value : parseFloat(value);

        // If field is approved and value is changed, ask for confirmation after input
        if (approvalStatus && existing && finalValue !== existing.value) {
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `${field} is currently approved. Changing the value will reset approval to TBD. Continue?`,
                    default: false,
                },
            ]);
            if (!confirm) {
                console.log(chalk.blueBright(`\n => Keeping current value for ${field}.\n`));
                finalValue = existing.value;
            }
        }

        inputs[field] = finalValue;
    }

    return inputs;
};

const storeInputs = async (inputs: Record<string, number>, teamId: number) => {
    // transaction
    await sequelize.transaction(async (transaction) => {
        for (const field of Object.keys(inputs)) {
            // Get existing input to check if value changed
            const existing = await Input.findOne({
                where: {
                    teamId,
                    fieldName: field,
                    sessionId: SESSION_ID
                },
                transaction,
            });

            const shouldResetApproval = existing && inputs[field] !== existing.value;

            if (existing) {
                await Input.update({
                    value: inputs[field],
                }, {
                    where: { id: existing.id },
                    transaction,
                });

                if (shouldResetApproval) {
                    // Update the approval
                    await Approval.update({
                        status: false,
                    }, {
                        where: {
                            teamId,
                            fieldName: field,
                            sessionId: SESSION_ID
                        },
                        transaction,
                    });
                }
            } else {
                await Input.create({
                    teamId,
                    fieldName: field,
                    value: inputs[field],
                    sessionId: SESSION_ID
                }, {
                    transaction,
                });

                // Create the approval
                await Approval.create({
                    teamId,
                    fieldName: field,
                    status: false,
                    sessionId: SESSION_ID
                }, {
                    transaction,
                });
            }
        }
    });
};

const calculateValuation = (inputs: Record<string, number>) => {
    return inputs['EBITDA'] * inputs['Multiple'] * inputs['Factor Score'];
};

const pollApprovalStatus = async (
    fields: string[],
    teamId: number,
    exitWhenComplete = true
) => {
    return new Promise<boolean>((resolve) => {
        const interval = setInterval(async () => {
            try {
                // Get latest values from database for each field
                const latestInputs: Record<string, number> = {};
                for (const field of fields) {
                    const latest = await Input.findOne({
                        where: {
                            teamId,
                            fieldName: field,
                            sessionId: SESSION_ID
                        },
                        order: [['updatedAt', 'DESC']],
                        raw: true
                    });
                    if (latest) {
                        latestInputs[field] = latest.value;
                    }
                }

                const approvals = await Approval.findAll({
                    where: {
                        teamId: TEAM_ID,
                        sessionId: SESSION_ID
                    },
                    raw: true
                });

                let approvedCount = 0;
                console.clear();
                console.log('** Awaiting approvals from Team 2 (renew every 1.5s) **\n');

                // Calculate current valuation using the latest inputs from DB
                const currentValuation = calculateValuation(latestInputs);

                console.log(chalk.blueBright(`($$$) Current Valuation: ${currentValuation.toLocaleString('en-US')} M$ \n`));

                console.log(chalk.blueBright(`--------------------------------\n`));
                for (let index = 0; index < fields.length; index++) {
                    const field = fields[index];
                    const unit = units[index];
                    const match = approvals.find((a) => a.fieldName === field);
                    const status = match?.status;
                    const currentValue = latestInputs[field];
                    const unitDisplay = unit ? `(${unit})` : '';

                    if (status) {
                        approvedCount++;
                        console.log(chalk.green(`${field} ${unitDisplay}: ${currentValue} - OK`));
                    } else {
                        console.log(chalk.yellow(`${field} ${unitDisplay}: ${currentValue} - TBD...`));
                    }
                }
                console.log(chalk.blueBright(`--------------------------------\n`));

                const currentOutput = await Output.findOne({
                    where: {
                        inputTeamId: TEAM_ID,
                        sessionId: SESSION_ID
                    },
                    raw: true,
                });

                console.log(chalk.blueBright(`Current approval status: ${currentOutput?.isApproved ? '[APPROVED]' : '[In TBD]'}`));

                if (approvedCount === fields.length && exitWhenComplete && currentOutput?.isApproved) {
                    clearInterval(interval);
                    console.log(chalk.greenBright('\n => All fields approved. Final output is confirmed.\n'));

                    // Start countdown
                    let secondsLeft = 10;
                    const countdownInterval = setInterval(() => {
                        process.stdout.write('\x1b[?25l');
                        process.stdout.write('\x1b[2K');
                        process.stdout.write('\x1b[1A');
                        process.stdout.write('\x1b[2K');
                        process.stdout.write('\x1b[1A');
                        process.stdout.write('\x1b[2K');
                        console.log(chalk.blueBright(` => All fields approved. Final output is confirmed.`));
                        console.log(chalk.blueBright(` => Application will close in ${secondsLeft} seconds...`));
                        secondsLeft--;

                        if (secondsLeft < 0) {
                            process.stdout.write('\x1b[?25h');
                            clearInterval(countdownInterval);
                            process.exit(0);
                        }
                    }, 1000);

                    resolve(false);
                }

                console.log(chalk.gray('\nPress "E" to edit values, "ESC" to exit, or wait for Team 2 approval...\n'));

                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.once('data', (data) => {
                    const key = data.toString();
                    if (key === 'e' || key === 'E') {
                        console.clear();
                        clearInterval(interval);
                        process.stdin.setRawMode(false);
                        console.log(chalk.blueBright('\n => Returning to input mode...\n'));
                        resolve(true);
                    } else if (key === '\u001b') {
                        console.clear();
                        clearInterval(interval);
                        process.stdin.setRawMode(false);
                        console.log(chalk.blueBright('\n => Exiting application...\n'));
                        closeDb();
                        process.exit(0);
                    }
                });
            } catch (error) {
                console.error('Error in polling:', error);
                clearInterval(interval);
                closeDb().then(() => process.exit(1));
            }
        }, pollingRefreshRateInMs);
    });
};

const main = async () => {
    try {
        await initDb();
        console.log('\n** TEAM 1 CLI – Enter Your Financial Terms **\n');
        console.log(chalk.blueBright(`Session ID: ${SESSION_ID}\n`));

        while (true) {
            const inputs = await askInputs(TEAM_ID);
            await storeInputs(inputs, TEAM_ID);

            const valuation = calculateValuation(inputs);
            console.log(`\n($$$) Valuation: ${valuation.toLocaleString('en-US')} M$`);

            const needToEdit = await pollApprovalStatus(Object.keys(inputs), TEAM_ID);
            if (!needToEdit) {
                const { again } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'again',
                    message: 'Start new simulation?',
                });
                if (!again) break;
            }
        }

        console.log('\n => Team 1 finished input. Waiting for Team 2 approval...\n');
    } catch (error) {
        console.error('Error in Team 1:', error);
    } finally {
        await closeDb();
    }
};

main(); 