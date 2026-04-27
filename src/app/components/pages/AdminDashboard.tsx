import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Clock, Radio } from "lucide-react";
import { Dashboard } from "./Dashboard";
import { useAdmin } from "../../../contexts/AdminContext";
import { useNavigate } from "react-router";
import { AddUpcomingMatchModal } from "../modals/AddUpcomingMatchModal";
import { AddLiveMatchModal } from "../modals/AddLiveMatchModal";

export function AdminDashboard() {
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [showAddUpcomingModal, setShowAddUpcomingModal] = useState(false);
  const [showAddLiveModal, setShowAddLiveModal] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  const handleUpcomingSuccess = (match: any) => {
    console.log("Upcoming match added:", match);
    // TODO: Refresh dashboard data
  };

  const handleLiveSuccess = (match: any) => {
    console.log("Live match added:", match);
    // TODO: Refresh dashboard data
  };

  return (
    <div className="relative">
      {/* Render existing Dashboard */}
      <Dashboard adminMode />

      {/* Floating FAB Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {/* Add Live Match FAB */}
        <motion.button
          whileHover={{ scale: 1.05, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddLiveModal(true)}
          className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #FF4D8D, #7C4DFF)",
            boxShadow: "0 0 40px rgba(255,77,141,0.5), 0 8px 32px rgba(124,77,255,0.4)",
          }}
          title="Add Live Match"
        >
          <Radio size={24} className="text-white" />
        </motion.button>

        {/* Add Upcoming Match FAB */}
        <motion.button
          whileHover={{ scale: 1.05, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddUpcomingModal(true)}
          className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #3BD4E7, #00E676)",
            boxShadow: "0 0 40px rgba(59,212,231,0.5), 0 8px 32px rgba(0,230,118,0.4)",
          }}
          title="Add Upcoming Match"
        >
          <Clock size={24} className="text-white" />
        </motion.button>
      </div>

      {/* Modals */}
      <AddUpcomingMatchModal
        isOpen={showAddUpcomingModal}
        onClose={() => setShowAddUpcomingModal(false)}
        onSuccess={handleUpcomingSuccess}
        defaultCategory="Cricket > IPL"
        defaultSectionLabel="IPL 2026"
      />

      <AddLiveMatchModal
        isOpen={showAddLiveModal}
        onClose={() => setShowAddLiveModal(false)}
        onSuccess={handleLiveSuccess}
        defaultCategory="Cricket > IPL"
        defaultSectionLabel="IPL 2026"
      />
    </div>
  );
}
