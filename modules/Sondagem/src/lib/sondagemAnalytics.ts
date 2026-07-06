// @ts-nocheck
export interface LatestSondagemCandidate {
  id: string;
  crianca_id: string;
  created_at: string | null;
}

export function pickLatestSondagemIds(
  sondagens: LatestSondagemCandidate[],
): Set<string> {
  const ordered = [...sondagens].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });

  const latestPerStudent = new Map<string, string>();
  for (const sondagem of ordered) {
    if (!latestPerStudent.has(sondagem.crianca_id)) {
      latestPerStudent.set(sondagem.crianca_id, sondagem.id);
    }
  }

  return new Set(latestPerStudent.values());
}
