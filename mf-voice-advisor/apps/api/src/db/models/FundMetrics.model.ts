import mongoose, { Schema, Document } from 'mongoose';

export interface IFundMetrics extends Document {
  schemeCode: string;
  schemeName: string;
  category: string;
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  expenseRatio: number;
  lastUpdated: Date;
}

const FundMetricsSchema: Schema = new Schema({
  schemeCode: { type: String, required: true, unique: true },
  schemeName: { type: String, required: true },
  category: { type: String, required: true },
  cagr: { type: Number, required: true },
  volatility: { type: Number, required: true },
  sharpeRatio: { type: Number, required: true },
  maxDrawdown: { type: Number, required: true },
  expenseRatio: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

export const FundMetrics = mongoose.model<IFundMetrics>('FundMetrics', FundMetricsSchema);
