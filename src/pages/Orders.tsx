import { Navigate } from 'react-router-dom';

export default function Orders() {
  // Redirect to the new supply requests page
  return <Navigate to="/supply-requests" replace />;
}