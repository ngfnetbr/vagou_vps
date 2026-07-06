// @ts-nocheck
import { describe, expect, it } from "vitest";
import { chunkArray } from "./queryUtils";
import { pickLatestSondagemIds } from "./sondagemAnalytics";

describe("pickLatestSondagemIds", () => {
  it("mantém apenas a sondagem mais recente de cada criança", () => {
    const latestIds = pickLatestSondagemIds([
      { id: "old-a", crianca_id: "a", created_at: "2026-01-10T10:00:00.000Z" },
      { id: "new-a", crianca_id: "a", created_at: "2026-03-10T10:00:00.000Z" },
      { id: "only-b", crianca_id: "b", created_at: "2026-02-10T10:00:00.000Z" },
    ]);

    expect([...latestIds]).toEqual(["new-a", "only-b"]);
  });
});

describe("chunkArray", () => {
  it("divide listas grandes em lotes sem perder itens", () => {
    const chunks = chunkArray(["a", "b", "c", "d", "e"], 2);

    expect(chunks).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });
});
