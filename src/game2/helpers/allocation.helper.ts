import { InvestorAllocation } from '../db/models/InvestorAllocation';
import { Transaction } from 'sequelize';

export type InvestorAllocationData = {
  investorName: string;
  companyName: string;
  bidAmount: number;
  allocatedAmount: number;
  allocationRatio: number;
};

export const upsertInvestorAllocation = async (
  sessionId: string,
  data: InvestorAllocationData,
  transaction?: Transaction
): Promise<InvestorAllocation> => {
  const [allocation] = await InvestorAllocation.findOrCreate({
    where: { 
      sessionId, 
      investorName: data.investorName,
      companyName: data.companyName
    },
    defaults: {
      sessionId,
      ...data
    },
    transaction
  });

  if (allocation) {
    await allocation.update(data, { transaction });
  }

  return allocation;
};

export const getInvestorAllocations = async (
  sessionId: string,
  investorName: string,
  transaction?: Transaction
): Promise<InvestorAllocation[]> => {
  return InvestorAllocation.findAll({
    where: { sessionId, investorName },
    order: [['companyName', 'ASC']],
    transaction
  });
};

export const getCompanyAllocations = async (
  sessionId: string,
  companyName: string,
  transaction?: Transaction
): Promise<InvestorAllocation[]> => {
  return InvestorAllocation.findAll({
    where: { sessionId, companyName },
    order: [['investorName', 'ASC']],
    transaction
  });
};

export const getAllAllocations = async (
  sessionId: string,
  transaction?: Transaction
): Promise<InvestorAllocation[]> => {
  return InvestorAllocation.findAll({
    where: { sessionId },
    order: [
      ['companyName', 'ASC'],
      ['investorName', 'ASC']
    ],
    transaction
  });
}; 