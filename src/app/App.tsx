import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AdminProvider } from "../contexts/AdminContext";
import { MatchProvider } from "../contexts/MatchContext";

export default function App() {
  return (
    <AdminProvider>
      <MatchProvider>  
        <RouterProvider router={router} />
      </MatchProvider>
    </AdminProvider>
  );
}
