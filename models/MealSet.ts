import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// 세트에는 사용자가 선택한 식사의 입력값만 보관하고 API 검색 결과 전체는 저장하지 않습니다.
const nutrientsSchema = new Schema({
  calories: { type: Number, required: true, min: 0, max: 100000, validate: Number.isFinite },
  carbs: { type: Number, required: true, min: 0, max: 100000, validate: Number.isFinite },
  protein: { type: Number, required: true, min: 0, max: 100000, validate: Number.isFinite },
  fat: { type: Number, required: true, min: 0, max: 100000, validate: Number.isFinite },
}, { _id: false });

const itemSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  baseAmount: { type: Number, required: true, max: 5000, validate: (value: number) => Number.isFinite(value) && value > 0 },
  unit: { type: String, required: true, enum: ["g", "ml", "piece", "serving"] },
  nutrients: { type: nutrientsSchema, required: true },
  amount: { type: Number, required: true, max: 5000, validate: (value: number) => Number.isFinite(value) && value > 0 },
  mealType: { type: String, required: true, enum: ["breakfast", "lunch", "dinner", "snack"] },
}, { _id: false });

const mealSetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  scope: { type: String, required: true, enum: ["day", "breakfast", "lunch", "dinner", "snack"] },
  items: { type: [itemSchema], required: true, validate: (items: unknown[]) => items.length >= 1 && items.length <= 30 },
}, { timestamps: { createdAt: true, updatedAt: false } });

// 같은 사용자의 세트 이름 중복을 막고, 사용자별 목록을 빠르게 조회합니다.
mealSetSchema.index({ userId: 1, name: 1 }, { unique: true });
mealSetSchema.index({ userId: 1, createdAt: -1 });
type MealSetDocument = InferSchemaType<typeof mealSetSchema>;
export const MealSet: Model<MealSetDocument> = (models.MealSet as Model<MealSetDocument> | undefined) ?? model<MealSetDocument>("MealSet", mealSetSchema);
