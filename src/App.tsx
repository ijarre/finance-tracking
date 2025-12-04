import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import StatementListPage from "./pages/StatementListPage";
import TransactionListPage from "./pages/TransactionListPage";
import StatementDetailPage from "./pages/StatementDetailPage";
import PromptTesterPage from "./pages/PromptTesterPage";
import DuplicateTransactionsPage from "./pages/DuplicateTransactionsPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/statements" element={<StatementListPage />} />
        <Route path="/statement/:id" element={<StatementDetailPage />} />
        <Route path="/transactions" element={<TransactionListPage />} />
        <Route path="/duplicates" element={<DuplicateTransactionsPage />} />
        <Route path="/prompt-tester" element={<PromptTesterPage />} />
      </Routes>
    </Router>
  );
}

export default App;
