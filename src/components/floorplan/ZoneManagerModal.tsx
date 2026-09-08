'use client';

import React, { useState } from 'react';
import { Layers, Plus, Trash2, Edit2, Check, X, Shield, Users } from 'lucide-react';
import { RestaurantZone } from '@/lib/db';

interface ZoneManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: RestaurantZone[];
  onCreateZone: (name: string, defaultWaiterId?: string, color?: string) => Promise<void> | void;
  onUpdateZone: (zoneId: string, updates: Partial<RestaurantZone>) => Promise<void> | void;
  onDeleteZone: (zoneId: string) => Promise<void> | void;
  waiters?: Array<{ id: string; name: string }>;
}

export const ZoneManagerModal: React.FC<ZoneManagerModalProps> = ({
  isOpen,
  onClose,
  zones,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
  waiters = [
    { id: 'w1', name: 'Priya Sharma' },
    { id: 'w2', name: 'Rahul Verma' },
    { id: 'w3', name: 'Amit Patel' },
    { id: 'w4', name: 'Sunita Roy' }
  ]
}) => {
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneWaiter, setNewZoneWaiter] = useState('');
  const [newZoneColor, setNewZoneColor] = useState('#10B981');
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editWaiter, setEditWaiter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    setIsProcessing(true);
    try {
      await onCreateZone(newZoneName.trim(), newZoneWaiter || undefined, newZoneColor);
      setNewZoneName('');
      setNewZoneWaiter('');
    } finally {
      setIsProcessing(false);
    }
  };

  const startEdit = (zone: RestaurantZone) => {
    setEditingZoneId(zone.id);
    setEditName(zone.name);
    setEditWaiter(zone.default_waiter_id || '');
  };

  const handleSaveEdit = async (zoneId: string) => {
    if (!editName.trim()) return;
    setIsProcessing(true);
    try {
      await onUpdateZone(zoneId, {
        name: editName.trim(),
        default_waiter_id: editWaiter || undefined
      });
      setEditingZoneId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (zoneId: string) => {
    if (zoneId === 'general') return; // Cannot delete General zone
    setIsProcessing(true);
    try {
      await onDeleteZone(zoneId);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl max-w-md w-full p-5 text-[#171717]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEDE8]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5F5F4] border border-[#E7E5E4] flex items-center justify-center text-[#171717]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#171717]">
                Manage Restaurant Zones
              </h3>
              <p className="text-[11px] text-[#737373]">Configure zones and default waiters</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#737373] hover:text-[#171717] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Zones List */}
        <div className="my-4 space-y-2 max-h-56 overflow-y-auto pr-1">
          {zones.map((zone) => {
            const isEditing = editingZoneId === zone.id;
            const assignedWaiterName = waiters.find((w) => w.id === zone.default_waiter_id)?.name;
            const isGeneral = zone.id === 'general';

            if (isEditing) {
              return (
                <div
                  key={zone.id}
                  className="p-2.5 border border-[#171717] rounded-xl bg-stone-50/50 space-y-2"
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-[#E7E5E4] rounded-md bg-white font-semibold"
                    disabled={isGeneral}
                  />
                  <div className="flex items-center space-x-2">
                    <select
                      value={editWaiter}
                      onChange={(e) => setEditWaiter(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-[#E7E5E4] rounded-md bg-white"
                    >
                      <option value="">No Default Server</option>
                      {waiters.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(zone.id)}
                      disabled={isProcessing}
                      className="p-1.5 bg-[#171717] text-white rounded-md hover:bg-[#262626]"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingZoneId(null)}
                      className="p-1.5 border border-[#E7E5E4] rounded-md hover:bg-stone-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={zone.id}
                className="p-2.5 border border-[#E7E5E4] rounded-xl bg-white hover:border-stone-300 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: zone.color || '#10B981' }}
                  />
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-[#171717]">{zone.name}</span>
                      {isGeneral && (
                        <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-semibold">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#737373]">
                      Server: {assignedWaiterName || 'General Waiter Pool'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => startEdit(zone)}
                    className="p-1 text-[#737373] hover:text-[#171717] rounded hover:bg-stone-100"
                    title="Edit Zone"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!isGeneral && (
                    <button
                      type="button"
                      onClick={() => handleDelete(zone.id)}
                      disabled={isProcessing}
                      className="p-1 text-[#737373] hover:text-red-600 rounded hover:bg-red-50"
                      title="Delete Zone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Zone Form */}
        <form onSubmit={handleCreate} className="pt-3 border-t border-[#EFEDE8] space-y-2.5">
          <span className="text-xs font-bold text-[#171717] block">Add New Zone</span>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Zone name (e.g. Rooftop, Patio)"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-[#E7E5E4] rounded-lg text-xs font-medium focus:outline-none focus:border-[#171717]"
            />
            <select
              value={newZoneWaiter}
              onChange={(e) => setNewZoneWaiter(e.target.value)}
              className="w-36 px-2 py-1.5 border border-[#E7E5E4] rounded-lg text-xs bg-white focus:outline-none focus:border-[#171717]"
            >
              <option value="">Default Server</option>
              {waiters.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing || !newZoneName.trim()}
              className="py-1.5 px-3 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Zone</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
