"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";

// 입력값을 유지한 채 계정과 신체 정보 질문을 순서대로 보여줍니다.
export function RegisterConversation({ account, body }: { account: ReactNode; body: ReactNode }) {
  const [step, setStep] = useState(0);
  const accountSection = useRef<HTMLDivElement>(null);

  function next() {
    // 다음 질문으로 넘어가기 전에 현재 단계의 필수 입력을 확인합니다.
    const inputs = accountSection.current?.querySelectorAll<HTMLInputElement>("input") ?? [];
    for (const input of inputs) {
      if (!input.reportValidity()) return;
    }
    setStep(1);
  }

  return (
    <div className="conversation-layout">
      <aside className="trainer-panel" aria-label="트레이너 안내">
        {/* 홈에서 반겨주는 곰 트레이너가 가입 질문을 이어갑니다. */}
        <div className="trainer-scene">
          <Image src="/coach-world.webp" alt="" width={700} height={840} className="trainer-character" />
        </div>
        <p className="trainer-name">곰 코치</p>
        <div className="trainer-message" role="status" aria-live="polite" key={step}>
          {step === 0 ? "반가워요! 먼저 어떻게 불러드리면 될까요? 계정 정보부터 알려주세요." : "좋아요! 이제 몸 상태와 목표를 알려주시면 하루 목표를 계산해 드릴게요."}
        </div>
        <p className="trainer-progress">{step + 1} / 2 단계</p>
      </aside>
      <div className="conversation-fields">
        <div ref={accountSection} hidden={step !== 0}>{account}</div>
        <div hidden={step !== 1}>{body}</div>
        <div className="conversation-actions">
          {step === 0 ? <button type="button" className="primary-button" onClick={next}>다음 질문</button> : <button type="button" className="secondary-button" onClick={() => setStep(0)}>이전 질문</button>}
        </div>
      </div>
    </div>
  );
}
