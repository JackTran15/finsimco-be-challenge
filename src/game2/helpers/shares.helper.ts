import { SharesBid } from '../db';
import { Transaction } from 'sequelize';

export type SharesBidData = {
  investorName: string;
  companyName: string;
  bids: number;
};

export const upsertSharesBid = async (
  sessionId: string,
  data: SharesBidData,
  transaction?: Transaction
): Promise<SharesBid> => {
  const [bid] = await SharesBid.findOrCreate({
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

  if (bid) {
    await bid.update(data, { transaction });
  }

  return bid;
};

export const getInvestorBids = async (
  sessionId: string,
  investorName: string,
  transaction?: Transaction
): Promise<SharesBid[]> => {
  return SharesBid.findAll({
    where: { sessionId, investorName },
    order: [['companyName', 'ASC']],
    transaction
  });
};

export const getCompanyBids = async (
  sessionId: string,
  companyName: string,
  transaction?: Transaction
): Promise<SharesBid[]> => {
  return SharesBid.findAll({
    where: { sessionId, companyName },
    order: [['investorName', 'ASC']],
    transaction
  });
};

export const getAllBids = async (
  sessionId: string,
  transaction?: Transaction
): Promise<SharesBid[]> => {
  return SharesBid.findAll({
    where: { sessionId },
    order: [
      ['companyName', 'ASC'],
      ['investorName', 'ASC']
    ],
    transaction
  });
}; 