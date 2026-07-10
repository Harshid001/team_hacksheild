import mongoose, { Schema, Document } from 'mongoose';

export interface IFinancialProfile extends Document {
  userId: mongoose.Types.ObjectId;
  ageGroup?: string;
  timeHorizon?: string;
  monthlyInvestment?: string;
  targetGoal?: string;
  riskTolerance?: string;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    ageGroup: { type: String },
    timeHorizon: { type: String },
    monthlyInvestment: { type: String },
    targetGoal: { type: String },
    riskTolerance: { type: String },
    isComplete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to determine if profile is complete
FinancialProfileSchema.pre<IFinancialProfile>('save', function (next) {
  if (this.ageGroup && this.timeHorizon && this.monthlyInvestment && this.riskTolerance) {
    this.isComplete = true;
  } else {
    this.isComplete = false;
  }
  next();
});

export const FinancialProfile = mongoose.model<IFinancialProfile>('FinancialProfile', FinancialProfileSchema);
