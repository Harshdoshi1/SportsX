import { useEffect } from "react";
import { Dashboard } from "./Dashboard";
import { useAdmin } from "../../../contexts/AdminContext";
import { useNavigate } from "react-router";

export function AdminDashboard() {
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  return (
    <div className="relative">
      {/* Render existing Dashboard */}
      <Dashboard adminMode />
    </div>
  );
}
