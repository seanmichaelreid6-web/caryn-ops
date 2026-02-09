import { Dashboard } from '@/components/dashboard/Dashboard';
import { Toaster } from 'sonner';
import './App.css';

function App() {
  return (
    <>
      <Dashboard />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;
