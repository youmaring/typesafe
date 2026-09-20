import "dotenv/config";

import {
  AuthenticationError,
  RateLimitError,
  TypeSafeClient,
  TypeSafeError,
  UnprocessableEntityError,
} from "@typesafe-ai/sdk";

import { decideTriage } from "./decision.js";
import { triageQuestions } from "./questions.js";

const SAMPLE_TICKET =
  "I've been trying to connect Stripe for three days and it keeps failing. I'm losing sales. Please help ASAP.";

async function main(): Promise<void> {
  const message = process.argv.slice(2).join(" ").trim() || SAMPLE_TICKET;

  // 서버 환경에서만 사용하세요. 브라우저 번들에 API 키를 넣으면 안 됩니다.
  const client = new TypeSafeClient({
    timeout: 10_000,
    retry: { maxRetries: 2 },
  });

  const result = await client.systemOne({
    state: {
      ticket: {
        message,
      },
    },
    questions: triageQuestions,
    // 생략 시 SDK 기본값인 jev-latest를 사용합니다.
  });

  const decision = decideTriage(result.answers);

  console.log(
    JSON.stringify(
      {
        input: message,
        model: result.model,
        usage: result.usage,
        answers: result.answers,
        decision,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  if (error instanceof AuthenticationError) {
    console.error("API 키가 없거나 유효하지 않습니다. TYPESAFE_API_KEY를 확인하세요.");
  } else if (error instanceof UnprocessableEntityError) {
    console.error("요청 스키마가 유효하지 않습니다.", error.message);
  } else if (error instanceof RateLimitError) {
    console.error("요청 한도를 초과했습니다. SDK 재시도 후에도 실패했습니다.");
  } else if (error instanceof TypeSafeError) {
    console.error("TypeSafe SDK 오류:", error.message);
  } else {
    console.error("예상하지 못한 오류:", error);
  }

  process.exitCode = 1;
});
