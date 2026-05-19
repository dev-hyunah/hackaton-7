import { useState } from "react";
import { competitorPrices, buildDashboardFlights, KE_DOMESTIC_ROUTES } from "../data/mockData";
import { TrendingUp, TrendingDown, Minus, Eye, Calendar } from "lucide-react";

const MY_AIRLINE = "대한항공";
const CLASSES = ["C", "Y", "M", "V"] as const;
const CLASS_LABELS: Record<string, string> = {
  C: "프레스티지",
  Y: "일반석 정상",
  M: "일반석 할인",
  V: "일반석 특가",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// 경쟁사 클래스 매핑 (F→C, C→C, Y→Y, V→V 등 기존 mock 데이터 호환)
function mapCompClass(bookingClass: string): string {
  if (bookingClass === "F") return "C";
  return bookingClass;
}

export default function CompetitorMonitor({ refreshKey }: { refreshKey?: number }) {
  const [selectedRoute, setSelectedRoute] = useState(KE_DOMESTIC_ROUTES[0]);
  const [lastUpdated, setLastUpdated] = useState(todayStr());

  // App 헤더 새로고침 버튼 클릭 시 경쟁사 데이터도 갱신
  const [prevKey, setPrevKey] = useState(refreshKey);
  if (refreshKey !== prevKey) {
    setPrevKey(refreshKey);
    setLastUpdated(new Date().toISOString().slice(0, 16).replace("T", " "));
  }

  // 대한항공 운임
  const myFares: Record<string, number> = {};
  const myFlights = buildDashboardFlights(selectedRoute);
  if (myFlights.length > 0) {
    myFlights[0].classes.forEach((cls) => {
      myFares[cls.code] = cls.price;
    });
  }

  // 경쟁사 목록 (F→C 매핑 후)
  const rawCompetitors = [...new Set(
    competitorPrices
      .filter((c) => c.route === selectedRoute)
      .map((c) => c.airline)
  )];

  const getCompFare = (airline: string, cls: string): number | undefined => {
    const entry = competitorPrices.find(
      (c) => c.route === selectedRoute && c.airline === airline &&
        (c.bookingClass === cls || mapCompClass(c.bookingClass) === cls)
    );
    return entry?.fare;
  };

  const allAirlines = [MY_AIRLINE, ...rawCompetitors];

  return (
    <div className="space-y-5" data-testid="competitor-monitor-page">

      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye size={20} className="text-indigo-500" />
          <h2 className="text-xl font-bold text-gray-800">경쟁사 가격 모니터링</h2>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">AI Mock Data</span>
        </div>
        {/* 당일 날짜 표시 */}
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 text-xs font-bold text-blue-700">
          <Calendar size={12} />
          당일 {lastUpdated} 기준
        </div>
      </div>

      {/* 노선 선택 */}
      <div className="flex flex-wrap gap-2">
        {KE_DOMESTIC_ROUTES.map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRoute(r)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              selectedRoute === r
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* 비교 테이블 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">항공사</th>
                {CLASSES.map((cls) => (
                  <th key={cls} className="text-right px-4 py-3 font-semibold text-gray-600">
                    {CLASS_LABELS[cls]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allAirlines.map((airline, idx) => {
                const isUs = airline === MY_AIRLINE;
                return (
                  <tr key={airline} className={`border-b border-gray-50 ${isUs ? "bg-blue-50/60" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isUs ? "bg-blue-500" : idx === 1 ? "bg-orange-400" : "bg-teal-400"}`} />
                        <span className={`font-medium ${isUs ? "text-blue-700 font-bold" : "text-gray-700"}`}>
                          {airline}
                          {isUs && <span className="ml-1.5 text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full">나</span>}
                        </span>
                      </div>
                    </td>
                    {CLASSES.map((cls) => {
                      const myFare = myFares[cls];
                      const fare = isUs ? myFare : getCompFare(airline, cls);
                      if (!fare) return <td key={cls} className="px-4 py-3 text-right text-gray-300">-</td>;
                      const diff = isUs ? null : fare - myFare;
                      const pct = diff !== null && myFare ? Math.round((diff / myFare) * 100) : null;
                      return (
                        <td key={cls} className="px-4 py-3 text-right">
                          <div className="font-mono font-semibold text-gray-800">{fare.toLocaleString()}원</div>
                          {pct !== null && (
                            <div className={`flex items-center justify-end gap-0.5 text-xs mt-0.5 ${
                              pct > 0 ? "text-red-500" : pct < 0 ? "text-blue-500" : "text-gray-400"
                            }`}>
                              {pct > 0 ? <TrendingUp size={11} /> : pct < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                              {pct > 0 ? `+${pct}%` : pct < 0 ? `${pct}%` : "동일"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          ↑↓ 표시는 대한항공 대비 경쟁사 가격 차이입니다.
        </div>
      </div>

      {/* 클래스별 카드 비교 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CLASSES.map((cls) => {
          const myFare = myFares[cls];
          const compFares = rawCompetitors.map((a) => ({
            airline: a,
            fare: getCompFare(a, cls),
          })).filter((c) => c.fare !== undefined) as { airline: string; fare: number }[];

          const allFares = [{ airline: MY_AIRLINE, fare: myFare }, ...compFares]
            .filter((x) => x.fare > 0)
            .sort((a, b) => a.fare - b.fare);
          const isLowest = allFares[0]?.airline === MY_AIRLINE;

          return (
            <div key={cls} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-700">
                  {CLASS_LABELS[cls]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isLowest ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                  {isLowest ? "최저가" : "최저가 아님"}
                </span>
              </div>
              {allFares.map((item) => {
                const isUs = item.airline === MY_AIRLINE;
                const barWidth = Math.round((item.fare / allFares[allFares.length - 1].fare) * 100);
                return (
                  <div key={item.airline} className="mb-2">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className={isUs ? "text-blue-600 font-bold" : "text-gray-500"}>{item.airline}</span>
                      <span className={`font-mono font-semibold ${isUs ? "text-blue-700" : "text-gray-700"}`}>
                        {item.fare.toLocaleString()}원
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isUs ? "bg-blue-500" : "bg-gray-300"}`} style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
