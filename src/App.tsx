import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ReportsPage } from './pages/ReportsPage';
import { InwardPage } from './pages/InwardPage';
import { OutwardPage } from './pages/OutwardPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ReportsPage />} />
          <Route path="inward" element={<InwardPage />} />
          <Route path="outward" element={<OutwardPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
