import { getActiveProject } from '@/lib/activeProject';
import Link from 'next/link';
import { HardHat, ShieldCheck, CheckCircle2, AlertCircle, Clock, Plus, ChevronRight, Building2 } from 'lucide-react';
import DeletePileButton from '@/components/piles/DeletePileButton';
import PileNumberMatrix from '@/components/piles/PileNumberMatrix';
import { calculateAverageBlows } from '@/lib/calculations/drivingLog';

export const dynamic = 'force-dynamic';

export default async function PilesListPage() {
  const project = await getActiveProject({
    criteria: true,
    piles: {
      include: {
        criteria: true,
        drivingRecord: true,
        qcInspection: true,
      },
      orderBy: {
        pileNo: 'asc',
      },
    },
  });

  const piles = project?.piles || [];

  return (
    <main className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>โครงการ: {project ? `${project.code} - ${project.name}` : 'กำลังโหลด...'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800">
            ผังสถานะและรายการเสาเข็มในโครงการ (Piles Register)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ระบุจำนวนเสาเข็มทั้งหมด, ตรวจสอบสถานะสีรายต้น, บันทึกการตอก และตรวจสอบ Last 10 Blows
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/calculator"
            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg transition"
          >
            คำนวณสูตร Hiley
          </Link>
        </div>
      </div>

      {/* Interactive Number Matrix Grid */}
      <PileNumberMatrix initialPiles={piles} projectId={project?.id} />

      {/* Detailed Piles Table Section Header */}
      <div className="pt-2">
        <h2 className="text-lg font-black text-slate-800">
          ตารางรายละเอียดข้อมูลเสาเข็ม (Detailed Pile Records)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          แสดงข้อมูลวิศวกรรมเชิงลึก, ระยะ Set ที่วัดได้, และการจัดการข้อมูลรายต้น
        </p>
      </div>

      {/* Piles Table / Card List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3.5 font-bold">รหัสเสาเข็ม (Pile No.)</th>
                <th className="p-3.5 font-bold">Grid Line</th>
                <th className="p-3.5 font-bold">ประเภทเสาเข็ม</th>
                <th className="p-3.5 font-bold text-center">ความลึก (Depth)</th>
                <th className="p-3.5 font-bold text-center">อัตรา Blows (ft / m)</th>
                <th className="p-3.5 font-bold text-center">สถานะการตอก</th>
                <th className="p-3.5 font-bold text-center">Last 10 Blows</th>
                <th className="p-3.5 font-bold text-center">QA/QC As-Built</th>
                <th className="p-3.5 font-bold text-right">ดำเนินการ (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {piles.map((pile) => {
                const isDriven = pile.drivingRecord !== null;
                const isSetPassed = pile.drivingRecord?.isSetPassed;
                const qcStatus = pile.qcInspection?.deviationStatus;
                const drivenM = pile.drivingRecord?.drivenLengthM;
                const drivenFt = drivenM ? (drivenM * 3.28084).toFixed(1) : null;
                const recordUnit = pile.drivingRecord?.recordUnit?.toUpperCase() === 'METER' ? 'METER' : 'FEET';
                
                // Calculate average blows using unit-aware helper
                const { avgBlowsFt, avgBlowsM } = calculateAverageBlows(
                  pile.drivingRecord?.penetrationBlows,
                  pile.drivingRecord?.recordUnit
                );

                return (
                  <tr key={pile.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold font-mono text-slate-900">
                      {pile.pileNo}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">
                      {pile.gridLine}
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800">
                          {pile.criteria?.name || pile.criteria?.pileType || 'I-Section 0.26m'}
                        </span>
                        {pile.criteria ? (
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] text-amber-800 font-mono bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-medium">
                              Ra: {pile.criteria.safeWorkingLoadT}t | S₁₀ &le; {pile.criteria.targetSet10BlowsCm} cm
                            </span>
                            <Link
                              href={`/calculator?criteriaId=${pile.criteria.id}`}
                              className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center font-semibold"
                              title="เปิดรายการคำนวณ Hiley ของสเปกนี้"
                            >
                              [สูตร Hiley]
                            </Link>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">ยังไม่กำหนดสเปก</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {drivenM ? (
                        <div>
                          {recordUnit === 'FEET' && drivenFt ? (
                            <>
                              <span className="font-bold text-slate-800">{drivenFt} ft</span>
                              <span className="text-[10px] text-slate-400 block font-normal">({drivenM} m)</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-slate-800">{drivenM} m</span>
                              <span className="text-[10px] text-slate-400 block font-normal">({drivenFt} ft)</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {(avgBlowsFt !== null && avgBlowsFt > 0) || (avgBlowsM !== null && avgBlowsM > 0) ? (
                        <div className="text-[11px]">
                          {recordUnit === 'FEET' ? (
                            <>
                              <span className="font-bold text-amber-700">{avgBlowsFt} blw/ft</span>
                              <span className="text-[10px] text-slate-500 block font-semibold">(≈ {avgBlowsM} blw/m)</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-amber-700">{avgBlowsM} blw/m</span>
                              <span className="text-[10px] text-slate-500 block font-semibold">(≈ {avgBlowsFt} blw/ft)</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {!isDriven ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3" /> รอการตอก
                        </span>
                      ) : isSetPassed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> ตอกเสร็จ (Set ผ่าน)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" /> Set ไม่ได้ (Re-drive)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {pile.drivingRecord ? (
                        <span className="font-bold text-slate-800">
                          {pile.drivingRecord.measuredLast10Cm} cm
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {pile.qcInspection ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            qcStatus === 'NORMAL'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : qcStatus === 'WARNING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {qcStatus === 'NORMAL'
                            ? `Pass (${pile.qcInspection.netDeviationCm}cm)`
                            : qcStatus === 'WARNING'
                            ? `Warning (${pile.qcInspection.netDeviationCm}cm)`
                            : `Critical (${pile.qcInspection.netDeviationCm}cm)`}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">ยังไม่ตรวจ</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/piles/${pile.id}/drive`}
                        className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1.5 rounded-md text-[11px] font-bold shadow-xs"
                      >
                        <HardHat className="w-3 h-3" />
                        <span>{isDriven ? 'แก้ไขตอก' : 'บันทึกตอก'}</span>
                      </Link>
                      <Link
                        href={`/piles/${pile.id}/qc`}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-md text-[11px] font-bold"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>ตรวจ QC</span>
                      </Link>
                      <DeletePileButton pileId={pile.id} pileNo={pile.pileNo} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
