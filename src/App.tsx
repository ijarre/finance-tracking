import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import StatementListPage from "./pages/StatementListPage";
import TransactionListPage from "./pages/TransactionListPage";
import StatementDetailPage from "./pages/StatementDetailPage";
import PromptTesterPage from "./pages/PromptTesterPage";
import DuplicateTransactionsPage from "./pages/DuplicateTransactionsPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/statements" element={<StatementListPage />} />
            <Route path="/statement/:id" element={<StatementDetailPage />} />
            <Route path="/transactions" element={<TransactionListPage />} />
            <Route path="/duplicates" element={<DuplicateTransactionsPage />} />
            <Route path="/prompt-tester" element={<PromptTesterPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
