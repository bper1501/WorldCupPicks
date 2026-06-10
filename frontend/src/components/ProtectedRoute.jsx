import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const userId = localStorage.getItem("worldCupUserId");

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;