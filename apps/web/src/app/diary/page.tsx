import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

export default function DiaryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto">
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">감정 일기</h1>
          <p className="text-muted-foreground leading-relaxed">
            감정 기록과 통계는 아직 제공하지 않습니다.
          </p>
        </div>

        <Card className="p-6 space-y-2">
          <h2 className="text-lg font-semibold">감정 기록</h2>
          <p className="text-muted-foreground">저장된 감정 기록이 없습니다.</p>
        </Card>

        <Card className="p-6 space-y-2">
          <h2 className="text-lg font-semibold">감정 통계</h2>
          <p className="text-muted-foreground">분석할 감정 기록이 없습니다.</p>
        </Card>
      </main>
    </div>
  );
}
