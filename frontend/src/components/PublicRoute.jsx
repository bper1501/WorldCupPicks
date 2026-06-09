import { Navigate } from "react-router-dom";

function PublicRoute({ children }) {
  const userId = localStorage.getItem("worldCupUserId");

  if (userId) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default PublicRoute;