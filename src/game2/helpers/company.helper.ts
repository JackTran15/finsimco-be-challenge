import { CompanyPricing } from '../db';
import { Transaction } from 'sequelize';

export type CompanyPricingData = {
  companyName: string;
  price: number;
  shares: number;
};

export const upsertCompanyPricing = async (
  sessionId: string,
  data: CompanyPricingData,
  transaction?: Transaction
): Promise<CompanyPricing> => {
  const [company] = await CompanyPricing.findOrCreate({
    where: { sessionId, companyName: data.companyName },
    defaults: {
      sessionId,
      ...data
    },
    transaction
  });

  if (company) {
    await company.update(data, { transaction });
  }

  return company;
};

export const getCompanyPricing = async (
  sessionId: string,
  companyName: string,
  transaction?: Transaction
): Promise<CompanyPricing | null> => {
  return CompanyPricing.findOne({
    where: { sessionId, companyName },
    transaction
  });
};

export const getAllCompanyPricing = async (
  sessionId: string,
  transaction?: Transaction
): Promise<CompanyPricing[]> => {
  return CompanyPricing.findAll({
    where: { sessionId },
    order: [['companyName', 'ASC']],
    transaction
  });
}; 