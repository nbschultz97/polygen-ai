import React, { useState, useEffect } from 'react';
import { X, Printer, Ruler, Settings, Search, Zap } from 'lucide-react';
import {
  UserPreferences,
  loadPreferences,
  savePreferences
} from '../services/preferencesService';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrefs(loadPreferences());
    }
  }, [isOpen]);

  const handleSave = () => {
    savePreferences(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updatePrinter = (key: keyof UserPreferences['printer'], value: number) => {
    setPrefs(prev => ({
      ...prev,
      printer: { ...prev.printer, [key]: value }
    }));
  };

  const updateTolerance = (key: keyof UserPreferences['tolerances'], value: number) => {
    setPrefs(prev => ({
      ...prev,
      tolerances: { ...prev.tolerances, [key]: value }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0c0c0f] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-semibold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Printer Settings */}
          <section>
            <div className="flex items-center gap-2 text-sm font-medium text-white mb-3">
              <Printer className="w-4 h-4 text-violet-400" />
              Printer Settings
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nozzle (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={prefs.printer.nozzle_diameter}
                  onChange={(e) => updatePrinter('nozzle_diameter', parseFloat(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Layer Height (mm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={prefs.printer.layer_height}
                  onChange={(e) => updatePrinter('layer_height', parseFloat(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Wall (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={prefs.printer.min_wall_thickness}
                  onChange={(e) => updatePrinter('min_wall_thickness', parseFloat(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Material</label>
                <select
                  value={prefs.defaultMaterial}
                  onChange={(e) => setPrefs(prev => ({ ...prev, defaultMaterial: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  <option value="PLA">PLA</option>
                  <option value="PETG">PETG</option>
                  <option value="ABS">ABS</option>
                  <option value="TPU">TPU (Flexible)</option>
                  <option value="ASA">ASA</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Build Volume (mm)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="X"
                  value={prefs.printer.bed_size_x}
                  onChange={(e) => updatePrinter('bed_size_x', parseInt(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
                <input
                  type="number"
                  placeholder="Y"
                  value={prefs.printer.bed_size_y}
                  onChange={(e) => updatePrinter('bed_size_y', parseInt(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
                <input
                  type="number"
                  placeholder="Z"
                  value={prefs.printer.bed_size_z}
                  onChange={(e) => updatePrinter('bed_size_z', parseInt(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
          </section>

          {/* Tolerances */}
          <section>
            <div className="flex items-center gap-2 text-sm font-medium text-white mb-3">
              <Ruler className="w-4 h-4 text-violet-400" />
              Default Tolerances
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Loose Fit (mm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={prefs.tolerances.fit_loose}
                  onChange={(e) => updateTolerance('fit_loose', parseFloat(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Normal Fit (mm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={prefs.tolerances.fit_normal}
                  onChange={(e) => updateTolerance('fit_normal', parseFloat(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tight Fit (mm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={prefs.tolerances.fit_tight}
                  onChange={(e) => updateTolerance('fit_tight', parseFloat(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
          </section>

          {/* AI Features */}
          <section>
            <div className="flex items-center gap-2 text-sm font-medium text-white mb-3">
              <Zap className="w-4 h-4 text-violet-400" />
              AI Features
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-white">Web Search</span>
                    <p className="text-[10px] text-gray-500">Look up reference dimensions online</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.enableWebSearch}
                  onChange={(e) => setPrefs(prev => ({ ...prev, enableWebSearch: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-600 text-violet-600 focus:ring-violet-500"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-white">Auto 3D Render</span>
                    <p className="text-[10px] text-gray-500">Automatically render preview after generation</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.autoRender3D}
                  onChange={(e) => setPrefs(prev => ({ ...prev, autoRender3D: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-600 text-violet-600 focus:ring-violet-500"
                />
              </label>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
