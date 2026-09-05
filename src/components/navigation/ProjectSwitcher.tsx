'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Plus, Check, X, Sparkles, Layers } from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  clientName?: string | null;
  consultantName?: string | null;
  contractorName?: string | null;
  _count?: {
    piles: number;
  };
}

export default function ProjectSwitcher() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Project Form State
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newContractor, setNewContractor] = useState('บริษัท เสาเข็มไทยแลนด์ จำกัด');
  const [newConsultant, setNewConsultant] = useState('Piling Tech Advisory Ltd.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('active_project_id') : null;
          const found = data.find((p: ProjectItem) => p.id === savedId);
          setSelectedProjectId(found ? found.id : data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handleSelectProject = (proj: ProjectItem) => {
    setSelectedProjectId(proj.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_project_id', proj.id);
    }
    setIsOpen(false);
    router.refresh();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      alert('กรุณากรอกชื่อโครงการ/อาคาร และรหัสโครงการ');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          code: newCode.trim(),
          location: newLocation.trim(),
          consultantName: newConsultant.trim(),
          contractorName: newContractor.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      setShowCreateModal(false);
      setNewName('');
      setNewCode('');
      setNewLocation('');
      await fetchProjects();
      if (data.project?.id) {
        handleSelectProject(data.project);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700 transition cursor-pointer text-left"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <div className="max-w-[150px] sm:max-w-[200px] truncate">
            <span className="text-xs font-semibold text-slate-200 block truncate">
              {activeProject ? `${activeProject.code} : ${activeProject.name}` : 'กำลังโหลด...'}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                สลับโครงการ / อาคาร
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {projects.length} โครงการ
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 p-1">
              {projects.map((proj) => {
                const isCurrent = proj.id === activeProject?.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => handleSelectProject(proj)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-start justify-between gap-2 transition cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/10 text-white'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs font-mono text-amber-400">
                          {proj.code}
                        </span>
                        {isCurrent && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="text-xs font-semibold truncate text-slate-200 mt-0.5">
                        {proj.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>เสาเข็ม: {proj._count?.piles ?? 0} ต้น</span>
                        {proj.location && <span>• {proj.location}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action to create new project */}
            <div className="p-2 border-t border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setNewCode(`PROJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(2, '0')}`);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ สร้างโครงการ / อาคารใหม่</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create New Project / Building Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 text-slate-900">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-amber-500 p-1.5 rounded-lg text-slate-950">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black">สร้างโครงการ / อาคารใหม่</h3>
                  <span className="text-[10px] text-amber-400 font-semibold block">
                    NEW PROJECT & BUILDING REGISTER
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโครงการ / อาคาร (Project & Building Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Grand Horizon Tower - อาคาร B"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสโครงการ (Project Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น GHT-BLDG-B, BLD-2026"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สถานที่ก่อสร้าง (Location)
                </label>
                <input
                  type="text"
                  placeholder="เช่น พระราม 9 ห้วยขวาง กรุงเทพฯ"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    บริษัทที่ปรึกษา (Consultant)
                  </label>
                  <input
                    type="text"
                    value={newConsultant}
                    onChange={(e) => setNewConsultant(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ผู้รับเหมาตอก (Contractor)
                  </label>
                  <input
                    type="text"
                    value={newContractor}
                    onChange={(e) => setNewContractor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                ℹ️ ระบบจะกำหนดค่าเกณฑ์ทดสอบเริ่มต้น (Hiley Safe Load 30T & 45T, Safety Factor 2.5) ให้อัตโนมัติ สามารถปรับแต่งสูตรหรือเพิ่มเสาเข็มได้ทันทีหลังสร้าง
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'กำลังสร้าง...' : 'สร้างโครงการทันที'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
