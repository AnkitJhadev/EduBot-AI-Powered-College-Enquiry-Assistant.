import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const admin = localStorage.getItem('admin');

  if (!token || !admin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
