'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Plus, Check, X, Sparkles, Layers, Trash2, AlertTriangle, Edit3, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

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
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Edit Project State
  const [projectToEdit, setProjectToEdit] = useState<ProjectItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editConsultant, setEditConsultant] = useState('');
  const [editContractor, setEditContractor] = useState('');
  const [editInlineError, setEditInlineError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Project State
  const [projectToDelete, setProjectToDelete] = useState<ProjectItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Project Form State
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newContractor, setNewContractor] = useState('บริษัท เสาเข็มไทยแลนด์ จำกัด');
  const [newConsultant, setNewConsultant] = useState('Piling Tech Advisory Ltd.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setProjectCookie = (id: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = `active_project_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('active_project_id') : null;
          const found = data.find((p: ProjectItem) => p.id === savedId);
          const chosenId = found ? found.id : data[0].id;
          setSelectedProjectId(chosenId);
          setProjectCookie(chosenId);
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
      setProjectCookie(proj.id);
    }
    setIsOpen(false);
    router.refresh();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      toast.warning('กรุณากรอกชื่อโครงการ/อาคาร และรหัสโครงการ');
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

      toast.success(`สร้างโครงการ "${newName.trim()}" สำเร็จ`);
      setShowCreateModal(false);
      setNewName('');
      setNewCode('');
      setNewLocation('');
      await fetchProjects();
      if (data.project?.id) {
        handleSelectProject(data.project);
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการสร้างโครงการ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (proj: ProjectItem) => {
    setProjectToEdit(proj);
    setEditName(proj.name || '');
    setEditCode(proj.code || '');
    setEditLocation(proj.location || '');
    setEditClient(proj.clientName || '');
    setEditConsultant(proj.consultantName || '');
    setEditContractor(proj.contractorName || '');
    setEditInlineError(null);
    setShowEditModal(true);
    setIsOpen(false);
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;
    if (!editName.trim() || !editCode.trim()) {
      setEditInlineError('กรุณากรอกชื่อโครงการ และรหัสโครงการ');
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditInlineError(null);
      const res = await fetch(`/api/projects/${projectToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          code: editCode.trim(),
          location: editLocation.trim(),
          clientName: editClient.trim(),
          consultantName: editConsultant.trim(),
          contractorName: editContractor.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update project');
      }

      toast.success(`บันทึกข้อมูลโครงการ "${editName.trim()}" สำเร็จ`);
      setShowEditModal(false);
      setProjectToEdit(null);
      await fetchProjects();
      router.refresh();
    } catch (err: any) {
      setEditInlineError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโครงการ');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ลบโครงการไม่สำเร็จ');
      }

      toast.success(`ลบโครงการ "${projectToDelete.name}" สำเร็จ`);
      setShowDeleteModal(false);

      // If deleted project was the currently selected one, switch to another project
      if (selectedProjectId === projectToDelete.id) {
        const remaining = projects.filter((p) => p.id !== projectToDelete.id);
        if (remaining.length > 0) {
          setSelectedProjectId(remaining[0].id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('active_project_id', remaining[0].id);
            setProjectCookie(remaining[0].id);
          }
        }
      }

      setProjectToDelete(null);
      await fetchProjects();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการลบโครงการ');
    } finally {
      setIsDeleting(false);
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

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 p-1">
              {projects.map((proj) => {
                const isCurrent = proj.id === activeProject?.id;
                return (
                  <div
                    key={proj.id}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between gap-2 transition group ${
                      isCurrent
                        ? 'bg-amber-500/10 text-white'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectProject(proj)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
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
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title={`แก้ไขข้อมูลโครงการ ${proj.code}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(proj);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title={projects.length <= 1 ? 'ไม่สามารถลบโครงการสุดท้ายได้' : `ลบโครงการ ${proj.code}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (projects.length <= 1) {
                            alert('ไม่สามารถลบโครงการสุดท้ายได้ ระบบต้องมีอย่างน้อย 1 โครงการ');
                            return;
                          }
                          setProjectToDelete(proj);
                          setShowDeleteModal(true);
                          setIsOpen(false);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action to edit current or create new project */}
            <div className="p-2 border-t border-slate-800 bg-slate-950 space-y-1.5">
              {activeProject && (
                <button
                  type="button"
                  onClick={() => handleOpenEdit(activeProject)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>แก้ไขข้อมูลโครงการ ({activeProject.code})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setNewCode(`PROJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(2, '0')}`);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer"
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

      {/* Delete Project Confirmation Modal */}
      {showDeleteModal && projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 text-slate-900">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-rose-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg text-white">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">ยืนยันการลบโครงการ</h3>
                  <span className="text-[10px] text-rose-200 font-semibold block">
                    DELETE PROJECT CONFIRMATION
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setProjectToDelete(null);
                }}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 leading-relaxed">
                  <p className="font-bold mb-1">คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้!</p>
                  <p>
                    ข้อมูลเสาเข็มทั้งหมด (
                    <strong className="font-bold text-rose-700">
                      {projectToDelete._count?.piles ?? 0} ต้น
                    </strong>
                    ), เกณฑ์การตอก, บันทึกการตอก และผลการตรวจสอบ QC ที่เกี่ยวข้องกับโครงการนี้จะถูกลบออกจากฐานข้อมูลอย่างถาวร
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  โครงการที่จะลบ
                </span>
                <div className="text-sm font-bold text-slate-800">
                  {projectToDelete.name}
                </div>
                <div className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                  รหัส: {projectToDelete.code}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProjectToDelete(null);
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'กำลังลบ...' : 'ยืนยันลบโครงการถาวร'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Information Modal */}
      {showEditModal && projectToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 text-slate-900">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-amber-500 p-1.5 rounded-lg text-slate-950">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black">แก้ไขข้อมูลโครงการ</h3>
                  <span className="text-[10px] text-amber-400 font-semibold block uppercase tracking-wider">
                    EDIT PROJECT INFORMATION
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setProjectToEdit(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProject} className="p-5 space-y-3.5">
              {editInlineError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editInlineError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโครงการ / อาคาร (Project Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  รหัสต้องไม่ซ้ำกับโครงการอื่นในระบบ
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สถานที่ก่อสร้าง (Location)
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="เช่น พระราม 9 ห้วยขวาง กรุงเทพฯ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เจ้าของโครงการ / ลูกค้า (Client / Owner)
                </label>
                <input
                  type="text"
                  value={editClient}
                  onChange={(e) => setEditClient(e.target.value)}
                  placeholder="เช่น บริษัท แกรนด์ พร็อพเพอร์ตี้ จำกัด"
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
                    value={editConsultant}
                    onChange={(e) => setEditConsultant(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ผู้รับเหมาตอก (Contractor)
                  </label>
                  <input
                    type="text"
                    value={editContractor}
                    onChange={(e) => setEditContractor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setProjectToEdit(null);
                  }}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>บันทึกการแก้ไข</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
