import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CaptivePortal from './pages/CaptivePortal';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './layouts/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<CaptivePortal />} />
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
