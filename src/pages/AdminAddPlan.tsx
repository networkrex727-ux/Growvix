import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Image as ImageIcon, IndianRupee, Calendar, Camera } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

const AdminAddPlan: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [plan, setPlan] = useState({
    name: '',
    price: '',
    dailyIncome: '',
    validityDays: '30',
    imageUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!plan.name || !plan.price || !plan.dailyIncome || !plan.validityDays) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      // Automatic photo if not provided
      const finalImageUrl = plan.imageUrl || `https://picsum.photos/seed/${plan.name.replace(/\s+/g, '')}/800/600`;
      
      await addDoc(collection(db, 'plans'), {
        name: plan.name,
        price: parseFloat(plan.price),
        dailyIncome: parseFloat(plan.dailyIncome),
        validityDays: parseInt(plan.validityDays),
        imageUrl: finalImageUrl,
        createdAt: serverTimestamp()
      });

      showToast('New plan added successfully!', 'success');
      navigate('/admin');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'plans');
      showToast('Failed to add plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-40 shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin')}
          className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-800 uppercase tracking-tight">Add New Plan</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Investment Management</p>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[35px] p-6 shadow-xl shadow-gray-100 border border-gray-50 space-y-8"
        >
          <div className="flex items-center gap-3 text-[#ff0000]">
            <Camera size={24} />
            <h3 className="font-black uppercase tracking-wider text-sm">Plan Details</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Plan Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                <Camera size={12} className="text-gray-400" /> Plan Name (e.g. DSLR D3500)
              </label>
              <input 
                type="text" 
                value={plan.name}
                onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                placeholder="Enter plan name"
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-2xl py-4 px-5 outline-none font-bold text-gray-700 transition-all"
                required
              />
            </div>

            {/* Price & Daily Income */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                  <IndianRupee size={12} className="text-gray-400" /> Price
                </label>
                <input 
                  type="number" 
                  value={plan.price}
                  onChange={(e) => setPlan({ ...plan, price: e.target.value })}
                  placeholder="500"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-2xl py-4 px-5 outline-none font-bold text-gray-700 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                  <IndianRupee size={12} className="text-gray-400" /> Daily Income
                </label>
                <input 
                  type="number" 
                  value={plan.dailyIncome}
                  onChange={(e) => setPlan({ ...plan, dailyIncome: e.target.value })}
                  placeholder="50"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-2xl py-4 px-5 outline-none font-bold text-gray-700 transition-all"
                  required
                />
              </div>
            </div>

            {/* Validity Days */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                <Calendar size={12} className="text-gray-400" /> Validity (Days)
              </label>
              <input 
                type="number" 
                value={plan.validityDays}
                onChange={(e) => setPlan({ ...plan, validityDays: e.target.value })}
                placeholder="30"
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-2xl py-4 px-5 outline-none font-bold text-gray-700 transition-all"
                required
              />
            </div>

            {/* Image URL (Optional) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                <ImageIcon size={12} className="text-gray-400" /> Image URL (Optional)
              </label>
              <input 
                type="text" 
                value={plan.imageUrl}
                onChange={(e) => setPlan({ ...plan, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-2xl py-4 px-5 outline-none font-bold text-gray-700 transition-all"
              />
              <p className="text-[9px] text-gray-400 font-medium italic">
                * If left empty, a high-quality photo will be added automatically based on the plan name.
              </p>
            </div>

            {/* Preview Card */}
            {(plan.name || plan.price) && (
              <div className="pt-4">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Live Preview</p>
                <div className="bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-gray-800">{plan.name || 'Plan Name'}</h4>
                      <p className="text-[10px] text-gray-400 font-bold">₹{plan.dailyIncome || '0'} / Day</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-[#ff0000]">₹{plan.price || '0'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff0000] text-white py-5 rounded-2xl font-black shadow-xl shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} /> Create Plan
                </>
              )}
            </button>
          </form>
        </motion.div>

        <div className="mt-8 bg-blue-50 p-6 rounded-[30px] border border-blue-100 space-y-3">
          <div className="flex items-center gap-3 text-blue-600">
            <ImageIcon size={20} />
            <h3 className="font-black uppercase tracking-wider text-xs">Automatic Photos</h3>
          </div>
          <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
            Our system uses AI-powered image generation to automatically add a relevant photo if you don't provide one. For example, if you name the plan "DSLR Camera", it will automatically show a professional camera image.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAddPlan;
