import { SubmitButton } from "@/components/SubmitButton";
import { applyMealSetAction, deleteMealSetAction, saveMealSetAction } from "@/lib/mealSetActions";
import { foodUnits, mealTypes } from "@/lib/mealNutrition";
import type { MealSetScope, SavedMealSet } from "@/lib/mealSets";

// 저장 폼은 세트 이름만 받고 음식 구성은 서버가 해당 날짜의 기록에서 가져옵니다.
export function SaveMealSetForm({ date, scope }: { date: string; scope: MealSetScope }) {
  const label = scope === "day" ? "하루 전체" : mealTypes[scope];
  const id = `set-name-${scope}`;
  return (
    <details className="meal-set-save">
      <summary>{label} 세트로 저장</summary>
      <form action={saveMealSetAction} className="meal-set-save-form">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="scope" value={scope} />
        <div className="field-group"><label htmlFor={id}>세트 이름</label><input id={id} name="name" maxLength={60} defaultValue={`${date} ${label}`} required /></div>
        <SubmitButton label="세트 저장" variant="secondary" />
      </form>
    </details>
  );
}

// 기존 기록에 더하는 동작과 세트만 삭제하는 동작을 별도 폼으로 분리합니다.
export function MealSets({ sets, date }: { sets: SavedMealSet[]; date: string }) {
  return (
    <section className="saved-meal-sets" aria-labelledby="saved-meal-sets-heading">
      <div className="section-heading"><h2 id="saved-meal-sets-heading">저장한 식사 세트</h2><span>{sets.length}개</span></div>
      <p className="field-hint">세트를 적용하면 {date} 기록에 추가됩니다. 하루 세트는 끼니 구분을 유지합니다.</p>
      {sets.length ? <ul className="meal-set-list">{sets.map((set) => (
        <li key={set.id}>
          <details><summary><strong>{set.name}</strong><span>{set.scope === "day" ? "하루 전체" : "한 끼"} · 음식 {set.items.length}개</span></summary>
            <ul className="meal-set-items">{set.items.map((item, index) => <li key={index}><span>{mealTypes[item.mealType]} · {item.name}</span><span>{item.amount.toLocaleString("ko-KR")} {foodUnits[item.unit]}</span></li>)}</ul>
          </details>
          <div className="meal-set-actions">
            <form action={applyMealSetAction} className="meal-set-apply-form">
              <input type="hidden" name="setId" value={set.id} /><input type="hidden" name="date" value={date} />
              {set.scope !== "day" ? <div className="field-group"><label htmlFor={`set-meal-${set.id}`}>추가할 끼니</label><select id={`set-meal-${set.id}`} name="mealType" defaultValue={set.items[0].mealType}>{Object.entries(mealTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div> : null}
              <SubmitButton label="선택 날짜에 추가" />
            </form>
            <form action={deleteMealSetAction}><input type="hidden" name="setId" value={set.id} /><input type="hidden" name="date" value={date} /><SubmitButton label="세트 삭제" variant="secondary" /></form>
          </div>
        </li>
      ))}</ul> : <p className="empty-message">저장한 세트가 없습니다. 날짜를 조회한 뒤 한 끼 또는 하루 기록을 세트로 저장해보세요.</p>}
      <p className="form-note">세트당 음식 30개, 사용자당 세트 50개까지 저장합니다. 세트를 삭제해도 식단 기록은 유지됩니다.</p>
    </section>
  );
}
