import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { LoginPage, RegisterPage } from './pages/Auth';
import Dashboard  from './pages/Dashboard';
import Workspace  from './pages/Workspace';
import History    from './pages/History';
import Layout     from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage/>}/>
        <Route path="/register" element={<RegisterPage/>}/>
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/"                      element={<Dashboard/>}/>
                <Route path="/workspace/:sessionId"  element={<Workspace/>}/>
                <Route path="/history"               element={<History/>}/>
                <Route path="*"                      element={<Navigate to="/"/>}/>
              </Routes>
            </Layout>
          </ProtectedRoute>
        }/>
      </Routes>
    </BrowserRouter>
  );
}
