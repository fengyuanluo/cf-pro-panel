import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './utils/auth';

// 组件导入
import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

// 页面导入
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Domains from './pages/Domains';
import Redeem from './pages/Redeem';
import NotFound from './pages/NotFound';

// 管理员页面导入
import Users from './pages/admin/Users';
import AdminDomains from './pages/admin/AdminDomains';
import Cards from './pages/admin/Cards';

function App() {
  return (
    <Routes>
      {/* 登录页面 */}
      <Route
        path="/login"
        element={
          isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />

      {/* 受保护的路由 */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="" element={<Navigate to="/dashboard" replace />} />

                {/* 用户路由 */}
                <Route path="domains" element={<Domains />} />
                <Route path="redeem" element={<Redeem />} />

                {/* 管理员路由 */}
                <Route
                  path="admin/users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/domains"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminDomains />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/cards"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Cards />
                    </ProtectedRoute>
                  }
                />

                {/* 404页面 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
